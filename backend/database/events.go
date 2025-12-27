package database

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"strings"

	"heimdall-backend/models"
)

// EventRepository handles database operations for events
type EventRepository struct {
	db *sql.DB
}

// NewEventRepository creates a new event repository
func NewEventRepository(db *sql.DB) *EventRepository {
	return &EventRepository{db: db}
}

// GetRecentEvents retrieves the most recent events from the database
func (r *EventRepository) GetRecentEvents(limit int) ([]models.DashboardEvent, error) {
	filter := models.EventsFilter{Limit: limit}
	events, _, err := r.GetEventsWithFilters(filter)
	return events, err
}

// GetEventsWithFilters retrieves events with pagination and filtering
func (r *EventRepository) GetEventsWithFilters(filter models.EventsFilter) ([]models.DashboardEvent, int, error) {
	if filter.Limit <= 0 {
		filter.Limit = 50
	}
	if filter.Limit > 500 {
		filter.Limit = 500
	}

	// Build WHERE clause dynamically
	var conditions []string
	var args []interface{}
	argIndex := 1

	if filter.EventType != "" {
		conditions = append(conditions, fmt.Sprintf("event_type = $%d", argIndex))
		args = append(args, filter.EventType)
		argIndex++
	}

	if !filter.Since.IsZero() {
		conditions = append(conditions, fmt.Sprintf("created_at >= $%d", argIndex))
		args = append(args, filter.Since)
		argIndex++
	}

	whereClause := ""
	if len(conditions) > 0 {
		whereClause = "WHERE " + strings.Join(conditions, " AND ")
	}

	// Get total count
	countQuery := fmt.Sprintf("SELECT COUNT(*) FROM events %s", whereClause)
	var total int
	if err := r.db.QueryRow(countQuery, args...).Scan(&total); err != nil {
		return nil, 0, fmt.Errorf("failed to count events: %w", err)
	}

	// Get events with pagination
	query := fmt.Sprintf(`
		SELECT id, event_type, title, metadata, created_at
		FROM events
		%s
		ORDER BY created_at DESC
		LIMIT $%d OFFSET $%d
	`, whereClause, argIndex, argIndex+1)

	args = append(args, filter.Limit, filter.Offset)

	rows, err := r.db.Query(query, args...)
	if err != nil {
		return nil, 0, fmt.Errorf("failed to query events: %w", err)
	}
	defer rows.Close()

	var events []models.DashboardEvent
	for rows.Next() {
		var event models.DashboardEvent
		var metadataBytes []byte

		err := rows.Scan(&event.ID, &event.EventType, &event.Title, &metadataBytes, &event.CreatedAt)
		if err != nil {
			return nil, 0, fmt.Errorf("failed to scan event row: %w", err)
		}

		if metadataBytes != nil {
			if err := json.Unmarshal(metadataBytes, &event.Metadata); err != nil {
				event.Metadata = make(map[string]interface{})
			}
		}

		events = append(events, event)
	}

	if err := rows.Err(); err != nil {
		return nil, 0, fmt.Errorf("error iterating event rows: %w", err)
	}

	return events, total, nil
}

