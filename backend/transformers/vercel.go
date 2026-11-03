package transformers

import (
	"encoding/json"
	"fmt"
	"strings"
	"time"

	"heimdall-backend/models"
)

// maxCommitMessageLen caps the stored commit message in runes.
const maxCommitMessageLen = 500

func metaStr(meta map[string]interface{}, key string) string {
	s, _ := meta[key].(string) //nolint:errcheck // zero value is the intended fallback
	return strings.TrimSpace(s)
}

func firstNonEmptyStr(vals ...string) string {
	for _, v := range vals {
		if v != "" {
			return v
		}
	}
	return ""
}

// TransformVercelDeploy transforms a Vercel deployment event
func TransformVercelDeploy(eventData json.RawMessage, timestamp time.Time) (models.DashboardEvent, error) {
	var deployEvent struct {
		Type    string `json:"type"`
		Payload struct {
			Team struct {
				ID string `json:"id"`
			} `json:"team"`
			User struct {
				ID string `json:"id"`
			} `json:"user"`
			Alias      []string `json:"alias"`
			Deployment struct {
				ID   string                 `json:"id"`
				Meta map[string]interface{} `json:"meta"`
				URL  string                 `json:"url"`
				Name string                 `json:"name"`
			} `json:"deployment"`
			Links struct {
				Deployment string `json:"deployment"`
				Project    string `json:"project"`
			} `json:"links"`
			Target  string `json:"target"`
			Project struct {
				ID string `json:"id"`
			} `json:"project"`
			Plan    string   `json:"plan"`
			Regions []string `json:"regions"`
		} `json:"payload"`
	}

	if err := json.Unmarshal(eventData, &deployEvent); err != nil {
		return models.DashboardEvent{}, fmt.Errorf("failed to unmarshal Vercel event: %w", err)
	}

	// Determine status from event type
	var status string
	switch deployEvent.Type {
	case "deployment.created":
		status = "BUILDING"
	case "deployment.succeeded", "deployment.ready":
		status = "SUCCESS"
	case "deployment.error":
		status = "FAILED"
	case "deployment.canceled":
		status = "CANCELED"
	case "deployment.promoted":
		status = "PROMOTED"
	default:
		status = "DEPLOY"
	}

	projectName := deployEvent.Payload.Deployment.Name
	if projectName == "" {
		projectName = "Unknown Project"
	}

	// Get environment/target
	environment := deployEvent.Payload.Target
	if environment == "" {
		environment = "preview"
	}

	// Build richer title with project, status, and environment
	title := fmt.Sprintf("%s: %s to %s", projectName, status, environment)

	// Commit context from the deployment meta, when Vercel sends it.
	meta := deployEvent.Payload.Deployment.Meta
	repo := metaStr(meta, "githubRepo")
	org := firstNonEmptyStr(metaStr(meta, "githubOrg"), metaStr(meta, "githubCommitOrg"))
	fullName := ""
	if repo != "" && org != "" {
		fullName = org + "/" + repo
	}
	commitMessage := metaStr(meta, "githubCommitMessage")
	if r := []rune(commitMessage); len(r) > maxCommitMessageLen {
		commitMessage = string(r[:maxCommitMessageLen])
	}

	// Get deployment URL
	deployURL := ""
	if deployEvent.Payload.Deployment.URL != "" {
		deployURL = "https://" + deployEvent.Payload.Deployment.URL
	}

	return models.DashboardEvent{
		EventType: "vercel.deploy",
		Title:     title,
		IsPrivate: !isVercelPublic(deployEvent.Payload.Deployment.Meta),
		Metadata: map[string]interface{}{
			"project":        projectName,
			"status":         status,
			"url":            deployEvent.Payload.Deployment.URL,
			"deployment_url": deployURL,
			"deployment_id":  deployEvent.Payload.Deployment.ID,
			"target":         deployEvent.Payload.Target,
			"environment":    environment,
			"plan":           deployEvent.Payload.Plan,
			"regions":        deployEvent.Payload.Regions,
			"event_type":     deployEvent.Type,
			"repo":           repo,
			"full_name":      fullName,
			"branch":         metaStr(meta, "githubCommitRef"),
			"commit_sha":     metaStr(meta, "githubCommitSha"),
			"commit_message": commitMessage,
		},
		CreatedAt: timestamp,
	}, nil
}

// isVercelPublic reports whether the deployment is linked to a public repository.
// Anything other than an explicit "public" visibility is treated as private.
func isVercelPublic(meta map[string]interface{}) bool {
	v, ok := meta["githubRepoVisibility"].(string)
	return ok && v == "public"
}
