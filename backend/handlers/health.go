package handlers

import (
	"context"
	"net/http"
	"time"

	"heimdall-backend/config"
)

// healthPingTimeout bounds the database check so a slow Neon wake-up cannot hang the probe.
const healthPingTimeout = 2 * time.Second

// Pinger checks that a dependency is reachable. *sql.DB satisfies it.
type Pinger interface {
	PingContext(ctx context.Context) error
}

// HealthHandler handles health check requests
type HealthHandler struct {
	config *config.Config
	db     Pinger
}

// NewHealthHandler creates a new health handler. With a nil pinger the database
// check is skipped.
func NewHealthHandler(cfg *config.Config, db Pinger) *HealthHandler {
	return &HealthHandler{config: cfg, db: db}
}

// ServeHTTP handles GET /api/health. It returns 503 when the database does not
// answer within two seconds.
func (h *HealthHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	response := map[string]interface{}{
		"status":    "healthy",
		"timestamp": time.Now().UTC(),
		"service":   "heimdall-go-service",
		"version":   h.config.Version,
	}
	status := http.StatusOK

	if h.db != nil {
		ctx, cancel := context.WithTimeout(r.Context(), healthPingTimeout)
		err := h.db.PingContext(ctx)
		cancel()
		if err != nil {
			status = http.StatusServiceUnavailable
			response["status"] = "unhealthy"
			response["reason"] = "database unreachable"
		}
	}

	writeJSON(w, status, response)
}

// LiveHandler answers GET /api/health/live. It never touches the database, so
// container restarts do not follow a database cold start.
type LiveHandler struct{}

// ServeHTTP always returns 200.
func (LiveHandler) ServeHTTP(w http.ResponseWriter, _ *http.Request) {
	writeJSON(w, http.StatusOK, map[string]interface{}{
		"status":    "alive",
		"timestamp": time.Now().UTC(),
		"service":   "heimdall-go-service",
	})
}
