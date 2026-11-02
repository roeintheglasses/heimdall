package transformers

import (
	"encoding/json"
	"fmt"
	"strings"
	"time"

	"heimdall-backend/models"
)

// TransformRailwayDeploy transforms a Railway deployment event.
//
// Three payload shapes are accepted:
//
//	A (legacy): {type, status, project, environment, service?, deployment{id, creator, meta}}
//	B (test script): {event, data{deployment{id, status, url, meta}, service, project, environment}}
//	C (best effort): {type: "Deployment.*", resource{project, environment, service, deployment}, details?{status}}
//
// Railway events are always stored as private.
func TransformRailwayDeploy(eventData json.RawMessage, timestamp time.Time) (models.DashboardEvent, error) {
	var top map[string]interface{}
	if err := json.Unmarshal(eventData, &top); err != nil {
		return models.DashboardEvent{}, fmt.Errorf("failed to unmarshal Railway event: %w", err)
	}
	if top == nil {
		return models.DashboardEvent{}, fmt.Errorf("failed to unmarshal Railway event: payload is not an object")
	}

	// Pick the object that holds project/environment/service/deployment.
	root := top
	if data := asMap(top["data"]); data != nil {
		root = data
	} else if resource := asMap(top["resource"]); resource != nil {
		root = resource
	}

	project := asMap(root["project"])
	environment := asMap(root["environment"])
	service := asMap(root["service"])
	deployment := asMap(root["deployment"])
	meta := asMap(deployment["meta"])
	creator := asMap(deployment["creator"])
	details := asMap(top["details"])

	eventName := asString(top["type"])
	if eventName == "" {
		eventName = asString(top["event"])
	}

	status := resolveRailwayStatus(
		asString(top["status"]),
		asString(deployment["status"]),
		asString(root["status"]),
		asString(details["status"]),
		eventName,
	)

	projectName := asString(project["name"])
	displayProject := projectName
	if displayProject == "" {
		displayProject = "Unknown Project"
	}

	envName := asString(environment["name"])
	displayEnv := envName
	if displayEnv == "" {
		displayEnv = "production"
	}

	title := fmt.Sprintf("%s: %s to %s", displayProject, status, displayEnv)

	deploymentURL := asString(deployment["url"])
	if deploymentURL == "" {
		deploymentURL = asString(deployment["staticUrl"])
	}
	if deploymentURL == "" {
		deploymentURL = asString(service["url"])
	}

	author := firstString(meta, "author", "commitAuthor")
	if author == "" {
		author = asString(creator["name"])
	}

	metadata := map[string]interface{}{
		"project_name":   projectName,
		"service_name":   asString(service["name"]),
		"service_id":     asString(service["id"]),
		"deployment_id":  asString(deployment["id"]),
		"deployment_url": deploymentURL,
		"environment":    envName,
		"status":         status,
		"branch":         firstString(meta, "branch"),
		"commit_sha":     firstString(meta, "commitSha", "commit_sha"),
		"commit_message": firstString(meta, "commitMessage", "commit_message"),
		"author":         author,
	}

	return models.DashboardEvent{
		EventType: "railway.deploy",
		Title:     title,
		IsPrivate: true,
		Metadata:  metadata,
		CreatedAt: timestamp,
	}, nil
}

// resolveRailwayStatus uses the first explicit status field, then falls back
// to the suffix of the event type or name.
func resolveRailwayStatus(statusFields ...string) string {
	for i, raw := range statusFields {
		if raw == "" {
			continue
		}
		isEventName := i == len(statusFields)-1
		if isEventName {
			raw = eventSuffix(raw)
		}
		if s := normalizeRailwayStatus(raw); s != "DEPLOY" {
			return s
		}
	}
	return "DEPLOY"
}

// eventSuffix reduces "Deployment.failed" to "failed" and keeps legacy
// names such as "DEPLOY_STARTED" intact for normalizeRailwayStatus.
func eventSuffix(name string) string {
	if idx := strings.LastIndex(name, "."); idx >= 0 {
		return name[idx+1:]
	}
	return name
}

func normalizeRailwayStatus(raw string) string {
	s := strings.ToUpper(strings.TrimSpace(raw))
	s = strings.TrimPrefix(s, "DEPLOY_")
	switch s {
	case "SUCCESS", "SUCCEEDED", "DEPLOYED", "COMPLETED", "DEPLOY":
		return "SUCCESS"
	case "BUILDING", "DEPLOYING", "INITIALIZING", "QUEUED", "WAITING", "STARTED", "CREATED":
		return "BUILDING"
	case "FAILED", "CRASHED", "ERROR":
		return "FAILED"
	case "REMOVED", "REMOVING", "CANCELED", "CANCELLED", "SKIPPED":
		return "CANCELED"
	default:
		return "DEPLOY"
	}
}

func asMap(v interface{}) map[string]interface{} {
	if m, ok := v.(map[string]interface{}); ok {
		return m
	}
	return nil
}

func asString(v interface{}) string {
	if s, ok := v.(string); ok {
		return s
	}
	return ""
}

func firstString(m map[string]interface{}, keys ...string) string {
	for _, k := range keys {
		if s := asString(m[k]); s != "" {
			return s
		}
	}
	return ""
}
