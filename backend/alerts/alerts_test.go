package alerts

import (
	"encoding/json"
	"io"
	"net/http"
	"net/http/httptest"
	"strings"
	"sync/atomic"
	"testing"
	"time"

	"heimdall-backend/logger"
	"heimdall-backend/models"
)

type captured struct {
	body   string
	header http.Header
}

func captureServer(t *testing.T, got chan<- captured) *httptest.Server {
	t.Helper()
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		b, _ := io.ReadAll(r.Body) //nolint:errcheck // test server
		got <- captured{body: string(b), header: r.Header.Clone()}
		w.WriteHeader(http.StatusNoContent)
	}))
	t.Cleanup(srv.Close)
	return srv
}

func vercelFail() *models.DashboardEvent {
	return &models.DashboardEvent{
		EventType: "vercel.deploy",
		IsPrivate: true,
		Metadata: map[string]interface{}{
			"project":        "web",
			"status":         "FAILED",
			"environment":    "production",
			"full_name":      "me/web",
			"branch":         "main",
			"commit_sha":     "0123456789abcdef",
			"deployment_url": "https://web-abc.vercel.app",
		},
	}
}

func TestFormats(t *testing.T) {
	log := logger.New(false)
	tests := []struct {
		name   string
		format string
		check  func(t *testing.T, c captured)
	}{
		{"discord", FormatDiscord, func(t *testing.T, c captured) {
			var m map[string]any
			if err := json.Unmarshal([]byte(c.body), &m); err != nil || !strings.Contains(m["content"].(string), "Vercel deploy failed: web") {
				t.Fatalf("bad discord body %q", c.body)
			}
		}},
		{"slack", FormatSlack, func(t *testing.T, c captured) {
			var m map[string]string
			if err := json.Unmarshal([]byte(c.body), &m); err != nil || !strings.Contains(m["text"], "@0123456") {
				t.Fatalf("bad slack body %q", c.body)
			}
		}},
		{"ntfy", FormatNtfy, func(t *testing.T, c captured) {
			if !strings.HasPrefix(c.header.Get("Content-Type"), "text/plain") || c.header.Get("Title") == "" {
				t.Fatalf("bad ntfy headers %v", c.header)
			}
			if !strings.Contains(c.body, "https://web-abc.vercel.app") {
				t.Fatalf("bad ntfy body %q", c.body)
			}
		}},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := make(chan captured, 1)
			srv := captureServer(t, got)
			n := New(srv.URL, tt.format, log)
			n.Notify(vercelFail())
			n.Wait()
			select {
			case c := <-got:
				tt.check(t, c)
			default:
				t.Fatal("no request received")
			}
		})
	}
}

func TestDetectFormat(t *testing.T) {
	cases := map[string]string{
		"https://discord.com/api/webhooks/1/x":    FormatDiscord,
		"https://discordapp.com/api/webhooks/1/x": FormatDiscord,
		"https://hooks.slack.com/services/a/b/c":  FormatSlack,
		"https://ntfy.sh/my-topic":                FormatNtfy,
		"https://ntfy.example.com/alerts":         FormatNtfy,
		"https://example.com/hook":                FormatDiscord,
		"::bad":                                   FormatDiscord,
	}
	for u, want := range cases {
		if got := detectFormat(u); got != want {
			t.Errorf("detectFormat(%q) = %s, want %s", u, got, want)
		}
	}
	if New("https://example.com/x", "SLACK", logger.New(false)).format != FormatSlack {
		t.Error("format override ignored")
	}
}

func TestNoOpWhenUnset(t *testing.T) {
	t.Setenv("ALERT_WEBHOOK_URL", "")
	n := FromEnv(logger.New(false))
	if n != nil {
		t.Fatal("expected nil notifier")
	}
	n.Notify(vercelFail()) // must not panic
	n.Wait()
}

