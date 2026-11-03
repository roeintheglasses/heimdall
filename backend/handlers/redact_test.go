package handlers

import (
	"testing"
	"time"

	"heimdall-backend/models"
)

func privateEvent(eventType string, meta map[string]interface{}) models.DashboardEvent {
	return models.DashboardEvent{
		ID:        "abc",
		EventType: eventType,
		Title:     "SECRET TITLE acme/secret-repo",
		CreatedAt: time.Date(2026, 1, 2, 3, 4, 5, 0, time.UTC),
		IsPrivate: true,
		Metadata:  meta,
	}
}

func TestRedactEvent_Titles(t *testing.T) {
	tests := []struct {
		name string
		typ  string
		meta map[string]interface{}
		want string
	}{
		{"push many", "github.push", map[string]interface{}{"commit_count": float64(3)}, "Private repository: 3 commits pushed"},
		{"push one", "github.push", map[string]interface{}{"commit_count": 1}, "Private repository: 1 commit pushed"},
		{"push no count", "github.push", nil, "Private repository: commits pushed"},
		{"pr", "github.pr", map[string]interface{}{"action": "opened"}, "Private repository: pull request opened"},
		{"pr no action", "github.pr", nil, "Private repository: pull request"},
		{"issue", "github.issue", map[string]interface{}{"action": "closed"}, "Private repository: issue closed"},
		{"release", "github.release", map[string]interface{}{"action": "published"}, "Private repository: release published"},
		{"ci", "error.ci", map[string]interface{}{"conclusion": "timed_out"}, "Private repository: CI timed_out"},
		{"ci no conclusion", "error.ci", nil, "Private repository: CI"},
		{"vercel", "vercel.deploy", map[string]interface{}{"status": "success"}, "Private project: deployment SUCCESS"},
		{"railway no status", "railway.deploy", nil, "Private project: deployment"},
		{"other", "monitoring.alert", nil, "Private event"},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			in := privateEvent(tt.typ, tt.meta)
			got := redactEvent(&in)
			if got.Title != tt.want {
				t.Errorf("title = %q, want %q", got.Title, tt.want)
			}
			if !got.IsPrivate || got.ID != "abc" || got.EventType != tt.typ || got.CreatedAt.IsZero() {
				t.Errorf("identity fields lost: %+v", got)
			}
		})
	}
}

func TestRedactEvent_StripsMetadata(t *testing.T) {
	meta := map[string]interface{}{
		"repo": "acme/secret", "message": "fix secret", "url": "https://github.com/acme/secret",
		"author": "bob", "branch": "main",
		"status": "success", "action": "opened", "commit_count": 2, "environment": "production", "merged": true,
	}
	in := privateEvent("github.pr", meta)

	got := redactEvent(&in)

	for _, k := range []string{"repo", "message", "url", "author", "branch"} {
		if _, ok := got.Metadata[k]; ok {
			t.Errorf("metadata key %q leaked", k)
		}
	}
	if got.Metadata["environment"] != "production" {
		t.Errorf("environment = %v, want production", got.Metadata["environment"])
	}
	if len(got.Metadata) != 5 {
		t.Errorf("expected 5 kept keys, got %v", got.Metadata)
	}
	if len(in.Metadata) != len(meta) || in.Title != "SECRET TITLE acme/secret-repo" {
		t.Error("input event was mutated")
	}
}

func TestRedactEvent_PublicUnchanged(t *testing.T) {
	in := privateEvent("github.push", map[string]interface{}{"repo": "open/source"})
	in.IsPrivate = false

	got := redactEvent(&in)

	if got.Title != in.Title || got.Metadata["repo"] != "open/source" {
		t.Errorf("public event was changed: %+v", got)
	}
}

func TestRedactEvent_EmptyMetadataNotNil(t *testing.T) {
	in := privateEvent("github.push", nil)
	got := redactEvent(&in)
	if got.Metadata == nil {
		t.Error("metadata should be an empty map, not nil")
	}
}

func TestRedactEvent_EnvironmentNormalised(t *testing.T) {
	tests := []struct {
		env  interface{}
		want string // empty means dropped
	}{
		{"production", "production"},
		{"Production", "production"},
		{"preview", "preview"},
		{"pr-123", "preview"},
		{"prod", "production"},
		{"staging-prod-eu", ""},
		{"project-x", ""},
		{"staging-acme-secret", ""},
		{"secret-customer", ""},
		{42, ""},
	}
	for _, tt := range tests {
		in := privateEvent("vercel.deploy", map[string]interface{}{"environment": tt.env})
		got := redactEvent(&in)
		v, ok := got.Metadata["environment"]
		if tt.want == "" && ok {
			t.Errorf("environment %v kept as %v", tt.env, v)
		}
		if tt.want != "" && v != tt.want {
			t.Errorf("environment %v = %v, want %q", tt.env, v, tt.want)
		}
	}
}

func TestRedactDropsFullName(t *testing.T) {
	e := models.DashboardEvent{
		ID: "1", EventType: "github.push", IsPrivate: true, Title: "x",
		Metadata: map[string]interface{}{"full_name": "octo/secret", "repo": "secret", "commit_count": 2},
	}
	got := redactEvent(&e)
	if _, ok := got.Metadata["full_name"]; ok {
		t.Error("full_name must not survive redaction")
	}
	if _, ok := got.Metadata["repo"]; ok {
		t.Error("repo must not survive redaction")
	}
}

func TestRedactEvent_StripsCommitContext(t *testing.T) {
	in := privateEvent("vercel.deploy", map[string]interface{}{
		"status": "FAILED", "branch": "feat/x", "commit_sha": "abc", "commit_message": "secret",
		"repo": "web", "full_name": "me/web", "project": "web", "deployment_url": "https://x",
		"run_url": "https://github.com/me/web/actions/runs/1", "workflow": "CI", "conclusion": "failure",
	})
	got := redactEvent(&in)
	for _, k := range []string{"branch", "commit_sha", "commit_message", "repo", "full_name", "project", "deployment_url", "run_url", "workflow"} {
		if _, ok := got.Metadata[k]; ok {
			t.Errorf("metadata key %q leaked", k)
		}
	}
	if got.Metadata["status"] != "FAILED" || got.Metadata["conclusion"] != "failure" {
		t.Errorf("allowlisted keys lost: %v", got.Metadata)
	}
}
