package handlers

import (
	"bytes"
	"crypto/sha256"
	"crypto/subtle"
	"encoding/json"
	"errors"
	"net/http"
	"time"
	"unicode/utf8"

	"heimdall-backend/database"
	"heimdall-backend/logger"
	"heimdall-backend/models"
	"heimdall-backend/transformers"
)

const (
	// maxWebhookBody is the largest accepted request body: the 1 MiB provider
	// payload plus headroom for the envelope fields.
	maxWebhookBody = 1<<20 + 16<<10

	// Accepted timestamp window relative to now.
	maxTimestampAge     = 7 * 24 * time.Hour
	maxTimestampFuture  = 5 * time.Minute
	maxDeliveryIDLength = 255
	maxTitleLength      = 500

	// Timestamps above this are milliseconds (this value in seconds is year 33658).
	millisecondThreshold = 1_000_000_000_000
)

// WebhookHandler handles incoming webhook requests
type WebhookHandler struct {
	repo     database.EventStore
	registry *transformers.Registry
	secret   string
}

// NewWebhookHandler creates a new webhook handler. secret is the shared secret
// callers must send in the X-Heimdall-Secret header. With an empty secret the
// handler refuses all requests.
func NewWebhookHandler(repo database.EventStore, registry *transformers.Registry, secret string) *WebhookHandler {
	return &WebhookHandler{
		repo:     repo,
		registry: registry,
		secret:   secret,
	}
}

// secretMatches compares in constant time, independent of the input lengths.
func secretMatches(got, want string) bool {
	g := sha256.Sum256([]byte(got))
	w := sha256.Sum256([]byte(want))
	return subtle.ConstantTimeCompare(g[:], w[:]) == 1
}

// normalizeTimestamp converts the payload timestamp to a time and reports
// whether it is acceptable. Zero means "now"; values above 1e12 are milliseconds.
func normalizeTimestamp(ts int64, now time.Time) (time.Time, bool) {
	if ts == 0 {
		return now, true
	}
	if ts > millisecondThreshold {
		ts /= 1000
	}
	t := time.Unix(ts, 0).UTC()
	if t.Before(now.Add(-maxTimestampAge)) || t.After(now.Add(maxTimestampFuture)) {
		return time.Time{}, false
	}
	return t, true
}

func writeJSON(w http.ResponseWriter, status int, body any) {
	data, err := json.Marshal(body)
	if err != nil {
		http.Error(w, "Internal error", http.StatusInternalServerError)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_, _ = w.Write(data) //nolint:errcheck // nothing useful to do if the client went away
}

// ServeHTTP handles the webhook request
func (h *WebhookHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	log := logger.FromContext(r.Context())

	if h.secret == "" {
		log.Error().Msg("BACKEND_WEBHOOK_SECRET is not configured, rejecting webhook")
		http.Error(w, "webhook ingestion not configured", http.StatusServiceUnavailable)
		return
	}
	if !secretMatches(r.Header.Get("X-Heimdall-Secret"), h.secret) {
		log.Warn().Msg("webhook rejected: bad or missing secret")
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	r.Body = http.MaxBytesReader(w, r.Body, maxWebhookBody)

	var payload models.QStashPayload
	if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
		var tooLarge *http.MaxBytesError
		if errors.As(err, &tooLarge) {
			log.Warn().Msg("webhook payload too large")
			http.Error(w, "Payload too large", http.StatusRequestEntityTooLarge)
			return
		}
		log.Error().Err(err).Msg("invalid webhook payload")
		http.Error(w, "Invalid payload", http.StatusBadRequest)
		return
	}

	log.Info().
		Str("event_type", payload.EventType).
		Msg("received webhook")

	// The event must be a JSON object (missing, null, arrays and scalars are rejected)
	if trimmed := bytes.TrimSpace(payload.Event); len(trimmed) == 0 || trimmed[0] != '{' {
		log.Warn().Str("event_type", payload.EventType).Msg("webhook event is missing or not an object")
		http.Error(w, "Event must be a JSON object", http.StatusBadRequest)
		return
	}

	if !h.registry.HasTransformer(payload.EventType) {
		log.Warn().
			Str("event_type", payload.EventType).
			Msg("unknown event type")
		http.Error(w, "Unknown event type", http.StatusBadRequest)
		return
	}

	timestamp, ok := normalizeTimestamp(payload.Timestamp, time.Now().UTC())
	if !ok {
		log.Warn().
			Int64("timestamp", payload.Timestamp).
			Str("event_type", payload.EventType).
			Msg("webhook timestamp out of range")
		http.Error(w, "Timestamp out of range", http.StatusBadRequest)
		return
	}

	dashboardEvent, err := h.registry.Transform(payload.EventType, payload.Event, timestamp)
	if err != nil {
		log.Warn().
			Err(err).
			Str("event_type", payload.EventType).
			Msg("failed to transform event")
		http.Error(w, "Invalid event payload", http.StatusBadRequest)
		return
	}

	if utf8.RuneCountInString(payload.DeliveryID) > maxDeliveryIDLength {
		http.Error(w, "delivery_id too long", http.StatusBadRequest)
		return
	}
	dashboardEvent.DeliveryID = payload.DeliveryID
	dashboardEvent.Title = truncateRunes(dashboardEvent.Title, maxTitleLength)

	inserted, err := h.repo.InsertEvent(r.Context(), &dashboardEvent)
	if err != nil {
		log.Error().
			Err(err).
			Str("event_type", dashboardEvent.EventType).
			Msg("failed to insert event")
		http.Error(w, "Failed to save event", http.StatusInternalServerError)
		return
	}

	if !inserted {
		log.Info().
			Str("event_type", dashboardEvent.EventType).
			Str("delivery_id", payload.DeliveryID).
			Bool("duplicate", true).
			Msg("duplicate webhook delivery ignored")
		writeJSON(w, http.StatusOK, map[string]string{"status": "duplicate"})
		return
	}

	done := log.Info().
		Str("event_type", dashboardEvent.EventType).
		Str("event_id", dashboardEvent.ID)
	if !dashboardEvent.IsPrivate {
		done = done.Str("title", dashboardEvent.Title)
	}
	done.Msg("processed event successfully")

	writeJSON(w, http.StatusOK, map[string]string{"status": "ok", "id": dashboardEvent.ID})
}

// truncateRunes cuts s to at most n runes without splitting a multi-byte character.
func truncateRunes(s string, n int) string {
	if utf8.RuneCountInString(s) <= n {
		return s
	}
	return string([]rune(s)[:n])
}
