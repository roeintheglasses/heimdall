package transformers

import (
	"encoding/json"
	"fmt"
	"time"

	"heimdall-backend/models"
)

// TransformGitHubPush transforms a GitHub push event
func TransformGitHubPush(eventData json.RawMessage) (models.DashboardEvent, error) {
	var pushEvent struct {
		Repository struct {
			Name string `json:"name"`
		} `json:"repository"`
		HeadCommit struct {
			Message string `json:"message"`
			Author  struct {
				Name string `json:"name"`
			} `json:"author"`
		} `json:"head_commit"`
	}

	if err := json.Unmarshal(eventData, &pushEvent); err != nil {
		return models.DashboardEvent{}, fmt.Errorf("failed to unmarshal push event: %w", err)
	}

	return models.DashboardEvent{
		EventType: "github.push",
		Title:     fmt.Sprintf("Push to %s", pushEvent.Repository.Name),
		Metadata: map[string]interface{}{
			"repo":    pushEvent.Repository.Name,
			"message": pushEvent.HeadCommit.Message,
			"author":  pushEvent.HeadCommit.Author.Name,
		},
		CreatedAt: time.Now().UTC(),
	}, nil
}

// TransformGitHubPR transforms a GitHub pull request event
func TransformGitHubPR(eventData json.RawMessage) (models.DashboardEvent, error) {
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
		} `json:"pull_request"`
		Repository struct {
			Name string `json:"name"`
		} `json:"repository"`
	}

	if err := json.Unmarshal(eventData, &prEvent); err != nil {
		return models.DashboardEvent{}, fmt.Errorf("failed to unmarshal PR event: %w", err)
	}

	return models.DashboardEvent{
		EventType: "github.pr",
		Title:     fmt.Sprintf("PR #%d %s: %s", prEvent.Number, prEvent.Action, prEvent.PullRequest.Title),
		Metadata: map[string]interface{}{
			"repo":   prEvent.Repository.Name,
			"action": prEvent.Action,
			"author": prEvent.PullRequest.User.Login,
			"state":  prEvent.PullRequest.State,
			"pr_url": prEvent.PullRequest.HTMLURL,
			"number": prEvent.Number,
			"merged": prEvent.PullRequest.Merged,
		},
		CreatedAt: time.Now().UTC(),
	}, nil
}

// TransformGitHubIssue transforms a GitHub issue event
func TransformGitHubIssue(eventData json.RawMessage) (models.DashboardEvent, error) {
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
		CreatedAt: time.Now().UTC(),
	}, nil
}

// TransformGitHubRelease transforms a GitHub release event
func TransformGitHubRelease(eventData json.RawMessage) (models.DashboardEvent, error) {
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
		CreatedAt: time.Now().UTC(),
	}, nil
}
