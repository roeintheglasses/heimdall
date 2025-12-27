package handlers

import (
	"encoding/json"
	"net/http"

	"heimdall-backend/database"
	"heimdall-backend/logger"
)

// StatsHandler handles stats retrieval requests
type StatsHandler struct {
	repo database.EventStore
}

// NewStatsHandler creates a new stats handler
func NewStatsHandler(repo database.EventStore) *StatsHandler {
	return &StatsHandler{repo: repo}
}

// ServeHTTP handles the stats request
func (h *StatsHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	log := logger.FromContext(r.Context())

	log.Debug().Msg("retrieving event stats")

	stats, err := h.repo.GetStats()
	if err != nil {
		log.Error().Err(err).Msg("failed to retrieve stats")
		http.Error(w, "Failed to retrieve stats", http.StatusInternalServerError)
		return
	}

	log.Debug().
		Int("total_events", stats.TotalEvents).
		Int("last_24h", stats.Last24Hours).
		Int("last_week", stats.LastWeek).
		Msg("stats retrieved")

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(stats)
}
