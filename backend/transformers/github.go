package transformers

import (
	"encoding/json"
	"fmt"
	"strings"
	"time"

	"heimdall-backend/models"
)

// TransformGitHubPush transforms a GitHub push event
func TransformGitHubPush(eventData json.RawMessage, timestamp time.Time) (models.DashboardEvent, error) {
	var pushEvent struct {
		Ref        string `json:"ref"`
		Repository struct {
			Name     string `json:"name"`
			FullName string `json:"full_name"`
			HTMLURL  string `json:"html_url"`
			Private  *bool  `json:"private"`
		} `json:"repository"`
		Deleted    bool `json:"deleted"`
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

	// Extract short ref name (refs/heads/main -> main, refs/tags/v1 -> v1)
	refType := "branch"
	branch := pushEvent.Ref
	switch {
	case strings.HasPrefix(branch, "refs/heads/"):
		branch = strings.TrimPrefix(branch, "refs/heads/")
	case strings.HasPrefix(branch, "refs/tags/"):
		branch = strings.TrimPrefix(branch, "refs/tags/")
		refType = "tag"
	}

	// Count commits
	commitCount := len(pushEvent.Commits)
	if commitCount == 0 {
		commitCount = 1
	}

	repo := pushEvent.Repository.Name
	var title string
	switch {
	case pushEvent.Deleted && refType == "tag":
		title = fmt.Sprintf("Tag %s deleted in %s", branch, repo)
	case pushEvent.Deleted:
		title = fmt.Sprintf("Branch %s deleted in %s", branch, repo)
	case refType == "tag":
		title = fmt.Sprintf("Tag %s pushed to %s", branch, repo)
	default:
		commitWord := "commit"
		if commitCount > 1 {
			commitWord = "commits"
		}
		title = fmt.Sprintf("%d %s pushed to %s/%s", commitCount, commitWord, repo, branch)
	}

	return models.DashboardEvent{
		EventType: "github.push",
		Title:     title,
		IsPrivate: isGitHubPrivate(pushEvent.Repository.Private),
		Metadata: map[string]interface{}{
			"repo":           repo,
			"full_name":      pushEvent.Repository.FullName,
			"branch":         branch,
			"ref_type":       refType,
			"deleted":        pushEvent.Deleted,
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
			Name     string `json:"name"`
			FullName string `json:"full_name"`
			HTMLURL  string `json:"html_url"`
			Private  *bool  `json:"private"`
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
		IsPrivate: isGitHubPrivate(prEvent.Repository.Private),
		Metadata: map[string]interface{}{
			"repo":           prEvent.Repository.Name,
			"full_name":      prEvent.Repository.FullName,
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
			Number int    `json:"number"`
			Title  string `json:"title"`
			User   struct {
				Login string `json:"login"`
			} `json:"user"`
			State   string `json:"state"`
			HTMLURL string `json:"html_url"`
		} `json:"issue"`
		Repository struct {
			Name     string `json:"name"`
			FullName string `json:"full_name"`
			Private  *bool  `json:"private"`
		} `json:"repository"`
	}

	if err := json.Unmarshal(eventData, &issueEvent); err != nil {
		return models.DashboardEvent{}, fmt.Errorf("failed to unmarshal issue event: %w", err)
	}

	return models.DashboardEvent{
		EventType: "github.issue",
		IsPrivate: isGitHubPrivate(issueEvent.Repository.Private),
		Title:     fmt.Sprintf("Issue #%d %s: %s", issueEvent.Issue.Number, issueEvent.Action, issueEvent.Issue.Title),
		Metadata: map[string]interface{}{
			"repo":      issueEvent.Repository.Name,
			"full_name": issueEvent.Repository.FullName,
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
			Name     string `json:"name"`
			FullName string `json:"full_name"`
			Private  *bool  `json:"private"`
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
		IsPrivate: isGitHubPrivate(releaseEvent.Repository.Private),
		Title:     fmt.Sprintf("Release %s: %s", releaseEvent.Release.TagName, title),
		Metadata: map[string]interface{}{
			"repo":        releaseEvent.Repository.Name,
			"full_name":   releaseEvent.Repository.FullName,
			"action":      releaseEvent.Action,
			"tag":         releaseEvent.Release.TagName,
			"author":      releaseEvent.Release.Author.Login,
			"release_url": releaseEvent.Release.HTMLURL,
			"draft":       releaseEvent.Release.Draft,
		},
		CreatedAt: timestamp,
	}, nil
}

// TransformGitHubWorkflowRun transforms a completed, unsuccessful GitHub Actions
// run into an error.ci event. The Edge handler only forwards runs whose
// conclusion is failure, timed_out or cancelled.
func TransformGitHubWorkflowRun(eventData json.RawMessage, timestamp time.Time) (models.DashboardEvent, error) {
	var runEvent struct {
		Action      string `json:"action"`
		WorkflowRun struct {
			Name       string `json:"name"`
			HeadBranch string `json:"head_branch"`
			HeadSHA    string `json:"head_sha"`
			Conclusion string `json:"conclusion"`
			HTMLURL    string `json:"html_url"`
			RunNumber  int    `json:"run_number"`
			Event      string `json:"event"`
		} `json:"workflow_run"`
		Repository struct {
			Name     string `json:"name"`
			FullName string `json:"full_name"`
			HTMLURL  string `json:"html_url"`
			Private  *bool  `json:"private"`
		} `json:"repository"`
	}

	if err := json.Unmarshal(eventData, &runEvent); err != nil {
		return models.DashboardEvent{}, fmt.Errorf("failed to unmarshal workflow_run event: %w", err)
	}

	run := runEvent.WorkflowRun
	word := "failed"
	if run.Conclusion == "timed_out" || run.Conclusion == "cancelled" {
		word = run.Conclusion
	}
	repo := runEvent.Repository.Name
	workflow := run.Name
	if workflow == "" {
		workflow = "workflow"
	}

	return models.DashboardEvent{
		EventType: "error.ci",
		IsPrivate: isGitHubPrivate(runEvent.Repository.Private),
		Title:     fmt.Sprintf("CI %s: %s on %s/%s", word, workflow, repo, run.HeadBranch),
		Metadata: map[string]interface{}{
			"repo":           repo,
			"full_name":      runEvent.Repository.FullName,
			"repository_url": runEvent.Repository.HTMLURL,
			"branch":         run.HeadBranch,
			"commit_sha":     run.HeadSHA,
			"workflow":       run.Name,
			"conclusion":     run.Conclusion,
			"run_url":        run.HTMLURL,
			"run_number":     run.RunNumber,
			"status":         strings.ToUpper(run.Conclusion),
			"event":          run.Event,
		},
		CreatedAt: timestamp,
	}, nil
}

// isGitHubPrivate applies the default-private rule: an event is public only
// when the payload says repository.private is explicitly false.
func isGitHubPrivate(private *bool) bool {
	return private == nil || *private
}
