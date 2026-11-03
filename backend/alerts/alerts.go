// Package alerts sends a short message to a webhook when a stored event is a failure.
package alerts

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"net/url"
	"os"
	"strings"
	"sync"
	"time"

	"heimdall-backend/logger"
	"heimdall-backend/models"
)

const (
	// Message formats.
	FormatDiscord = "discord"
	FormatSlack   = "slack"
	FormatNtfy    = "ntfy"

	sendTimeout   = 5 * time.Second
	maxConcurrent = 8
	maxMessageLen = 1800
)

// Notifier posts failure alerts. A nil Notifier, or one without a URL, does nothing.
type Notifier struct {
	url     string
	format  string
	client  *http.Client
	timeout time.Duration
	sem     chan struct{}
	wg      sync.WaitGroup
	log     *logger.Logger
}

// FromEnv builds a Notifier from ALERT_WEBHOOK_URL and ALERT_WEBHOOK_FORMAT.
// It returns nil when ALERT_WEBHOOK_URL is unset.
func FromEnv(log *logger.Logger) *Notifier {
	raw := strings.TrimSpace(os.Getenv("ALERT_WEBHOOK_URL"))
	if raw == "" {
		return nil
	}
	return New(raw, os.Getenv("ALERT_WEBHOOK_FORMAT"), log)
}

// New creates a Notifier. An empty format means detect it from the URL host.
func New(webhookURL, format string, log *logger.Logger) *Notifier {
	format = strings.ToLower(strings.TrimSpace(format))
	switch format {
	case FormatDiscord, FormatSlack, FormatNtfy:
	default:
		format = detectFormat(webhookURL)
	}
	return &Notifier{
		url:     webhookURL,
		format:  format,
		client:  &http.Client{},
		timeout: sendTimeout,
		sem:     make(chan struct{}, maxConcurrent),
		log:     log,
	}
}

// detectFormat picks a format from the URL host. Unknown hosts get the Discord shape.
func detectFormat(raw string) string {
	u, err := url.Parse(raw)
	if err != nil {
		return FormatDiscord
	}
	host := strings.ToLower(u.Hostname())
	switch {
	case host == "discord.com", host == "discordapp.com",
		strings.HasSuffix(host, ".discord.com"), strings.HasSuffix(host, ".discordapp.com"):
		return FormatDiscord
	case host == "hooks.slack.com":
		return FormatSlack
	case host == "ntfy.sh", strings.Contains(host, "ntfy"):
		return FormatNtfy
	}
	return FormatDiscord
}

// IsFailure reports whether the event should trigger an alert.
func IsFailure(e *models.DashboardEvent) bool {
	switch e.EventType {
	case "error.ci":
		return true
	case "vercel.deploy":
		return statusIn(e, "FAILED", "ERROR")
	case "railway.deploy":
		return statusIn(e, "FAILED", "CRASHED")
	}
	return false
}

func statusIn(e *models.DashboardEvent, want ...string) bool {
	s := strings.ToUpper(meta(e, "status"))
	for _, w := range want {
		if s == w {
			return true
		}
	}
	return false
}

func meta(e *models.DashboardEvent, key string) string {
	s, _ := e.Metadata[key].(string) //nolint:errcheck // zero value is the intended fallback
	return strings.TrimSpace(s)
}

// Notify sends an alert for a newly inserted failure event. It returns at once;
// the send runs in a goroutine with its own context. Duplicates must not be passed in.
func (n *Notifier) Notify(e *models.DashboardEvent) {
	if n == nil || n.url == "" || e == nil || !IsFailure(e) {
		return
	}
	select {
	case n.sem <- struct{}{}:
	default:
		n.log.Warn().Str("event_type", e.EventType).Msg("alert dropped: too many sends in flight")
		return
	}
	msg := Message(e)
	eventType := e.EventType
	n.wg.Add(1)
	go func() {
		defer n.wg.Done()
		defer func() { <-n.sem }()
		n.send(eventType, msg)
	}()
}

// Wait blocks until in-flight sends finish. Used by tests and shutdown.
func (n *Notifier) Wait() {
	if n != nil {
		n.wg.Wait()
	}
}

