package transformers

import (
	"encoding/json"
	"fmt"
	"time"

	"heimdall-backend/models"
)

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
	case "deployment.succeeded":
		status = "SUCCESS"
	case "deployment.error":
		status = "FAILED"
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

	// Get deployment URL
	deployURL := ""
	if deployEvent.Payload.Deployment.URL != "" {
		deployURL = "https://" + deployEvent.Payload.Deployment.URL
	}

	return models.DashboardEvent{
		EventType: "vercel.deploy",
		Title:     title,
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
		},
		CreatedAt: timestamp,
	}, nil
}
