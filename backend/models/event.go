package models

import (
	"encoding/json"
	"time"
)

// QStashPayload represents the payload structure from QStash
type QStashPayload struct {
	EventType string          `json:"type"`
	Timestamp int64           `json:"timestamp"`
	Event     json.RawMessage `json:"event"`
}

// DashboardEvent represents a processed event for the dashboard
type DashboardEvent struct {
	CreatedAt time.Time              `json:"created_at"`
	Metadata  map[string]interface{} `json:"metadata"`
	ID        string                 `json:"id"`
	EventType string                 `json:"event_type"`
	Title     string                 `json:"title"`
}

// EventsFilter contains parameters for filtering events
type EventsFilter struct {
	Since     time.Time // Filter events after this time (optional)
	EventType string    // Filter by event type (optional)
	Limit     int       // Max events to return (default 50, max 500)
	Offset    int       // Pagination offset (default 0)
}

// EventStats contains aggregate statistics for events
type EventStats struct {
	CategoryCounts map[string]int `json:"category_counts"`
	ServiceCounts  map[string]int `json:"service_counts"`
	EventsPerDay   []DailyCount   `json:"events_per_day"`
	EventsPerYear  []DailyCount   `json:"events_per_year,omitempty"`
	Streak         StreakInfo     `json:"streak"`
	TotalEvents    int            `json:"total_events"`
	Last24Hours    int            `json:"last_24_hours"`
	LastWeek       int            `json:"last_week"`
}

// DailyCount represents event count for a specific date
type DailyCount struct {
	Date  string `json:"date"`
	Count int    `json:"count"`
}

// StreakInfo contains streak tracking data
type StreakInfo struct {
	CurrentStreak  int    `json:"current_streak"`
	LongestStreak  int    `json:"longest_streak"`
	LastActiveDate string `json:"last_active_date"`
}

// ServiceCount represents event count for a specific service
type ServiceCount struct {
	Service string `json:"service"`
	Count   int    `json:"count"`
}

// MonthlyStats contains aggregate statistics for a specific month
type MonthlyStats struct {
	Year              int            `json:"year"`
	Month             int            `json:"month"`
	MonthName         string         `json:"month_name"`
	TotalEvents       int            `json:"total_events"`
	DailyAverage      float64        `json:"daily_average"`
	BusiestDay        DailyCount     `json:"busiest_day"`
	TopServices       []ServiceCount `json:"top_services"`
	EventsPerDay      []DailyCount   `json:"events_per_day"`
	CategoryBreakdown map[string]int `json:"category_breakdown"`
}
