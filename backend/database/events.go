package database

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"time"

	"github.com/roe/heimdall/models"
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
	if limit <= 0 {
		limit = 50
	}

	query := `
		SELECT id, event_type, title, metadata, created_at
		FROM events
		ORDER BY created_at DESC
		LIMIT $1
	`

	rows, err := r.db.Query(query, limit)
	if err != nil {
		return nil, fmt.Errorf("failed to query events: %w", err)
	}
	defer rows.Close()

	var events []models.DashboardEvent
	for rows.Next() {
		var event models.DashboardEvent
		var metadataBytes []byte

		err := rows.Scan(&event.ID, &event.EventType, &event.Title, &metadataBytes, &event.CreatedAt)
		if err != nil {
			return nil, fmt.Errorf("failed to scan event row: %w", err)
		}

		if metadataBytes != nil {
			if err := json.Unmarshal(metadataBytes, &event.Metadata); err != nil {
				event.Metadata = make(map[string]interface{})
			}
		}

		events = append(events, event)
	}

	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("error iterating event rows: %w", err)
	}

	return events, nil
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

	_, err = r.db.Exec(query, event.EventType, event.Title, metadataJSON, time.Now().UTC())
	if err != nil {
		return fmt.Errorf("failed to insert event: %w", err)
	}

	return nil
}
