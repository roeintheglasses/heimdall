package transformers

import (
	"encoding/json"
	"fmt"
	"log"
	"time"

	"heimdall-backend/models"
)

// TransformRailwayDeploy transforms a Railway deployment event
func TransformRailwayDeploy(eventData json.RawMessage) (models.DashboardEvent, error) {
	var railwayEvent struct {
		Type      string `json:"type"`
		Timestamp string `json:"timestamp"`
		Project   struct {
			ID          string `json:"id"`
			Name        string `json:"name"`
			Description string `json:"description"`
			CreatedAt   string `json:"createdAt"`
		} `json:"project"`
		Environment struct {
			ID   string `json:"id"`
			Name string `json:"name"`
		} `json:"environment"`
		Deployment struct {
			ID      string `json:"id"`
			Creator struct {
				ID     string `json:"id"`
				Name   string `json:"name"`
				Avatar string `json:"avatar"`
			} `json:"creator"`
			Meta map[string]interface{} `json:"meta"`
		} `json:"deployment"`
	}

	if err := json.Unmarshal(eventData, &railwayEvent); err != nil {
		log.Printf("Error unmarshaling Railway event: %v", err)
		return models.DashboardEvent{}, fmt.Errorf("failed to unmarshal Railway event: %w", err)
	}

	log.Printf("Processing Railway event - Type: %s, Project: %s, Environment: %s",
		railwayEvent.Type, railwayEvent.Project.Name, railwayEvent.Environment.Name)

	// Map Railway type to standard format
	status := "UNKNOWN"
	switch railwayEvent.Type {
	case "DEPLOY":
		status = "SUCCESS"
	case "DEPLOY_STARTED":
		status = "BUILDING"
	case "DEPLOY_FAILED":
		status = "FAILED"
	default:
		status = "DEPLOY"
	}

	// Build title
	title := fmt.Sprintf("Railway deployment of %s", railwayEvent.Project.Name)
	if railwayEvent.Environment.Name != "" {
		title = fmt.Sprintf("Railway deployment of %s to %s", railwayEvent.Project.Name, railwayEvent.Environment.Name)
	}

	metadata := map[string]interface{}{
		"project_name":   railwayEvent.Project.Name,
		"project_id":     railwayEvent.Project.ID,
		"status":         status,
		"environment":    railwayEvent.Environment.Name,
		"environment_id": railwayEvent.Environment.ID,
		"deployment_id":  railwayEvent.Deployment.ID,
		"creator_name":   railwayEvent.Deployment.Creator.Name,
		"creator_id":     railwayEvent.Deployment.Creator.ID,
		"event_type":     railwayEvent.Type,
		"timestamp":      railwayEvent.Timestamp,
	}

	// Add deployment meta if available
	if railwayEvent.Deployment.Meta != nil {
		for key, value := range railwayEvent.Deployment.Meta {
			metadata[fmt.Sprintf("meta_%s", key)] = value
		}
	}

	return models.DashboardEvent{
		EventType: "railway.deploy",
		Title:     title,
		Metadata:  metadata,
		CreatedAt: time.Now().UTC(),
	}, nil
}
