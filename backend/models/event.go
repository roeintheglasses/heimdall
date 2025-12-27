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

// EventStats contains aggregate statistics for events
type EventStats struct {
	TotalEvents     int            `json:"total_events"`
	CategoryCounts  map[string]int `json:"category_counts"`
	ServiceCounts   map[string]int `json:"service_counts"`
	Last24Hours     int            `json:"last_24_hours"`
	LastWeek        int            `json:"last_week"`
	EventsPerDay    []DailyCount   `json:"events_per_day"`
}

// DailyCount represents event count for a specific date
type DailyCount struct {
	Date  string `json:"date"`
	Count int    `json:"count"`
}
