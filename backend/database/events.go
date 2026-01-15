package database

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"strings"
	"time"

	"github.com/rs/zerolog/log"
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

	// Create context with timeout for retry operations
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	// Get total count with retry
	countQuery := fmt.Sprintf("SELECT COUNT(*) FROM events %s", whereClause)
	countArgs := make([]interface{}, len(args))
	copy(countArgs, args)

	total, err := WithRetry(ctx, DefaultRetryConfig, func() (int, error) {
		var count int
		err := r.db.QueryRowContext(ctx, countQuery, countArgs...).Scan(&count)
		return count, err
	})
	if err != nil {
		return nil, 0, fmt.Errorf("failed to count events: %w", err)
	}

	// Get events with pagination and retry
	query := fmt.Sprintf(`
		SELECT id, event_type, title, metadata, created_at
		FROM events
		%s
		ORDER BY created_at DESC
		LIMIT $%d OFFSET $%d
	`, whereClause, argIndex, argIndex+1)

	queryArgs := append(args, filter.Limit, filter.Offset)

	events, err := WithRetry(ctx, DefaultRetryConfig, func() ([]models.DashboardEvent, error) {
		rows, err := r.db.QueryContext(ctx, query, queryArgs...)
		if err != nil {
			return nil, err
		}
		defer rows.Close()

		// Pre-allocate results slice to avoid growth allocations
		results := make([]models.DashboardEvent, 0, filter.Limit)
		for rows.Next() {
			var event models.DashboardEvent
			var metadataBytes []byte

			err := rows.Scan(&event.ID, &event.EventType, &event.Title, &metadataBytes, &event.CreatedAt)
			if err != nil {
				return nil, fmt.Errorf("failed to scan event row: %w", err)
			}

			if metadataBytes != nil {
				if err := json.Unmarshal(metadataBytes, &event.Metadata); err != nil {
					log.Warn().
						Str("event_id", event.ID).
						Err(err).
						Msg("failed to unmarshal event metadata, using empty metadata")
					event.Metadata = make(map[string]interface{})
				}
			}

			results = append(results, event)
		}

		if err := rows.Err(); err != nil {
			return nil, err
		}

		return results, nil
	})
	if err != nil {
		return nil, 0, fmt.Errorf("failed to query events: %w", err)
	}

	return events, total, nil
}

// GetStats retrieves aggregate statistics for all events
func (r *EventRepository) GetStats() (models.EventStats, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	return WithRetry(ctx, DefaultRetryConfig, func() (models.EventStats, error) {
		return r.getStatsInternal(ctx)
	})
}

// getStatsInternal performs the actual stats retrieval using consolidated queries
// This uses CTEs to reduce database roundtrips from 6 to 2
func (r *EventRepository) getStatsInternal(ctx context.Context) (models.EventStats, error) {
	stats := models.EventStats{
		CategoryCounts: make(map[string]int),
		ServiceCounts:  make(map[string]int),
		EventsPerDay:   []models.DailyCount{},
	}

	// Consolidated query for counts, services, and categories using CTEs
	// This reduces 5 separate queries into 1
	consolidatedQuery := `
		WITH counts AS (
			SELECT
				COUNT(*) as total,
				COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '24 hours') as last_24h,
				COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '7 days') as last_week
			FROM events
		),
		service_counts AS (
			SELECT
				SPLIT_PART(event_type, '.', 1) as service,
				COUNT(*) as count
			FROM events
			GROUP BY 1
		),
		category_counts AS (
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
			GROUP BY 1
		)
		SELECT
			c.total,
			c.last_24h,
			c.last_week,
			COALESCE((SELECT json_agg(json_build_object('service', service, 'count', count)) FROM service_counts), '[]'::json) as services,
			COALESCE((SELECT json_agg(json_build_object('category', category, 'count', count)) FROM category_counts), '[]'::json) as categories
		FROM counts c
	`

	var total, last24h, lastWeek int
	var servicesJSON, categoriesJSON []byte

	err := r.db.QueryRowContext(ctx, consolidatedQuery).Scan(
		&total, &last24h, &lastWeek, &servicesJSON, &categoriesJSON,
	)
	if err != nil {
		return stats, fmt.Errorf("failed to query consolidated stats: %w", err)
	}

	stats.TotalEvents = total
	stats.Last24Hours = last24h
	stats.LastWeek = lastWeek

	// Parse service counts from JSON
	var serviceResults []struct {
		Service string `json:"service"`
		Count   int    `json:"count"`
	}
	if err := json.Unmarshal(servicesJSON, &serviceResults); err != nil {
		log.Warn().Err(err).Msg("failed to parse service counts JSON")
	} else {
		for _, s := range serviceResults {
			stats.ServiceCounts[s.Service] = s.Count
		}
	}

	// Parse category counts from JSON
	var categoryResults []struct {
		Category string `json:"category"`
		Count    int    `json:"count"`
	}
	if err := json.Unmarshal(categoriesJSON, &categoryResults); err != nil {
		log.Warn().Err(err).Msg("failed to parse category counts JSON")
	} else {
		for _, c := range categoryResults {
			stats.CategoryCounts[c.Category] = c.Count
		}
	}

	// Get events per day for last 30 days (separate query as it returns multiple rows)
	dailyQuery := `
		SELECT
			TO_CHAR(DATE(created_at), 'YYYY-MM-DD') as date,
			COUNT(*) as count
		FROM events
		WHERE created_at >= NOW() - INTERVAL '30 days'
		GROUP BY DATE(created_at)
		ORDER BY DATE(created_at) ASC
	`
	dailyRows, err := r.db.QueryContext(ctx, dailyQuery)
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

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	query := `
		INSERT INTO events (event_type, title, metadata, created_at)
		VALUES ($1, $2, $3, $4)
	`

	// Use the event's CreatedAt timestamp (set by transformer from webhook timestamp)
	return WithRetryNoResult(ctx, DefaultRetryConfig, func() error {
		_, err := r.db.ExecContext(ctx, query, event.EventType, event.Title, metadataJSON, event.CreatedAt)
		if err != nil {
			return fmt.Errorf("failed to insert event: %w", err)
		}
		return nil
	})
}
