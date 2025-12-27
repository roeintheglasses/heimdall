package handlers

import (
	"encoding/json"
	"log"
	"net/http"

	"heimdall-backend/database"
	"heimdall-backend/models"
	"heimdall-backend/transformers"
)

// WebhookHandler handles incoming webhook requests
type WebhookHandler struct {
	repo     *database.EventRepository
	registry *transformers.Registry
}

// NewWebhookHandler creates a new webhook handler
func NewWebhookHandler(repo *database.EventRepository, registry *transformers.Registry) *WebhookHandler {
	return &WebhookHandler{
		repo:     repo,
		registry: registry,
	}
}

// ServeHTTP handles the webhook request
func (h *WebhookHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	var payload models.QStashPayload
	if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
		log.Printf("Invalid webhook payload: %v", err)
		http.Error(w, "Invalid payload", http.StatusBadRequest)
		return
	}

	log.Printf("Received webhook: type=%s", payload.EventType)

	// Check if we have a transformer for this event type
	if !h.registry.HasTransformer(payload.EventType) {
		log.Printf("Unknown event type: %s", payload.EventType)
		http.Error(w, "Unknown event type", http.StatusBadRequest)
		return
	}

	// Transform the event
	dashboardEvent, err := h.registry.Transform(payload.EventType, payload.Event)
	if err != nil {
		log.Printf("Failed to transform event: %v", err)
		http.Error(w, "Failed to process event", http.StatusInternalServerError)
		return
	}

	// Insert into database
	if err := h.repo.InsertEvent(dashboardEvent); err != nil {
		log.Printf("Failed to insert event: %v", err)
		http.Error(w, "Failed to save event", http.StatusInternalServerError)
		return
	}

	log.Printf("Processed event: type=%s, title=%s", dashboardEvent.EventType, dashboardEvent.Title)
	w.WriteHeader(http.StatusOK)
}