func TestOnlyFailuresSend(t *testing.T) {
	var hits atomic.Int32
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		hits.Add(1)
		w.WriteHeader(http.StatusOK)
	}))
	defer srv.Close()
	n := New(srv.URL, "", logger.New(false))

	ev := func(typ, status string) *models.DashboardEvent {
		return &models.DashboardEvent{EventType: typ, Metadata: map[string]interface{}{"status": status}}
	}
	for _, e := range []*models.DashboardEvent{
		ev("vercel.deploy", "SUCCESS"), ev("vercel.deploy", "CANCELED"), ev("vercel.deploy", "BUILDING"),
		ev("railway.deploy", "SUCCESS"), ev("railway.deploy", "CANCELED"),
		ev("github.push", "FAILED"), ev("github.issue", ""),
	} {
		n.Notify(e)
	}
	n.Wait()
	if hits.Load() != 0 {
		t.Fatalf("non-failures sent %d alerts", hits.Load())
	}

	for _, e := range []*models.DashboardEvent{
		ev("vercel.deploy", "FAILED"), ev("railway.deploy", "FAILED"), ev("railway.deploy", "CRASHED"),
		ev("error.ci", "FAILURE"),
	} {
		n.Notify(e)
	}
	n.Wait()
	if hits.Load() != 4 {
		t.Fatalf("expected 4 alerts, got %d", hits.Load())
	}
}

func TestTimeout(t *testing.T) {
	release := make(chan struct{})
	srv := httptest.NewServer(http.HandlerFunc(func(_ http.ResponseWriter, r *http.Request) {
		select {
		case <-release:
		case <-r.Context().Done():
		}
	}))
	defer srv.Close()
	defer close(release)

	n := New(srv.URL, "", logger.New(false))
	n.timeout = 50 * time.Millisecond
	start := time.Now()
	n.Notify(vercelFail())
	if time.Since(start) > 20*time.Millisecond {
		t.Fatal("Notify blocked")
	}
	n.Wait()
	if time.Since(start) > 2*time.Second {
		t.Fatal("send did not time out")
	}
}

func TestDropsWhenFull(t *testing.T) {
	release := make(chan struct{})
	var hits atomic.Int32
	srv := httptest.NewServer(http.HandlerFunc(func(_ http.ResponseWriter, _ *http.Request) {
		hits.Add(1)
		<-release
	}))
	defer srv.Close()

	n := New(srv.URL, "", logger.New(false))
	n.sem = make(chan struct{}, 2)
	for i := 0; i < 5; i++ {
		n.Notify(vercelFail())
	}
	deadline := time.Now().Add(2 * time.Second)
	for hits.Load() < 2 && time.Now().Before(deadline) {
		time.Sleep(5 * time.Millisecond)
	}
	close(release)
	n.Wait()
	if hits.Load() != 2 {
		t.Fatalf("expected 2 sends and 3 drops, got %d sends", hits.Load())
	}
}

func TestMessageTruncatedAndCI(t *testing.T) {
	e := &models.DashboardEvent{EventType: "error.ci", Metadata: map[string]interface{}{
		"workflow": strings.Repeat("w", 3000), "full_name": "me/app", "conclusion": "timed_out",
	}}
	msg := Message(e)
	if len([]rune(msg)) > maxMessageLen {
		t.Fatalf("message too long: %d", len([]rune(msg)))
	}
	e.Metadata["workflow"] = "CI"
	e.Metadata["branch"] = "main"
	e.Metadata["commit_sha"] = "abcdef123456"
	e.Metadata["run_url"] = "https://github.com/me/app/actions/runs/1"
	msg = Message(e)
	want := "GitHub CI timed_out: CI on me/app\nmain @abcdef1 https://github.com/me/app/actions/runs/1"
	if msg != want {
		t.Fatalf("got %q want %q", msg, want)
	}
}

func TestMentionsAreNeutralized(t *testing.T) {
	log := logger.New(false)
	msg := "CI failed on me/repo@<!channel> @everyone"

	data, _, err := New("https://discord.com/api/webhooks/1/x", "", log).body(msg)
	if err != nil {
		t.Fatal(err)
	}
	var d struct {
		AllowedMentions struct {
			Parse []string `json:"parse"`
		} `json:"allowed_mentions"`
	}
	if err = json.Unmarshal(data, &d); err != nil || d.AllowedMentions.Parse == nil || len(d.AllowedMentions.Parse) != 0 {
		t.Fatalf("discord body must disable mentions: %s", data)
	}

	data, _, err = New("https://hooks.slack.com/services/a/b/c", "", log).body(msg)
	if err != nil {
		t.Fatal(err)
	}
	var sl map[string]string
	if err = json.Unmarshal(data, &sl); err != nil {
		t.Fatal(err)
	}
	if strings.Contains(sl["text"], "<!channel>") || !strings.Contains(sl["text"], "&lt;!channel&gt;") {
		t.Fatalf("slack body must escape control sequences: %s", sl["text"])
	}
}
