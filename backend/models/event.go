package models

import (
	"encoding/json"
	"time"
)

// QStashPayload represents the payload structure from QStash
type QStashPayload struct {
	Event     json.RawMessage `json:"event"`
	EventType string          `json:"type"`
	Timestamp int64           `json:"timestamp"`
}

// DashboardEvent represents a processed event for the dashboard
type DashboardEvent struct {
	ID        string                 `json:"id"`
	EventType string                 `json:"event_type"`
	Title     string                 `json:"title"`
	Metadata  map[string]interface{} `json:"metadata"`
	CreatedAt time.Time              `json:"created_at"`
}

// EventsFilter contains parameters for filtering events
type EventsFilter struct {
	Limit     int       // Max events to return (default 50, max 500)
	Offset    int       // Pagination offset (default 0)
	EventType string    // Filter by event type (optional)
	Since     time.Time // Filter events after this time (optional)
}