func (n *Notifier) send(eventType, msg string) {
	ctx, cancel := context.WithTimeout(context.Background(), n.timeout)
	defer cancel()

	body, contentType, err := n.body(msg)
	if err != nil {
		n.log.Error().Err(err).Msg("alert not sent: could not build body")
		return
	}
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, n.url, bytes.NewReader(body))
	if err != nil {
		n.log.Error().Msg("alert not sent: invalid ALERT_WEBHOOK_URL")
		return
	}
	req.Header.Set("Content-Type", contentType)
	if n.format == FormatNtfy {
		req.Header.Set("Title", headerSafe(ntfyTitle(msg)))
		req.Header.Set("Tags", "rotating_light")
	}

	resp, err := n.client.Do(req)
	if err != nil {
		// url.Error embeds the URL, which is a secret. Log only the cause.
		var uerr *url.Error
		if errors.As(err, &uerr) {
			err = uerr.Err
		}
		n.log.Warn().Err(err).Str("event_type", eventType).Str("format", n.format).Msg("alert send failed")
		return
	}
	defer resp.Body.Close() //nolint:errcheck // response body of a fire-and-forget call

	if resp.StatusCode >= 300 {
		n.log.Warn().Int("status", resp.StatusCode).Str("event_type", eventType).Str("format", n.format).Msg("alert endpoint rejected message")
		return
	}
	n.log.Info().Int("status", resp.StatusCode).Str("event_type", eventType).Str("format", n.format).Msg("alert sent")
}

func (n *Notifier) body(msg string) (data []byte, contentType string, err error) {
	switch n.format {
	case FormatNtfy:
		return []byte(msg), "text/plain; charset=utf-8", nil
	case FormatSlack:
		data, err = json.Marshal(map[string]string{"text": slackEscape(msg)})
		return data, "application/json", err
	default:
		// allowed_mentions stops branch names such as "@everyone" from pinging.
		data, err = json.Marshal(map[string]any{
			"content":          msg,
			"allowed_mentions": map[string][]string{"parse": {}},
		})
		return data, "application/json", err
	}
}

func ntfyTitle(msg string) string {
	first, _, _ := strings.Cut(msg, "\n")
	return first
}

// headerSafe strips characters that are not allowed in an HTTP header value.
func headerSafe(s string) string {
	return strings.Map(func(r rune) rune {
		if r < 0x20 || r > 0x7e {
			return -1
		}
		return r
	}, s)
}

// Message builds the alert text from the unredacted event.
func Message(e *models.DashboardEvent) string {
	var head, project, link string
	switch e.EventType {
	case "error.ci":
		head = fmt.Sprintf("GitHub CI %s", strings.ToLower(firstNonEmpty(meta(e, "conclusion"), "failed")))
		project = firstNonEmpty(meta(e, "full_name"), meta(e, "repo"))
		if wf := meta(e, "workflow"); wf != "" {
			project = strings.TrimSpace(wf + " on " + project)
		}
		link = meta(e, "run_url")
	case "vercel.deploy":
		head = "Vercel deploy " + strings.ToLower(meta(e, "status"))
		project = firstNonEmpty(meta(e, "project"), meta(e, "full_name"))
		link = firstNonEmpty(meta(e, "deployment_url"), meta(e, "url"))
	case "railway.deploy":
		head = "Railway deploy " + strings.ToLower(meta(e, "status"))
		project = firstNonEmpty(meta(e, "project_name"), meta(e, "service_name"))
		link = meta(e, "deployment_url")
	default:
		head = e.EventType + " failed"
		project = e.Title
	}

	line1 := head
	if project != "" {
		line1 += ": " + project
	}

	var parts []string
	if repo := firstNonEmpty(meta(e, "full_name"), meta(e, "repo")); repo != "" && e.EventType == "vercel.deploy" {
		parts = append(parts, repo)
	}
	if b := meta(e, "branch"); b != "" {
		parts = append(parts, b)
	}
	if sha := meta(e, "commit_sha"); sha != "" {
		if len(sha) > 7 {
			sha = sha[:7]
		}
		parts = append(parts, "@"+sha)
	}
	if env := meta(e, "environment"); env != "" {
		parts = append(parts, "("+env+")")
	}
	if link != "" {
		parts = append(parts, link)
	}

	msg := line1
	if len(parts) > 0 {
		msg += "\n" + strings.Join(parts, " ")
	}
	return truncate(msg, maxMessageLen)
}

func firstNonEmpty(vals ...string) string {
	for _, v := range vals {
		if v != "" {
			return v
		}
	}
	return ""
}

func truncate(s string, n int) string {
	r := []rune(s)
	if len(r) <= n {
		return s
	}
	return string(r[:n-1]) + "…"
}

// slackEscape escapes the characters Slack treats as control sequences, so a
// branch name like "<!channel>" is shown as text instead of notifying anyone.
func slackEscape(s string) string {
	return strings.NewReplacer("&", "&amp;", "<", "&lt;", ">", "&gt;").Replace(s)
}
