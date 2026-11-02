package transformers

import (
	"encoding/json"
	"testing"
)

func TestGitHubPrivacyFlag(t *testing.T) {
	tests := []struct {
		name        string
		repo        string
		wantPrivate bool
	}{
		{"private true", `{"name":"r","private":true}`, true},
		{"private false", `{"name":"r","private":false}`, false},
		{"private missing", `{"name":"r"}`, true},
		{"private null", `{"name":"r","private":null}`, true},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			inputs := map[string]struct {
				fn    TransformFunc
				input string
			}{
				"push":    {TransformGitHubPush, `{"ref":"refs/heads/main","repository":` + tt.repo + `}`},
				"pr":      {TransformGitHubPR, `{"action":"opened","number":1,"repository":` + tt.repo + `}`},
				"issue":   {TransformGitHubIssue, `{"action":"opened","issue":{"number":1},"repository":` + tt.repo + `}`},
				"release": {TransformGitHubRelease, `{"action":"published","release":{"tag_name":"v1"},"repository":` + tt.repo + `}`},
			}
			for kind, in := range inputs {
				ev, err := in.fn(json.RawMessage(in.input), testTimestamp)
				if err != nil {
					t.Fatalf("%s: unexpected error: %v", kind, err)
				}
				if ev.IsPrivate != tt.wantPrivate {
					t.Errorf("%s: IsPrivate = %v, want %v", kind, ev.IsPrivate, tt.wantPrivate)
				}
			}
		})
	}
}

func TestGitHubPushRefHandling(t *testing.T) {
	tests := []struct {
		name         string
		input        string
		wantTitle    string
		wantBranch   string
		wantRefType  string
		wantDeleted  bool
		wantCommitsN int
	}{
		{
			name:        "tag push",
			input:       `{"ref":"refs/tags/v1.2.0","repository":{"name":"heimdall","private":false}}`,
			wantTitle:   "Tag v1.2.0 pushed to heimdall",
			wantBranch:  "v1.2.0",
			wantRefType: "tag",
		},
		{
			name:        "branch deletion",
			input:       `{"ref":"refs/heads/old-feature","deleted":true,"repository":{"name":"heimdall"}}`,
			wantTitle:   "Branch old-feature deleted in heimdall",
			wantBranch:  "old-feature",
			wantRefType: "branch",
			wantDeleted: true,
		},
		{
			name:        "tag deletion",
			input:       `{"ref":"refs/tags/v0.1","deleted":true,"repository":{"name":"heimdall"}}`,
			wantTitle:   "Tag v0.1 deleted in heimdall",
			wantBranch:  "v0.1",
			wantRefType: "tag",
			wantDeleted: true,
		},
		{
			name:        "normal branch push stores short name",
			input:       `{"ref":"refs/heads/feat/x","repository":{"name":"heimdall"},"commits":[{"id":"a"},{"id":"b"}]}`,
			wantTitle:   "2 commits pushed to heimdall/feat/x",
			wantBranch:  "feat/x",
			wantRefType: "branch",
		},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			ev, err := TransformGitHubPush(json.RawMessage(tt.input), testTimestamp)
			if err != nil {
				t.Fatalf("unexpected error: %v", err)
			}
			if ev.Title != tt.wantTitle {
				t.Errorf("title = %q, want %q", ev.Title, tt.wantTitle)
			}
			if ev.Metadata["branch"] != tt.wantBranch {
				t.Errorf("branch = %v, want %q", ev.Metadata["branch"], tt.wantBranch)
			}
			if ev.Metadata["ref_type"] != tt.wantRefType {
				t.Errorf("ref_type = %v, want %q", ev.Metadata["ref_type"], tt.wantRefType)
			}
			if ev.Metadata["deleted"] != tt.wantDeleted {
				t.Errorf("deleted = %v, want %v", ev.Metadata["deleted"], tt.wantDeleted)
			}
		})
	}
}

func TestVercelStatusAndVisibility(t *testing.T) {
	statuses := map[string]string{
		"deployment.created":   "BUILDING",
		"deployment.succeeded": "SUCCESS",
		"deployment.ready":     "SUCCESS",
		"deployment.error":     "FAILED",
		"deployment.canceled":  "CANCELED",
		"deployment.promoted":  "PROMOTED",
		"deployment.other":     "DEPLOY",
	}
	for typ, want := range statuses {
		input := `{"type":"` + typ + `","payload":{"deployment":{"id":"d","name":"app"}}}`
		ev, err := TransformVercelDeploy(json.RawMessage(input), testTimestamp)
		if err != nil {
			t.Fatalf("%s: %v", typ, err)
		}
		if ev.Metadata["status"] != want {
			t.Errorf("%s: status = %v, want %s", typ, ev.Metadata["status"], want)
		}
	}

	vis := map[string]bool{
		`{"githubRepoVisibility":"public"}`:  false,
		`{"githubRepoVisibility":"private"}`: true,
		`{}`:                                 true,
		`null`:                               true,
		`{"githubRepoVisibility":true}`:      true,
	}
	for meta, wantPrivate := range vis {
		input := `{"type":"deployment.created","payload":{"deployment":{"id":"d","name":"app","meta":` + meta + `}}}`
		ev, err := TransformVercelDeploy(json.RawMessage(input), testTimestamp)
		if err != nil {
			t.Fatalf("meta %s: %v", meta, err)
		}
		if ev.IsPrivate != wantPrivate {
			t.Errorf("meta %s: IsPrivate = %v, want %v", meta, ev.IsPrivate, wantPrivate)
		}
	}
}

