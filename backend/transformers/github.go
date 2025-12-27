package transformers

import (
	"encoding/json"
	"fmt"
	"time"

	"heimdall-backend/models"
)

// TransformGitHubPush transforms a GitHub push event
func TransformGitHubPush(eventData json.RawMessage, timestamp time.Time) (models.DashboardEvent, error) {
	var pushEvent struct {
		Ref        string `json:"ref"`
		Repository struct {
			Name    string `json:"name"`
			HTMLURL string `json:"html_url"`
		} `json:"repository"`
		HeadCommit struct {
			ID      string `json:"id"`
			Message string `json:"message"`
			URL     string `json:"url"`
			Author  struct {
				Name  string `json:"name"`
				Email string `json:"email"`
			} `json:"author"`
		} `json:"head_commit"`
		Commits []struct {
			ID      string `json:"id"`
			Message string `json:"message"`
			Author  struct {
				Name string `json:"name"`
			} `json:"author"`
		} `json:"commits"`
		Pusher struct {
			Name  string `json:"name"`
			Email string `json:"email"`
		} `json:"pusher"`
	}

	if err := json.Unmarshal(eventData, &pushEvent); err != nil {
		return models.DashboardEvent{}, fmt.Errorf("failed to unmarshal push event: %w", err)
	}

	// Extract branch name from ref (refs/heads/main -> main)
	branch := pushEvent.Ref
	if len(branch) > 11 && branch[:11] == "refs/heads/" {
		branch = branch[11:]
	}

	// Count commits
	commitCount := len(pushEvent.Commits)
	if commitCount == 0 {
		commitCount = 1
	}

	// Build richer title
	commitWord := "commit"
	if commitCount > 1 {
		commitWord = "commits"
	}
	title := fmt.Sprintf("%d %s pushed to %s/%s", commitCount, commitWord, pushEvent.Repository.Name, branch)

	return models.DashboardEvent{
		EventType: "github.push",
		Title:     title,
		Metadata: map[string]interface{}{
			"repo":           pushEvent.Repository.Name,
			"branch":         pushEvent.Ref,
			"message":        pushEvent.HeadCommit.Message,
			"author":         pushEvent.HeadCommit.Author.Name,
			"commit_sha":     pushEvent.HeadCommit.ID,
			"commit_url":     pushEvent.HeadCommit.URL,
			"repository_url": pushEvent.Repository.HTMLURL,
			"commit_count":   commitCount,
			"pusher":         pushEvent.Pusher.Name,
		},
		CreatedAt: timestamp,
	}, nil
}

// TransformGitHubPR transforms a GitHub pull request event
func TransformGitHubPR(eventData json.RawMessage, timestamp time.Time) (models.DashboardEvent, error) {
	var prEvent struct {
		Action      string `json:"action"`
		Number      int    `json:"number"`
		PullRequest struct {
			Title string `json:"title"`
			User  struct {
				Login string `json:"login"`
			} `json:"user"`
			State   string `json:"state"`
			HTMLURL string `json:"html_url"`
			Merged  bool   `json:"merged"`
			Head    struct {
				Ref string `json:"ref"`
			} `json:"head"`
			Base struct {
				Ref string `json:"ref"`
			} `json:"base"`
		} `json:"pull_request"`
		Repository struct {
			Name    string `json:"name"`
			HTMLURL string `json:"html_url"`
		} `json:"repository"`
	}

	if err := json.Unmarshal(eventData, &prEvent); err != nil {
		return models.DashboardEvent{}, fmt.Errorf("failed to unmarshal PR event: %w", err)
	}

	// Build richer title with branch info
	title := fmt.Sprintf("PR #%d %s: %s [%s -> %s]",
		prEvent.Number,
		prEvent.Action,
		prEvent.PullRequest.Title,
		prEvent.PullRequest.Head.Ref,
		prEvent.PullRequest.Base.Ref,
	)

	return models.DashboardEvent{
		EventType: "github.pr",
		Title:     title,
		Metadata: map[string]interface{}{
			"repo":           prEvent.Repository.Name,
			"repository_url": prEvent.Repository.HTMLURL,
			"action":         prEvent.Action,
			"author":         prEvent.PullRequest.User.Login,
			"state":          prEvent.PullRequest.State,
			"pr_url":         prEvent.PullRequest.HTMLURL,
			"number":         prEvent.Number,
			"merged":         prEvent.PullRequest.Merged,
			"head_branch":    prEvent.PullRequest.Head.Ref,
			"base_branch":    prEvent.PullRequest.Base.Ref,
		},
		CreatedAt: timestamp,
	}, nil
}

// TransformGitHubIssue transforms a GitHub issue event
func TransformGitHubIssue(eventData json.RawMessage, timestamp time.Time) (models.DashboardEvent, error) {
	var issueEvent struct {
		Action string `json:"action"`
		Issue  struct {
			Number  int    `json:"number"`
			Title   string `json:"title"`
			User    struct {
				Login string `json:"login"`
			} `json:"user"`
			State   string `json:"state"`
			HTMLURL string `json:"html_url"`
		} `json:"issue"`
		Repository struct {
			Name string `json:"name"`
		} `json:"repository"`
	}

	if err := json.Unmarshal(eventData, &issueEvent); err != nil {
		return models.DashboardEvent{}, fmt.Errorf("failed to unmarshal issue event: %w", err)
	}

	return models.DashboardEvent{
		EventType: "github.issue",
		Title:     fmt.Sprintf("Issue #%d %s: %s", issueEvent.Issue.Number, issueEvent.Action, issueEvent.Issue.Title),
		Metadata: map[string]interface{}{
			"repo":      issueEvent.Repository.Name,
			"action":    issueEvent.Action,
			"author":    issueEvent.Issue.User.Login,
			"state":     issueEvent.Issue.State,
			"issue_url": issueEvent.Issue.HTMLURL,
			"number":    issueEvent.Issue.Number,
		},
		CreatedAt: timestamp,
	}, nil
}

// TransformGitHubRelease transforms a GitHub release event
func TransformGitHubRelease(eventData json.RawMessage, timestamp time.Time) (models.DashboardEvent, error) {
	var releaseEvent struct {
		Action  string `json:"action"`
		Release struct {
			TagName string `json:"tag_name"`
			Name    string `json:"name"`
			Author  struct {
				Login string `json:"login"`
			} `json:"author"`
			HTMLURL string `json:"html_url"`
			Draft   bool   `json:"draft"`
		} `json:"release"`
		Repository struct {
			Name string `json:"name"`
		} `json:"repository"`
	}

	if err := json.Unmarshal(eventData, &releaseEvent); err != nil {
		return models.DashboardEvent{}, fmt.Errorf("failed to unmarshal release event: %w", err)
	}

	title := releaseEvent.Release.Name
	if title == "" {
		title = releaseEvent.Release.TagName
	}

	return models.DashboardEvent{
		EventType: "github.release",
		Title:     fmt.Sprintf("Release %s: %s", releaseEvent.Release.TagName, title),
		Metadata: map[string]interface{}{
			"repo":        releaseEvent.Repository.Name,
			"action":      releaseEvent.Action,
			"tag":         releaseEvent.Release.TagName,
			"author":      releaseEvent.Release.Author.Login,
			"release_url": releaseEvent.Release.HTMLURL,
			"draft":       releaseEvent.Release.Draft,
		},
		CreatedAt: timestamp,
	}, nil
}
