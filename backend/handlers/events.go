package handlers

import (
	"encoding/json"
	"errors"
	"fmt"
	"hash/fnv"
	"net/http"
	"strconv"
	"strings"
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
	NextCursor *NextCursor `json:"next_cursor"`
	Limit      int         `json:"limit"`
	Offset     int         `json:"offset"`
	Total      int         `json:"total"`
	HasMore    bool        `json:"hasMore"`
}

// NextCursor is the (created_at, id) position to pass as before/before_id for the next page
type NextCursor struct {
	Before   string `json:"before"`
	BeforeID string `json:"before_id"`
}

const (
	defaultEventsLimit = 50
	maxEventsLimit     = 500
)

// generateETag creates an ETag from the first event's timestamp, the last event's
// id, the total, the page size and the number of private rows, using an FNV hash.
// The private count makes flipping is_private invalidate cached pages.
func generateETag(events []models.DashboardEvent, total int) string {
	var firstTimestamp, lastID string
	privateRows := 0
	for i := range events {
		if events[i].IsPrivate {
			privateRows++
		}
	}
	if len(events) > 0 {
		firstTimestamp = events[0].CreatedAt.Format(time.RFC3339Nano)
		lastID = events[len(events)-1].ID
	}
	hasher := fnv.New64a()
	//nolint:errcheck // hash.Hash writes never fail
	fmt.Fprintf(hasher, "%s-%s-%d-%d-%d", firstTimestamp, lastID, total, len(events), privateRows)
	return fmt.Sprintf(`"%x"`, hasher.Sum64())
}

// etagMatches checks if the If-None-Match header matches the given ETag.
// Handles multiple ETags (comma-separated), weak validators (W/"...") and the wildcard (*).
func etagMatches(header, etag string) bool {
	if strings.TrimSpace(header) == "*" {
		return true
	}

	etagValue := strings.Trim(strings.TrimPrefix(etag, "W/"), `"`)
	for _, candidate := range strings.Split(header, ",") {
		candidate = strings.TrimSpace(candidate)
		candidate = strings.TrimPrefix(candidate, "W/")
		if len(candidate) >= 2 && candidate[0] == '"' && candidate[len(candidate)-1] == '"' {
			candidate = candidate[1 : len(candidate)-1]
		}
		if candidate == etagValue {
			return true
		}
	}
	return false
}

// ServeHTTP handles the events request with ETag support
func (h *EventsHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	log := logger.FromContext(r.Context())

	filter, err := parseEventsFilter(r)
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	limit := filter.Limit
	hasCursor := !filter.Before.IsZero()

	log.Debug().
		Int("limit", limit).
		Int("offset", filter.Offset).
		Bool("cursor", hasCursor).
		Str("event_type", filter.EventType).
		Msg("retrieving events")

	// Fetch one extra row to learn whether another page exists.
	fetchFilter := filter
	fetchFilter.Limit = limit + 1
	events, total, err := h.repo.GetEventsWithFilters(r.Context(), &fetchFilter)
	if err != nil {
		log.Error().Err(err).Msg("failed to retrieve events")
		http.Error(w, "Failed to retrieve events", http.StatusInternalServerError)
		return
	}
	hasMore := len(events) > limit
	if hasMore {
		events = events[:limit]
	}
	if !hasCursor && filter.Offset+len(events) < total {
		hasMore = true
	}

	etag := generateETag(events, total)
	if match := r.Header.Get("If-None-Match"); match != "" {
		if etagMatches(match, etag) {
			log.Debug().Str("etag", etag).Msg("ETag matched, returning 304")
			w.Header().Set("ETag", etag)
			w.WriteHeader(http.StatusNotModified)
			return
		}
	}

	meta := PaginationMeta{
		Limit:   limit,
		Offset:  filter.Offset,
		Total:   total,
		HasMore: hasMore,
	}
	if hasCursor {
		meta.Offset = 0
	}
	if hasMore && len(events) > 0 {
		last := events[len(events)-1]
		meta.NextCursor = &NextCursor{
			Before:   last.CreatedAt.UTC().Format(time.RFC3339Nano),
			BeforeID: last.ID,
		}
	}

	response := EventsResponse{
		Events:     redactEvents(events),
		Pagination: meta,
	}

	// Marshal before writing so an encode failure becomes a 500, not an empty 200.
	body, err := json.Marshal(response)
	if err != nil {
		log.Error().Err(err).Msg("failed to encode events response")
		http.Error(w, "Failed to encode events", http.StatusInternalServerError)
		return
	}

	log.Debug().
		Int("count", len(events)).
		Int("total", total).
		Str("etag", etag).
		Msg("events retrieved")

	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("ETag", etag)
	w.Header().Set("Cache-Control", "private, max-age=5")
	if _, err := w.Write(body); err != nil {
		log.Warn().Err(err).Msg("failed to write events response")
	}
}

// parseEventsFilter extracts filter parameters from the query string.
// It returns an error for an incomplete or malformed cursor.
func parseEventsFilter(r *http.Request) (models.EventsFilter, error) {
	q := r.URL.Query()
	filter := models.EventsFilter{
		Limit:  defaultEventsLimit,
		Offset: 0,
	}

	if limit, err := strconv.Atoi(q.Get("limit")); err == nil && limit > 0 {
		if limit > maxEventsLimit {
			limit = maxEventsLimit
		}
		filter.Limit = limit
	}

	if offset, err := strconv.Atoi(q.Get("offset")); err == nil && offset >= 0 {
		filter.Offset = offset
	}

	filter.EventType = q.Get("type")

	if sinceStr := q.Get("since"); sinceStr != "" {
		if since, err := time.Parse("2006-01-02", sinceStr); err == nil {
			filter.Since = since
		} else if since, err := time.Parse(time.RFC3339, sinceStr); err == nil {
			filter.Since = since
		}
	}

	beforeStr, beforeID := q.Get("before"), q.Get("before_id")
	if (beforeStr == "") != (beforeID == "") {
		return filter, errors.New("before and before_id must be provided together")
	}
	if beforeStr != "" {
		before, err := time.Parse(time.RFC3339Nano, beforeStr)
		if err != nil {
			return filter, errors.New("before must be an RFC3339 timestamp")
		}
		filter.Before = before.UTC()
		filter.BeforeID = beforeID
	}

	return filter, nil
}
