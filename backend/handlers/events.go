package handlers

import (
	"encoding/json"
	"log"
	"net/http"

	"github.com/roe/heimdall/database"
)

// EventsHandler handles event retrieval requests
type EventsHandler struct {
	repo *database.EventRepository
}

// NewEventsHandler creates a new events handler
func NewEventsHandler(repo *database.EventRepository) *EventsHandler {
	return &EventsHandler{repo: repo}
}

// ServeHTTP handles the events request
func (h *EventsHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	events, err := h.repo.GetRecentEvents(50)
	if err != nil {
		log.Printf("Failed to retrieve events: %v", err)
		http.Error(w, "Failed to retrieve events", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(events)
}
