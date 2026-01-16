package database

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"strings"
	"time"

	"heimdall-backend/models"

	"github.com/rs/zerolog/log"
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
	// Note: whereClause is safely constructed from validated conditions with parameterized args
	countQuery := "SELECT COUNT(*) FROM events " + whereClause // #nosec G201
	countArgs := make([]interface{}, len(args))
	copy(countArgs, args)

	total, countErr := WithRetry(ctx, DefaultRetryConfig, func() (int, error) {
		var count int
		if err := r.db.QueryRowContext(ctx, countQuery, countArgs...).Scan(&count); err != nil {
			return 0, err
		}
		return count, nil
	})
	if countErr != nil {
		return nil, 0, fmt.Errorf("failed to count events: %w", countErr)
	}

	// Get events with pagination and retry
	// Note: whereClause is safely constructed from validated conditions with parameterized args
	query := fmt.Sprintf(`
		SELECT id, event_type, title, metadata, created_at
		FROM events
		%s
		ORDER BY created_at DESC
		LIMIT $%d OFFSET $%d
	`, whereClause, argIndex, argIndex+1) // #nosec G201

	args = append(args, filter.Limit, filter.Offset)

	events, queryErr := WithRetry(ctx, DefaultRetryConfig, func() ([]models.DashboardEvent, error) {
		rows, err := r.db.QueryContext(ctx, query, args...)
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
	if queryErr != nil {
		return nil, 0, fmt.Errorf("failed to query events: %w", queryErr)
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
	if unmarshalErr := json.Unmarshal(servicesJSON, &serviceResults); unmarshalErr != nil {
		log.Warn().Err(unmarshalErr).Msg("failed to parse service counts JSON")
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
	if unmarshalErr := json.Unmarshal(categoriesJSON, &categoryResults); unmarshalErr != nil {
		log.Warn().Err(unmarshalErr).Msg("failed to parse category counts JSON")
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

	// Check for errors from iteration
	if err := dailyRows.Err(); err != nil {
		return stats, fmt.Errorf("error iterating daily rows: %w", err)
	}

	return stats, nil
}

// GetYearlyDailyStats retrieves daily counts for the past 365 days
func (r *EventRepository) GetYearlyDailyStats() ([]models.DailyCount, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	return WithRetry(ctx, DefaultRetryConfig, func() ([]models.DailyCount, error) {
		query := `
			SELECT
				TO_CHAR(DATE(created_at), 'YYYY-MM-DD') as date,
				COUNT(*) as count
			FROM events
			WHERE created_at >= NOW() - INTERVAL '365 days'
			GROUP BY DATE(created_at)
			ORDER BY DATE(created_at) ASC
		`
		rows, err := r.db.QueryContext(ctx, query)
		if err != nil {
			return nil, fmt.Errorf("failed to query yearly stats: %w", err)
		}
		defer rows.Close()

		results := make([]models.DailyCount, 0, 365)
		for rows.Next() {
			var dc models.DailyCount
			if err := rows.Scan(&dc.Date, &dc.Count); err != nil {
				return nil, fmt.Errorf("failed to scan yearly row: %w", err)
			}
			results = append(results, dc)
		}

		if err := rows.Err(); err != nil {
			return nil, fmt.Errorf("error iterating yearly rows: %w", err)
		}

		return results, nil
	})
}

// CalculateStreak calculates the current and longest streak of consecutive days with activity
func (r *EventRepository) CalculateStreak() (models.StreakInfo, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	return WithRetry(ctx, DefaultRetryConfig, func() (models.StreakInfo, error) {
		// Get all distinct dates with events, ordered descending
		query := `
			SELECT DISTINCT DATE(created_at) as event_date
			FROM events
			ORDER BY event_date DESC
		`
		rows, err := r.db.QueryContext(ctx, query)
		if err != nil {
			return models.StreakInfo{}, fmt.Errorf("failed to query dates for streak: %w", err)
		}
		defer rows.Close()

		var dates []time.Time
		for rows.Next() {
			var date time.Time
			if err := rows.Scan(&date); err != nil {
				return models.StreakInfo{}, fmt.Errorf("failed to scan date: %w", err)
			}
			dates = append(dates, date)
		}

		if err := rows.Err(); err != nil {
			return models.StreakInfo{}, fmt.Errorf("error iterating dates: %w", err)
		}

		if len(dates) == 0 {
			return models.StreakInfo{}, nil
		}

		streak := models.StreakInfo{
			LastActiveDate: dates[0].Format("2006-01-02"),
		}

		// Calculate current streak (consecutive days from today or yesterday)
		today := time.Now().UTC().Truncate(24 * time.Hour)
		yesterday := today.AddDate(0, 0, -1)

		currentStreak := 0
		longestStreak := 0
		tempStreak := 1

		for i, date := range dates {
			dateOnly := date.Truncate(24 * time.Hour)

			// For current streak: must start from today or yesterday
			if i == 0 {
				if dateOnly.Equal(today) || dateOnly.Equal(yesterday) {
					currentStreak = 1
				}
			}

			if i > 0 {
				prevDate := dates[i-1].Truncate(24 * time.Hour)
				diff := prevDate.Sub(dateOnly).Hours() / 24

				if diff == 1 {
					// Consecutive day
					tempStreak++
					if currentStreak > 0 && i < len(dates) {
						currentStreak++
					}
				} else {
					// Gap found
					if tempStreak > longestStreak {
						longestStreak = tempStreak
					}
					tempStreak = 1
					if currentStreak > 0 {
						// Current streak is broken, save it
						if currentStreak > longestStreak {
							longestStreak = currentStreak
						}
						currentStreak = 0
					}
				}
			}
		}

		// Check final streak
		if tempStreak > longestStreak {
			longestStreak = tempStreak
		}
		if currentStreak > longestStreak {
			longestStreak = currentStreak
		}

		streak.CurrentStreak = currentStreak
		streak.LongestStreak = longestStreak

		return streak, nil
	})
}

// GetMonthlyStats retrieves aggregate statistics for a specific month
func (r *EventRepository) GetMonthlyStats(year int, month int) (models.MonthlyStats, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	return WithRetry(ctx, DefaultRetryConfig, func() (models.MonthlyStats, error) {
		monthStart := time.Date(year, time.Month(month), 1, 0, 0, 0, 0, time.UTC)
		monthEnd := monthStart.AddDate(0, 1, 0)

		stats := models.MonthlyStats{
			Year:              year,
			Month:             month,
			MonthName:         monthStart.Format("January"),
			CategoryBreakdown: make(map[string]int),
			TopServices:       []models.ServiceCount{},
			EventsPerDay:      []models.DailyCount{},
		}

		// Get total events and daily counts for the month
		dailyQuery := `
			SELECT
				TO_CHAR(DATE(created_at), 'YYYY-MM-DD') as date,
				COUNT(*) as count
			FROM events
			WHERE created_at >= $1 AND created_at < $2
			GROUP BY DATE(created_at)
			ORDER BY DATE(created_at) ASC
		`
		dailyRows, err := r.db.QueryContext(ctx, dailyQuery, monthStart, monthEnd)
		if err != nil {
			return stats, fmt.Errorf("failed to query monthly daily counts: %w", err)
		}
		defer dailyRows.Close()

		totalEvents := 0
		var busiestDay models.DailyCount
		for dailyRows.Next() {
			var dc models.DailyCount
			if err := dailyRows.Scan(&dc.Date, &dc.Count); err != nil {
				return stats, fmt.Errorf("failed to scan daily row: %w", err)
			}
			stats.EventsPerDay = append(stats.EventsPerDay, dc)
			totalEvents += dc.Count
			if dc.Count > busiestDay.Count {
				busiestDay = dc
			}
		}
		if err := dailyRows.Err(); err != nil {
			return stats, fmt.Errorf("error iterating daily rows: %w", err)
		}

		stats.TotalEvents = totalEvents
		stats.BusiestDay = busiestDay

		// Calculate daily average
		daysInMonth := monthEnd.Sub(monthStart).Hours() / 24
		if daysInMonth > 0 {
			stats.DailyAverage = float64(totalEvents) / daysInMonth
		}

		// Get top services
		serviceQuery := `
			SELECT
				SPLIT_PART(event_type, '.', 1) as service,
				COUNT(*) as count
			FROM events
			WHERE created_at >= $1 AND created_at < $2
			GROUP BY 1
			ORDER BY count DESC
			LIMIT 5
		`
		serviceRows, err := r.db.QueryContext(ctx, serviceQuery, monthStart, monthEnd)
		if err != nil {
			return stats, fmt.Errorf("failed to query service counts: %w", err)
		}
		defer serviceRows.Close()

		for serviceRows.Next() {
			var sc models.ServiceCount
			if err := serviceRows.Scan(&sc.Service, &sc.Count); err != nil {
				return stats, fmt.Errorf("failed to scan service row: %w", err)
			}
			stats.TopServices = append(stats.TopServices, sc)
		}
		if err := serviceRows.Err(); err != nil {
			return stats, fmt.Errorf("error iterating service rows: %w", err)
		}

		// Get category breakdown
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
			WHERE created_at >= $1 AND created_at < $2
			GROUP BY 1
		`
		catRows, err := r.db.QueryContext(ctx, categoryQuery, monthStart, monthEnd)
		if err != nil {
			return stats, fmt.Errorf("failed to query category counts: %w", err)
		}
		defer catRows.Close()

		for catRows.Next() {
			var cat string
			var count int
			if err := catRows.Scan(&cat, &count); err != nil {
				return stats, fmt.Errorf("failed to scan category row: %w", err)
			}
			stats.CategoryBreakdown[cat] = count
		}
		if err := catRows.Err(); err != nil {
			return stats, fmt.Errorf("error iterating category rows: %w", err)
		}

		return stats, nil
	})
}

// InsertEvent inserts a new event into the database
func (r *EventRepository) InsertEvent(event *models.DashboardEvent) error {
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
