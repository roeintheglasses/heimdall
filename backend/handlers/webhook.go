package handlers

import (
	"encoding/json"
	"net/http"
	"time"

	"heimdall-backend/database"
	"heimdall-backend/logger"
	"heimdall-backend/models"
	"heimdall-backend/transformers"
)

// WebhookHandler handles incoming webhook requests
type WebhookHandler struct {
	repo     database.EventStore
	registry *transformers.Registry
}

// NewWebhookHandler creates a new webhook handler
func NewWebhookHandler(repo database.EventStore, registry *transformers.Registry) *WebhookHandler {
	return &WebhookHandler{
		repo:     repo,
		registry: registry,
	}
}

// ServeHTTP handles the webhook request
func (h *WebhookHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	log := logger.FromContext(r.Context())

	var payload models.QStashPayload
	if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
		log.Error().Err(err).Msg("invalid webhook payload")
		http.Error(w, "Invalid payload", http.StatusBadRequest)
		return
	}

	log.Info().
		Str("event_type", payload.EventType).
		Msg("received webhook")

	// Check if we have a transformer for this event type
	if !h.registry.HasTransformer(payload.EventType) {
		log.Warn().
			Str("event_type", payload.EventType).
			Msg("unknown event type")
		http.Error(w, "Unknown event type", http.StatusBadRequest)
		return
	}

	// Determine timestamp - use payload timestamp if provided, otherwise current time
	timestamp := time.Now().UTC()
	if payload.Timestamp > 0 {
		timestamp = time.Unix(payload.Timestamp, 0).UTC()
	}

	// Transform the event
	dashboardEvent, err := h.registry.Transform(payload.EventType, payload.Event, timestamp)
	if err != nil {
		log.Error().
			Err(err).
			Str("event_type", payload.EventType).
			Msg("failed to transform event")
		http.Error(w, "Failed to process event", http.StatusInternalServerError)
		return
	}

	// Insert into database
	if err := h.repo.InsertEvent(dashboardEvent); err != nil {
		log.Error().
			Err(err).
			Str("event_type", dashboardEvent.EventType).
			Msg("failed to insert event")
		http.Error(w, "Failed to save event", http.StatusInternalServerError)
		return
	}

	log.Info().
		Str("event_type", dashboardEvent.EventType).
		Str("title", dashboardEvent.Title).
		Str("event_id", dashboardEvent.ID).
		Msg("processed event successfully")

	w.WriteHeader(http.StatusOK)
}
