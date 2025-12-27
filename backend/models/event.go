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
