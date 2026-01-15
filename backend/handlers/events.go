package handlers

import (
	"crypto/md5"
	"encoding/json"
	"fmt"
	"net/http"
	"strconv"
	"time"

	"heimdall-backend/database"
	"heimdall-backend/logger"
	"heimdall-backend/models"
)

// EventsHandler handles event retrieval requests
type EventsHandler struct {
	repo database.EventStore
}

// NewEventsHandler creates a new events handler
func NewEventsHandler(repo database.EventStore) *EventsHandler {
	return &EventsHandler{repo: repo}
}

// EventsResponse wraps events with pagination metadata
type EventsResponse struct {
	Events     []models.DashboardEvent `json:"events"`
	Pagination PaginationMeta          `json:"pagination"`
}

// PaginationMeta contains pagination information
type PaginationMeta struct {
	Limit   int  `json:"limit"`
	Offset  int  `json:"offset"`
	Total   int  `json:"total"`
	HasMore bool `json:"hasMore"`
}

// generateETag creates an ETag based on events content
func generateETag(events []models.DashboardEvent, total int) string {
	// Generate ETag from latest event timestamp + total count
	var latestTimestamp string
	if len(events) > 0 {
		latestTimestamp = events[0].CreatedAt.Format(time.RFC3339Nano)
	}
	hash := md5.Sum([]byte(fmt.Sprintf("%s-%d-%d", latestTimestamp, total, len(events))))
	return fmt.Sprintf(`"%x"`, hash)
}

// ServeHTTP handles the events request with ETag support
func (h *EventsHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	log := logger.FromContext(r.Context())

	// Parse query parameters
	filter := parseEventsFilter(r)

	log.Debug().
		Int("limit", filter.Limit).
		Int("offset", filter.Offset).
		Str("event_type", filter.EventType).
		Msg("retrieving events")

	events, total, err := h.repo.GetEventsWithFilters(filter)
	if err != nil {
		log.Error().Err(err).Msg("failed to retrieve events")
		http.Error(w, "Failed to retrieve events", http.StatusInternalServerError)
		return
	}

	// Generate ETag and check If-None-Match
	etag := generateETag(events, total)
	if match := r.Header.Get("If-None-Match"); match == etag {
		log.Debug().Str("etag", etag).Msg("ETag matched, returning 304")
		w.WriteHeader(http.StatusNotModified)
		return
	}

	response := EventsResponse{
		Events: events,
		Pagination: PaginationMeta{
			Limit:   filter.Limit,
			Offset:  filter.Offset,
			Total:   total,
			HasMore: filter.Offset+len(events) < total,
		},
	}

	log.Debug().
		Int("count", len(events)).
		Int("total", total).
		Str("etag", etag).
		Msg("events retrieved")

	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("ETag", etag)
	w.Header().Set("Cache-Control", "private, max-age=5")
	json.NewEncoder(w).Encode(response)
}

// parseEventsFilter extracts filter parameters from query string
func parseEventsFilter(r *http.Request) models.EventsFilter {
	filter := models.EventsFilter{
		Limit:  50, // default
		Offset: 0,  // default
	}

	if limitStr := r.URL.Query().Get("limit"); limitStr != "" {
		if limit, err := strconv.Atoi(limitStr); err == nil && limit > 0 {
			if limit > 500 {
				limit = 500 // max limit
			}
			filter.Limit = limit
		}
	}

	if offsetStr := r.URL.Query().Get("offset"); offsetStr != "" {
		if offset, err := strconv.Atoi(offsetStr); err == nil && offset >= 0 {
			filter.Offset = offset
		}
	}

	if eventType := r.URL.Query().Get("type"); eventType != "" {
		filter.EventType = eventType
	}

	if sinceStr := r.URL.Query().Get("since"); sinceStr != "" {
		if since, err := time.Parse("2006-01-02", sinceStr); err == nil {
			filter.Since = since
		} else if since, err := time.Parse(time.RFC3339, sinceStr); err == nil {
			filter.Since = since
		}
	}

	return filter
}