func TestRailwayShapes(t *testing.T) {
	tests := []struct {
		name       string
		input      string
		wantStatus string
		wantTitle  string
		wantKeys   map[string]string
	}{
		{
			name: "shape A legacy with status field",
			input: `{"type":"DEPLOY","status":"FAILED","project":{"id":"p","name":"api"},
				"environment":{"name":"production"},
				"service":{"id":"s1","name":"web"},
				"deployment":{"id":"dep1","creator":{"name":"Ann"},"meta":{"branch":"main","commitSha":"abc","commitMessage":"fix","extra":"secret"}}}`,
			wantStatus: "FAILED",
			wantTitle:  "api: FAILED to production",
			wantKeys: map[string]string{
				"service_name": "web", "service_id": "s1", "deployment_id": "dep1",
				"branch": "main", "commit_sha": "abc", "commit_message": "fix", "author": "Ann",
			},
		},
		{
			name: "shape B test script with FAILED",
			input: `{"event":"deployment.failed","data":{
				"deployment":{"id":"d2","status":"DEPLOY_FAILED","url":"https://x.up.railway.app","meta":{"branch":"dev","author":"Bob"}},
				"service":{"id":"s2","name":"worker"},"project":{"name":"heimdall"},"environment":{"name":"staging"}}}`,
			wantStatus: "FAILED",
			wantTitle:  "heimdall: FAILED to staging",
			wantKeys: map[string]string{
				"service_name": "worker", "deployment_url": "https://x.up.railway.app",
				"branch": "dev", "author": "Bob", "deployment_id": "d2",
			},
		},
		{
			name: "shape B DEPLOYED",
			input: `{"event":"deployment.completed","data":{"deployment":{"id":"d3","status":"DEPLOYED"},
				"project":{"name":"heimdall"},"environment":{"name":"production"}}}`,
			wantStatus: "SUCCESS",
			wantTitle:  "heimdall: SUCCESS to production",
		},
		{
			name: "shape C resource with type suffix",
			input: `{"type":"Deployment.crashed","resource":{"project":{"name":"p"},"environment":{"name":"e"},
				"service":{"name":"svc"},"deployment":{"id":"d4"}}}`,
			wantStatus: "FAILED",
			wantTitle:  "p: FAILED to e",
			wantKeys:   map[string]string{"service_name": "svc"},
		},
		{
			name: "shape C details status wins over type",
			input: `{"type":"Deployment.deployed","details":{"status":"BUILDING"},
				"resource":{"project":{"name":"p"},"deployment":{"id":"d5"}}}`,
			wantStatus: "BUILDING",
			wantTitle:  "p: BUILDING to production",
		},
		{
			name:       "removed maps to canceled",
			input:      `{"event":"deployment.removed","data":{"project":{"name":"p"},"deployment":{"id":"d6"}}}`,
			wantStatus: "CANCELED",
			wantTitle:  "p: CANCELED to production",
		},
	}
	allowed := map[string]bool{
		"project_name": true, "service_name": true, "service_id": true, "deployment_id": true,
		"deployment_url": true, "environment": true, "status": true, "branch": true,
		"commit_sha": true, "commit_message": true, "author": true,
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			ev, err := TransformRailwayDeploy(json.RawMessage(tt.input), testTimestamp)
			if err != nil {
				t.Fatalf("unexpected error: %v", err)
			}
			if ev.Title != tt.wantTitle {
				t.Errorf("title = %q, want %q", ev.Title, tt.wantTitle)
			}
			if ev.Metadata["status"] != tt.wantStatus {
				t.Errorf("status = %v, want %s", ev.Metadata["status"], tt.wantStatus)
			}
			if !ev.IsPrivate {
				t.Error("railway events must be private")
			}
			for k, v := range tt.wantKeys {
				if ev.Metadata[k] != v {
					t.Errorf("metadata[%s] = %v, want %q", k, ev.Metadata[k], v)
				}
			}
			for k := range ev.Metadata {
				if !allowed[k] {
					t.Errorf("unexpected metadata key %q", k)
				}
			}
		})
	}
}

func TestRailwayRejectsNonObjects(t *testing.T) {
	for _, in := range []string{`null`, `[]`, `"x"`, `{bad`} {
		if _, err := TransformRailwayDeploy(json.RawMessage(in), testTimestamp); err == nil {
			t.Errorf("input %s: expected error", in)
		}
	}
}

func TestRailwayMalformedFieldTypesDoNotPanic(t *testing.T) {
	in := `{"type":5,"project":"x","environment":[],"deployment":{"meta":"oops","id":7}}`
	ev, err := TransformRailwayDeploy(json.RawMessage(in), testTimestamp)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if ev.Title != "Unknown Project: DEPLOY to production" {
		t.Errorf("title = %q", ev.Title)
	}
}
