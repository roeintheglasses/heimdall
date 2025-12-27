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
