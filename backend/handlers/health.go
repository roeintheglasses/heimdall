package handlers

import (
	"encoding/json"
	"net/http"
	"time"

	"heimdall-backend/config"
)

// HealthHandler handles health check requests
type HealthHandler struct {
	config *config.Config
}

// NewHealthHandler creates a new health handler
func NewHealthHandler(cfg *config.Config) *HealthHandler {
	return &HealthHandler{config: cfg}
}

// ServeHTTP handles the health check request
func (h *HealthHandler) ServeHTTP(w http.ResponseWriter, _ *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)

	response := map[string]interface{}{
		"status":    "healthy",
		"timestamp": time.Now().UTC(),
		"service":   "heimdall-go-service",
		"version":   h.config.Version,
	}

	// Error intentionally ignored: WriteHeader already sent, can't change response
	_ = json.NewEncoder(w).Encode(response) //nolint:errcheck
}
