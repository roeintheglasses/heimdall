package transformers

import (
	"encoding/json"
	"testing"
	"time"
)

var testTimestamp = time.Date(2024, 1, 15, 10, 30, 0, 0, time.UTC)

func TestTransformGitHubPush(t *testing.T) {
	tests := []struct {
		name          string
		input         string
		expectedTitle string
		expectedRepo  string
		expectedErr   bool
	}{
		{
			name: "valid push event",
			input: `{
				"ref": "refs/heads/main",
				"repository": {"name": "heimdall"},
				"head_commit": {
					"message": "Initial commit",
					"author": {"name": "John Doe"}
				},
				"commits": [{"id": "abc123"}]
			}`,
			expectedTitle: "1 commit pushed to heimdall/main",
			expectedRepo:  "heimdall",
			expectedErr:   false,
		},
		{
			name: "push with multiple commits",
			input: `{
				"ref": "refs/heads/feature-branch",
				"repository": {"name": "my-project"},
				"head_commit": {
					"message": "Fix bug: JSON parsing \"issue\"",
					"author": {"name": "Jane Smith"}
				},
				"commits": [{"id": "abc"}, {"id": "def"}, {"id": "ghi"}]
			}`,
			expectedTitle: "3 commits pushed to my-project/feature-branch",
			expectedRepo:  "my-project",
			expectedErr:   false,
		},
		{
			name:        "invalid JSON",
			input:       `{invalid json}`,
			expectedErr: true,
		},
		{
			name: "push without commits array",
			input: `{
				"ref": "refs/heads/main",
				"repository": {"name": "test-repo"},
				"head_commit": {
					"message": "Commit",
					"author": {"name": "Author"}
				}
			}`,
			expectedTitle: "1 commit pushed to test-repo/main",
			expectedRepo:  "test-repo",
			expectedErr:   false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result, err := TransformGitHubPush(json.RawMessage(tt.input), testTimestamp)

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

			if result.EventType != "github.push" {
				t.Errorf("expected event type github.push, got %q", result.EventType)
			}

			if repo, ok := result.Metadata["repo"].(string); ok {
				if repo != tt.expectedRepo {
					t.Errorf("expected repo %q, got %q", tt.expectedRepo, repo)
				}
			}

			if !result.CreatedAt.Equal(testTimestamp) {
				t.Errorf("expected timestamp %v, got %v", testTimestamp, result.CreatedAt)
			}
		})
	}
}

func TestTransformGitHubPR(t *testing.T) {
	tests := []struct {
		name          string
		input         string
		expectedTitle string
		expectedErr   bool
	}{
		{
			name: "opened PR",
			input: `{
				"action": "opened",
				"number": 42,
				"pull_request": {
					"title": "Add new feature",
					"user": {"login": "contributor"},
					"state": "open",
					"html_url": "https://github.com/repo/pull/42",
					"merged": false,
					"head": {"ref": "feature-branch"},
					"base": {"ref": "main"}
				},
				"repository": {"name": "heimdall"}
			}`,
			expectedTitle: "PR #42 opened: Add new feature [feature-branch -> main]",
			expectedErr:   false,
		},
		{
			name: "merged PR",
			input: `{
				"action": "closed",
				"number": 100,
				"pull_request": {
					"title": "Fix critical bug",
					"user": {"login": "maintainer"},
					"state": "closed",
					"html_url": "https://github.com/repo/pull/100",
					"merged": true,
					"head": {"ref": "bugfix"},
					"base": {"ref": "main"}
				},
				"repository": {"name": "project"}
			}`,
			expectedTitle: "PR #100 closed: Fix critical bug [bugfix -> main]",
			expectedErr:   false,
		},
		{
			name:        "invalid JSON",
			input:       `not json`,
			expectedErr: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result, err := TransformGitHubPR(json.RawMessage(tt.input), testTimestamp)

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

			if result.EventType != "github.pr" {
				t.Errorf("expected event type github.pr, got %q", result.EventType)
			}

			if !result.CreatedAt.Equal(testTimestamp) {
				t.Errorf("expected timestamp %v, got %v", testTimestamp, result.CreatedAt)
			}
		})
	}
}

func TestTransformGitHubIssue(t *testing.T) {
	tests := []struct {
		name          string
		input         string
		expectedTitle string
		expectedErr   bool
	}{
		{
			name: "opened issue",
			input: `{
				"action": "opened",
				"issue": {
					"number": 123,
					"title": "Bug: App crashes on startup",
					"user": {"login": "reporter"},
					"state": "open",
					"html_url": "https://github.com/repo/issues/123"
				},
				"repository": {"name": "heimdall"}
			}`,
			expectedTitle: "Issue #123 opened: Bug: App crashes on startup",
			expectedErr:   false,
		},
		{
			name: "closed issue",
			input: `{
				"action": "closed",
				"issue": {
					"number": 50,
					"title": "Feature request",
					"user": {"login": "user"},
					"state": "closed",
					"html_url": "https://github.com/repo/issues/50"
				},
				"repository": {"name": "project"}
			}`,
			expectedTitle: "Issue #50 closed: Feature request",
			expectedErr:   false,
		},
		{
			name:        "invalid JSON",
			input:       `{broken`,
			expectedErr: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result, err := TransformGitHubIssue(json.RawMessage(tt.input), testTimestamp)

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

			if result.EventType != "github.issue" {
				t.Errorf("expected event type github.issue, got %q", result.EventType)
			}

			if !result.CreatedAt.Equal(testTimestamp) {
				t.Errorf("expected timestamp %v, got %v", testTimestamp, result.CreatedAt)
			}
		})
	}
}

func TestTransformGitHubRelease(t *testing.T) {
	tests := []struct {
		name          string
		input         string
		expectedTitle string
		expectedErr   bool
	}{
		{
			name: "published release with name",
			input: `{
				"action": "published",
				"release": {
					"tag_name": "v1.0.0",
					"name": "Version 1.0 - Initial Release",
					"author": {"login": "maintainer"},
					"html_url": "https://github.com/repo/releases/v1.0.0",
					"draft": false
				},
				"repository": {"name": "heimdall"}
			}`,
			expectedTitle: "Release v1.0.0: Version 1.0 - Initial Release",
			expectedErr:   false,
		},
		{
			name: "release without name (uses tag)",
			input: `{
				"action": "published",
				"release": {
					"tag_name": "v2.0.0",
					"name": "",
					"author": {"login": "releaser"},
					"html_url": "https://github.com/repo/releases/v2.0.0",
					"draft": false
				},
				"repository": {"name": "project"}
			}`,
			expectedTitle: "Release v2.0.0: v2.0.0",
			expectedErr:   false,
		},
		{
			name:        "invalid JSON",
			input:       `[]`,
			expectedErr: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result, err := TransformGitHubRelease(json.RawMessage(tt.input), testTimestamp)

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

			if result.EventType != "github.release" {
				t.Errorf("expected event type github.release, got %q", result.EventType)
			}

			if !result.CreatedAt.Equal(testTimestamp) {
				t.Errorf("expected timestamp %v, got %v", testTimestamp, result.CreatedAt)
			}
		})
	}
}
