package transformers

import (
	"encoding/json"
	"fmt"

	"github.com/roe/heimdall/models"
)

// TransformFunc is a function that transforms raw event data into a DashboardEvent
type TransformFunc func(json.RawMessage) (models.DashboardEvent, error)

// Registry holds all registered event transformers
type Registry struct {
	transformers map[string]TransformFunc
}

// NewRegistry creates a new transformer registry with default transformers
func NewRegistry() *Registry {
	r := &Registry{
		transformers: make(map[string]TransformFunc),
	}

	// Register default transformers
	r.Register("github.push", TransformGitHubPush)
	r.Register("github.pr", TransformGitHubPR)
	r.Register("github.issue", TransformGitHubIssue)
	r.Register("github.release", TransformGitHubRelease)
	r.Register("vercel.deploy", TransformVercelDeploy)
	r.Register("railway.deploy", TransformRailwayDeploy)

	return r
}

// Register adds a new transformer to the registry
func (r *Registry) Register(eventType string, fn TransformFunc) {
	r.transformers[eventType] = fn
}

// Transform transforms event data using the appropriate transformer
func (r *Registry) Transform(eventType string, eventData json.RawMessage) (models.DashboardEvent, error) {
	fn, ok := r.transformers[eventType]
	if !ok {
		return models.DashboardEvent{}, fmt.Errorf("unknown event type: %s", eventType)
	}

	return fn(eventData)
}

// HasTransformer checks if a transformer exists for the given event type
func (r *Registry) HasTransformer(eventType string) bool {
	_, ok := r.transformers[eventType]
	return ok
}

// SupportedEventTypes returns a list of all supported event types
func (r *Registry) SupportedEventTypes() []string {
	types := make([]string, 0, len(r.transformers))
	for t := range r.transformers {
		types = append(types, t)
	}
	return types
}
