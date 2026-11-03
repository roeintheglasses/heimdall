package transformers

import (
	"encoding/json"
	"strings"
	"testing"
	"time"
)

func TestTransformVercelDeploy(t *testing.T) {
	testTime := time.Date(2024, 1, 15, 10, 30, 0, 0, time.UTC)

	tests := []struct {
		name           string
		input          string
		expectedTitle  string
		expectedStatus string
		expectedErr    bool
	}{
		{
			name: "deployment created",
			input: `{
				"type": "deployment.created",
				"payload": {
					"deployment": {
						"id": "dpl_123",
						"name": "heimdall",
						"url": "https://heimdall.vercel.app"
					},
					"target": "production",
					"plan": "pro",
					"regions": ["sfo1"]
				}
			}`,
			expectedTitle:  "heimdall: BUILDING to production",
			expectedStatus: "BUILDING",
			expectedErr:    false,
		},
		{
			name: "deployment succeeded",
			input: `{
				"type": "deployment.succeeded",
				"payload": {
					"deployment": {
						"id": "dpl_456",
						"name": "my-app",
						"url": "https://my-app.vercel.app"
					},
					"target": "preview",
					"plan": "hobby",
					"regions": ["iad1"]
				}
			}`,
			expectedTitle:  "my-app: SUCCESS to preview",
			expectedStatus: "SUCCESS",
			expectedErr:    false,
		},
		{
			name: "deployment error",
			input: `{
				"type": "deployment.error",
				"payload": {
					"deployment": {
						"id": "dpl_789",
						"name": "broken-app",
						"url": ""
					},
					"target": "production"
				}
			}`,
			expectedTitle:  "broken-app: FAILED to production",
			expectedStatus: "FAILED",
			expectedErr:    false,
		},
		{
			name: "unknown deployment type",
			input: `{
				"type": "deployment.unknown",
				"payload": {
					"deployment": {
						"id": "dpl_xxx",
						"name": "test",
						"url": ""
					}
				}
			}`,
			expectedTitle:  "test: DEPLOY to preview",
			expectedStatus: "DEPLOY",
			expectedErr:    false,
		},
		{
			name:        "invalid JSON",
			input:       `not valid json`,
			expectedErr: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result, err := TransformVercelDeploy(json.RawMessage(tt.input), testTime)

			if tt.expectedErr {
				if err == nil {
					t.Errorf("expected error but got none")
				}
				return
			}

			if err != nil {
				t.Errorf("unexpected error: %v", err)
				return
			}

			if result.Title != tt.expectedTitle {
				t.Errorf("expected title %q, got %q", tt.expectedTitle, result.Title)
			}

			if result.EventType != "vercel.deploy" {
				t.Errorf("expected event type vercel.deploy, got %q", result.EventType)
			}

			if status, ok := result.Metadata["status"].(string); ok {
				if status != tt.expectedStatus {
					t.Errorf("expected status %q, got %q", tt.expectedStatus, status)
				}
			}

			if !result.CreatedAt.Equal(testTime) {
				t.Errorf("expected timestamp %v, got %v", testTime, result.CreatedAt)
			}
		})
	}
}

func TestTransformVercelDeploy_CommitContext(t *testing.T) {
	long := strings.Repeat("é", 600)
	input := `{"type":"deployment.error","payload":{"deployment":{"id":"d","name":"web","url":"web.vercel.app","meta":{
		"githubCommitRef":"main","githubCommitSha":"abc123","githubCommitMessage":"` + long + `",
		"githubRepo":"web","githubOrg":"me","githubRepoVisibility":"private"}}}}`
	ev, err := TransformVercelDeploy(json.RawMessage(input), time.Now())
	if err != nil {
		t.Fatal(err)
	}
	for k, want := range map[string]string{"branch": "main", "commit_sha": "abc123", "repo": "web", "full_name": "me/web"} {
		if ev.Metadata[k] != want {
			t.Errorf("metadata[%s] = %v, want %s", k, ev.Metadata[k], want)
		}
	}
	if got := ev.Metadata["commit_message"].(string); len([]rune(got)) != 500 { //nolint:errcheck,forcetypeassert // test
		t.Errorf("commit_message runes = %d, want 500", len([]rune(got)))
	}

	// githubCommitOrg is the fallback org, and no org means no full_name.
	ev, _ = TransformVercelDeploy(json.RawMessage(`{"type":"deployment.created","payload":{"deployment":{"meta":{"githubRepo":"web","githubCommitOrg":"acme"}}}}`), time.Now()) //nolint:errcheck // valid input
	if ev.Metadata["full_name"] != "acme/web" {
		t.Errorf("full_name = %v", ev.Metadata["full_name"])
	}
	ev, _ = TransformVercelDeploy(json.RawMessage(`{"type":"deployment.created","payload":{"deployment":{"meta":{"githubRepo":"web"}}}}`), time.Now()) //nolint:errcheck // valid input
	if ev.Metadata["full_name"] != "" || ev.Metadata["repo"] != "web" {
		t.Errorf("unexpected metadata %v", ev.Metadata)
	}
}
