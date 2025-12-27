package transformers

import (
	"encoding/json"
	"fmt"
	"log"
	"time"

	"github.com/roe/heimdall/models"
)

// TransformVercelDeploy transforms a Vercel deployment event
func TransformVercelDeploy(eventData json.RawMessage) (models.DashboardEvent, error) {
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
		log.Printf("Error unmarshaling Vercel event: %v", err)
		return models.DashboardEvent{}, fmt.Errorf("failed to unmarshal Vercel event: %w", err)
	}

	// Determine status from event type
	status := "UNKNOWN"
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

	log.Printf("Processing Vercel event - Type: %s, Project: %s, Status: %s", deployEvent.Type, projectName, status)

	return models.DashboardEvent{
		EventType: "vercel.deploy",
		Title:     fmt.Sprintf("Deployment of %s", projectName),
		Metadata: map[string]interface{}{
			"project":       projectName,
			"status":        status,
			"url":           deployEvent.Payload.Deployment.URL,
			"deployment_id": deployEvent.Payload.Deployment.ID,
			"target":        deployEvent.Payload.Target,
			"plan":          deployEvent.Payload.Plan,
			"regions":       deployEvent.Payload.Regions,
			"event_type":    deployEvent.Type,
		},
		CreatedAt: time.Now().UTC(),
	}, nil
}