// GetStats retrieves aggregate statistics for all events
func (r *EventRepository) GetStats() (models.EventStats, error) {
	stats := models.EventStats{
		CategoryCounts: make(map[string]int),
		ServiceCounts:  make(map[string]int),
		EventsPerDay:   []models.DailyCount{},
	}

	// Get total event count
	if err := r.db.QueryRow("SELECT COUNT(*) FROM events").Scan(&stats.TotalEvents); err != nil {
		return stats, fmt.Errorf("failed to count total events: %w", err)
	}

	// Get events in last 24 hours
	query24h := "SELECT COUNT(*) FROM events WHERE created_at >= NOW() - INTERVAL '24 hours'"
	if err := r.db.QueryRow(query24h).Scan(&stats.Last24Hours); err != nil {
		return stats, fmt.Errorf("failed to count last 24h events: %w", err)
	}

	// Get events in last week
	queryWeek := "SELECT COUNT(*) FROM events WHERE created_at >= NOW() - INTERVAL '7 days'"
	if err := r.db.QueryRow(queryWeek).Scan(&stats.LastWeek); err != nil {
		return stats, fmt.Errorf("failed to count last week events: %w", err)
	}

	// Get counts by service (extracted from event_type prefix)
	serviceQuery := `
		SELECT
			SPLIT_PART(event_type, '.', 1) as service,
			COUNT(*) as count
		FROM events
		GROUP BY SPLIT_PART(event_type, '.', 1)
	`
	serviceRows, err := r.db.Query(serviceQuery)
	if err != nil {
		return stats, fmt.Errorf("failed to query service counts: %w", err)
	}
	defer serviceRows.Close()

	for serviceRows.Next() {
		var service string
		var count int
		if err := serviceRows.Scan(&service, &count); err != nil {
			return stats, fmt.Errorf("failed to scan service row: %w", err)
		}
		stats.ServiceCounts[service] = count
	}

	// Get counts by category (mapped from event_type)
	// Categories: development (github.push, github.pr, github.release), deployments (vercel, railway),
	// issues (github.issue, error.*), security (security.*), infrastructure (monitoring.*)
	categoryQuery := `
		SELECT
			CASE
				WHEN event_type LIKE 'github.push%' OR event_type LIKE 'github.pr%' OR event_type LIKE 'github.release%' THEN 'development'
				WHEN event_type LIKE 'vercel.%' OR event_type LIKE 'railway.%' THEN 'deployments'
				WHEN event_type LIKE 'github.issue%' OR event_type LIKE 'error.%' THEN 'issues'
				WHEN event_type LIKE 'security.%' THEN 'security'
				WHEN event_type LIKE 'monitoring.%' THEN 'infrastructure'
				ELSE 'development'
			END as category,
			COUNT(*) as count
		FROM events
		GROUP BY category
	`
	categoryRows, err := r.db.Query(categoryQuery)
	if err != nil {
		return stats, fmt.Errorf("failed to query category counts: %w", err)
	}
	defer categoryRows.Close()

	for categoryRows.Next() {
		var category string
		var count int
		if err := categoryRows.Scan(&category, &count); err != nil {
			return stats, fmt.Errorf("failed to scan category row: %w", err)
		}
		stats.CategoryCounts[category] = count
	}

	// Get events per day for last 30 days
	dailyQuery := `
		SELECT
			DATE(created_at) as date,
			COUNT(*) as count
		FROM events
		WHERE created_at >= NOW() - INTERVAL '30 days'
		GROUP BY DATE(created_at)
		ORDER BY date ASC
	`
	dailyRows, err := r.db.Query(dailyQuery)
	if err != nil {
		return stats, fmt.Errorf("failed to query daily counts: %w", err)
	}
	defer dailyRows.Close()

	for dailyRows.Next() {
		var dc models.DailyCount
		var date string
		if err := dailyRows.Scan(&date, &dc.Count); err != nil {
			return stats, fmt.Errorf("failed to scan daily row: %w", err)
		}
		dc.Date = date
		stats.EventsPerDay = append(stats.EventsPerDay, dc)
	}

	return stats, nil
}

// InsertEvent inserts a new event into the database
func (r *EventRepository) InsertEvent(event models.DashboardEvent) error {
	metadataJSON, err := json.Marshal(event.Metadata)
	if err != nil {
		return fmt.Errorf("failed to marshal metadata: %w", err)
	}

	query := `
		INSERT INTO events (event_type, title, metadata, created_at)
		VALUES ($1, $2, $3, $4)
	`

	// Use the event's CreatedAt timestamp (set by transformer from webhook timestamp)
	_, err = r.db.Exec(query, event.EventType, event.Title, metadataJSON, event.CreatedAt)
	if err != nil {
		return fmt.Errorf("failed to insert event: %w", err)
	}

	return nil
}
