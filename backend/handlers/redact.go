package handlers

import (
	"fmt"
	"regexp"
	"strings"

	"heimdall-backend/models"
)

// publicMetadataKeys are the only metadata keys kept for private events.
var publicMetadataKeys = []string{"status", "action", "commit_count", "merged"}

// redactEvent returns a copy of a private event with its details removed.
// Public events are returned unchanged. The input is never modified.
func redactEvent(e *models.DashboardEvent) models.DashboardEvent {
	if !e.IsPrivate {
		return *e
	}

	kept := make(map[string]interface{}, len(publicMetadataKeys))
	for _, k := range publicMetadataKeys {
		if v, ok := e.Metadata[k]; ok {
			kept[k] = v
		}
	}

	if env := publicEnvironment(e.Metadata); env != "" {
		kept["environment"] = env
	}

	return models.DashboardEvent{
		ID:        e.ID,
		EventType: e.EventType,
		Title:     redactedTitle(e.EventType, e.Metadata),
		CreatedAt: e.CreatedAt,
		IsPrivate: true,
		Metadata:  kept,
	}
}

// publicEnvironment reduces an environment name to "production" or "preview".
// Anything else (custom environment names, branch-like values) is dropped.
// prEnvPattern matches per-PR environment names like "pr-123" or "pr_45".
var prEnvPattern = regexp.MustCompile(`^pr[-_]?\d+$`)

func publicEnvironment(m map[string]interface{}) string {
	env := strings.ToLower(metaString(m, "environment"))
	switch {
	case env == "production", env == "prod":
		return "production"
	case strings.Contains(env, "preview"), prEnvPattern.MatchString(env):
		return "preview"
	}
	return ""
}

func redactEvents(events []models.DashboardEvent) []models.DashboardEvent {
	out := make([]models.DashboardEvent, len(events))
	for i := range events {
		out[i] = redactEvent(&events[i])
	}
	return out
}

func metaString(m map[string]interface{}, key string) string {
	s, _ := m[key].(string) //nolint:errcheck // zero value is the intended fallback
	return strings.TrimSpace(s)
}

func metaInt(m map[string]interface{}, key string) (int, bool) {
	switch v := m[key].(type) {
	case int:
		return v, true
	case int64:
		return int(v), true
	case float64:
		return int(v), true
	}
	return 0, false
}

func joinWords(parts ...string) string {
	var kept []string
	for _, p := range parts {
		if p != "" {
			kept = append(kept, p)
		}
	}
	return strings.Join(kept, " ")
}

func redactedTitle(eventType string, meta map[string]interface{}) string {
	action := metaString(meta, "action")
	status := strings.ToUpper(metaString(meta, "status"))

	switch eventType {
	case "github.push":
		if n, ok := metaInt(meta, "commit_count"); ok {
			word := "commits"
			if n == 1 {
				word = "commit"
			}
			return fmt.Sprintf("Private repository: %d %s pushed", n, word)
		}
		return "Private repository: commits pushed"
	case "github.pr":
		return joinWords("Private repository: pull request", action)
	case "github.issue":
		return joinWords("Private repository: issue", action)
	case "github.release":
		return joinWords("Private repository: release", action)
	case "vercel.deploy", "railway.deploy":
		return joinWords("Private project: deployment", status)
	}
	return "Private event"
}
