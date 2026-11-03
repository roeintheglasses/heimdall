package database

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"sort"
	"strings"
	"time"

	"heimdall-backend/logger"
	"heimdall-backend/models"
)

// queryTimeout bounds every repository call, including retries.
const queryTimeout = 10 * time.Second

// MaxEventsPageSize is the largest page the repository returns. The handler asks
// for one row more than the client limit (500) to detect whether more rows exist.
const MaxEventsPageSize = 501

// notHiddenRepoCondition excludes events that belong to a repo with hidden=true
// in repo_settings. An event matches by metadata full_name, or by the short repo
// name when the row has no full_name (events stored before full_name existed).
// Only the list query and its count use it. Aggregates keep counting everything.
const notHiddenRepoCondition = `NOT EXISTS (
		SELECT 1 FROM repo_settings rs
		WHERE rs.hidden
		AND (
			events.metadata->>'full_name' = rs.full_name
			OR (
				COALESCE(events.metadata->>'full_name', '') = ''
				AND events.metadata->>'repo' = split_part(rs.full_name, '/', 2)
			)
		)
	)`

// EventRepository handles database operations for events
type EventRepository struct {
	db *sql.DB
}

// NewEventRepository creates a new event repository
func NewEventRepository(db *sql.DB) *EventRepository {
	return &EventRepository{db: db}
}

// closeQuietly closes c and logs a failure; deferred cleanup has no caller to report to.
func closeQuietly(ctx context.Context, c io.Closer) {
	if err := c.Close(); err != nil {
		logger.FromContext(ctx).Warn().Err(err).Msg("failed to close database rows")
	}
}

// GetRecentEvents retrieves the most recent events from the database
func (r *EventRepository) GetRecentEvents(ctx context.Context, limit int) ([]models.DashboardEvent, error) {
	filter := models.EventsFilter{Limit: limit}
	events, _, err := r.GetEventsWithFilters(ctx, &filter)
	return events, err
}

// GetEventsWithFilters retrieves events with pagination and filtering
func (r *EventRepository) GetEventsWithFilters(ctx context.Context, filter *models.EventsFilter) ([]models.DashboardEvent, int, error) {
	f := *filter
	filter = &f // do not mutate the caller's filter
	if filter.Limit <= 0 {
		filter.Limit = 50
	}
	if filter.Limit > MaxEventsPageSize {
		filter.Limit = MaxEventsPageSize
	}

	// Build WHERE clause dynamically
	conditions := []string{notHiddenRepoCondition}
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

	// The total ignores the cursor so it stays stable while paging.
	countArgs := make([]interface{}, len(args))
	copy(countArgs, args)
	countWhere := "WHERE " + strings.Join(conditions, " AND ")

	hasCursor := !filter.Before.IsZero() && filter.BeforeID != ""
	if hasCursor {
		conditions = append(conditions, fmt.Sprintf("(created_at, id) < ($%d, $%d)", argIndex, argIndex+1))
		args = append(args, filter.Before, filter.BeforeID)
		argIndex += 2
	}

	whereClause := "WHERE " + strings.Join(conditions, " AND ")

	ctx, cancel := context.WithTimeout(ctx, queryTimeout)
	defer cancel()

	// Note: countWhere is built from fixed fragments with parameterized args
	countQuery := "SELECT COUNT(*) FROM events " + countWhere // #nosec G201

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
	offset := filter.Offset
	if hasCursor {
		offset = 0
	}
	query := fmt.Sprintf(`
		SELECT id, event_type, title, metadata, created_at, is_private
		FROM events
		%s
		ORDER BY created_at DESC, id DESC
		LIMIT $%d OFFSET $%d
	`, whereClause, argIndex, argIndex+1) // #nosec G201

	args = append(args, filter.Limit, offset)

	events, queryErr := WithRetry(ctx, DefaultRetryConfig, func() ([]models.DashboardEvent, error) {
		rows, err := r.db.QueryContext(ctx, query, args...)
		if err != nil {
			return nil, err
		}
		defer closeQuietly(ctx, rows)

		// Pre-allocate results slice to avoid growth allocations
		results := make([]models.DashboardEvent, 0, filter.Limit)
		for rows.Next() {
			var event models.DashboardEvent
			var metadataBytes []byte

			err := rows.Scan(&event.ID, &event.EventType, &event.Title, &metadataBytes, &event.CreatedAt, &event.IsPrivate)
			if err != nil {
				return nil, fmt.Errorf("failed to scan event row: %w", err)
			}

			event.CreatedAt = event.CreatedAt.UTC()

			if metadataBytes != nil {
				if err := json.Unmarshal(metadataBytes, &event.Metadata); err != nil {
					logger.FromContext(ctx).Warn().
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
func (r *EventRepository) GetStats(ctx context.Context) (models.EventStats, error) {
	ctx, cancel := context.WithTimeout(ctx, queryTimeout)
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
				COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '7 days') as last_week,
				MAX(created_at) FILTER (WHERE created_at <= NOW() + INTERVAL '5 minutes') as last_event_at
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
			c.last_event_at,
			COALESCE((SELECT json_agg(json_build_object('service', service, 'count', count)) FROM service_counts), '[]'::json) as services,
			COALESCE((SELECT json_agg(json_build_object('category', category, 'count', count)) FROM category_counts), '[]'::json) as categories
		FROM counts c
	`

	var total, last24h, lastWeek int
	var lastEventAt sql.NullTime
	var servicesJSON, categoriesJSON []byte

	err := r.db.QueryRowContext(ctx, consolidatedQuery).Scan(
		&total, &last24h, &lastWeek, &lastEventAt, &servicesJSON, &categoriesJSON,
	)
	if err != nil {
		return stats, fmt.Errorf("failed to query consolidated stats: %w", err)
	}

	stats.TotalEvents = total
	stats.Last24Hours = last24h
	stats.LastWeek = lastWeek
	if lastEventAt.Valid {
		t := lastEventAt.Time.UTC()
		stats.LastEventAt = &t
	}

	// Parse service counts from JSON
	var serviceResults []struct {
		Service string `json:"service"`
		Count   int    `json:"count"`
	}
	if unmarshalErr := json.Unmarshal(servicesJSON, &serviceResults); unmarshalErr != nil {
		logger.FromContext(ctx).Warn().Err(unmarshalErr).Msg("failed to parse service counts JSON")
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
		logger.FromContext(ctx).Warn().Err(unmarshalErr).Msg("failed to parse category counts JSON")
	} else {
		for _, c := range categoryResults {
			stats.CategoryCounts[c.Category] = c.Count
		}
	}

	// Get events per day for last 30 days (separate query as it returns multiple rows)
	dailyQuery := `
		SELECT
			TO_CHAR((created_at AT TIME ZONE 'UTC')::date, 'YYYY-MM-DD') as date,
			COUNT(*) as count
		FROM events
		WHERE created_at >= NOW() - INTERVAL '30 days'
		GROUP BY (created_at AT TIME ZONE 'UTC')::date
		ORDER BY (created_at AT TIME ZONE 'UTC')::date ASC
	`
	dailyRows, err := r.db.QueryContext(ctx, dailyQuery)
	if err != nil {
		return stats, fmt.Errorf("failed to query daily counts: %w", err)
	}
	defer closeQuietly(ctx, dailyRows)

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
func (r *EventRepository) GetYearlyDailyStats(ctx context.Context) ([]models.DailyCount, error) {
	ctx, cancel := context.WithTimeout(ctx, queryTimeout)
	defer cancel()

	return WithRetry(ctx, DefaultRetryConfig, func() ([]models.DailyCount, error) {
		query := `
			SELECT
				TO_CHAR((created_at AT TIME ZONE 'UTC')::date, 'YYYY-MM-DD') as date,
				COUNT(*) as count
			FROM events
			WHERE created_at >= NOW() - INTERVAL '365 days'
			GROUP BY (created_at AT TIME ZONE 'UTC')::date
			ORDER BY (created_at AT TIME ZONE 'UTC')::date ASC
		`
		rows, err := r.db.QueryContext(ctx, query)
		if err != nil {
			return nil, fmt.Errorf("failed to query yearly stats: %w", err)
		}
		defer closeQuietly(ctx, rows)

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
func (r *EventRepository) CalculateStreak(ctx context.Context) (models.StreakInfo, error) {
	ctx, cancel := context.WithTimeout(ctx, queryTimeout)
	defer cancel()

	return WithRetry(ctx, DefaultRetryConfig, func() (models.StreakInfo, error) {
		// Distinct UTC dates with events over the last 400 days, newest first.
		// A 400-day window bounds the query to prevent full-table scans as history grows,
		// while being far beyond any realistic streak length.
		query := `
			SELECT DISTINCT (created_at AT TIME ZONE 'UTC')::date AS event_date
			FROM events
			WHERE created_at > NOW() - INTERVAL '400 days'
			ORDER BY event_date DESC
		`
		rows, err := r.db.QueryContext(ctx, query)
		if err != nil {
			return models.StreakInfo{}, fmt.Errorf("failed to query dates for streak: %w", err)
		}
		defer closeQuietly(ctx, rows)

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

		return computeStreak(dates, time.Now().UTC()), nil
	})
}

// computeStreak derives streak info from distinct event dates (any order).
// Dates after today are ignored. The current streak counts consecutive days back
// from the latest date when that date is today or yesterday, and stops at the
// first gap. The longest streak is the longest consecutive run in the input.
func computeStreak(dates []time.Time, today time.Time) models.StreakInfo {
	const day = 24 * 60 * 60
	dayIndex := func(t time.Time) int64 {
		u := t.UTC()
		return time.Date(u.Year(), u.Month(), u.Day(), 0, 0, 0, 0, time.UTC).Unix() / day
	}
	todayIdx := dayIndex(today)

	seen := make(map[int64]struct{}, len(dates))
	idxs := make([]int64, 0, len(dates))
	for _, d := range dates {
		i := dayIndex(d)
		if i > todayIdx {
			continue
		}
		if _, ok := seen[i]; ok {
			continue
		}
		seen[i] = struct{}{}
		idxs = append(idxs, i)
	}
	if len(idxs) == 0 {
		return models.StreakInfo{}
	}
	sort.Slice(idxs, func(a, b int) bool { return idxs[a] > idxs[b] })

	info := models.StreakInfo{
		LastActiveDate: time.Unix(idxs[0]*day, 0).UTC().Format("2006-01-02"),
	}

	run, longest := 1, 1
	for i := 1; i < len(idxs); i++ {
		if idxs[i-1]-idxs[i] == 1 {
			run++
		} else {
			run = 1
		}
		if run > longest {
			longest = run
		}
	}
	info.LongestStreak = longest

	if idxs[0] == todayIdx || idxs[0] == todayIdx-1 {
		current := 1
		for i := 1; i < len(idxs) && idxs[i-1]-idxs[i] == 1; i++ {
			current++
		}
		info.CurrentStreak = current
	}
	return info
}

// monthlyAverageDays returns the number of days to divide a month's total by:
// the elapsed days (including today) for the current UTC month, otherwise the
// full length of the month.
func monthlyAverageDays(year, month int, now time.Time) int {
	now = now.UTC()
	if now.Year() == year && int(now.Month()) == month {
		return now.Day()
	}
	return time.Date(year, time.Month(month)+1, 0, 0, 0, 0, 0, time.UTC).Day()
}

// GetMonthlyStats retrieves aggregate statistics for a specific month
func (r *EventRepository) GetMonthlyStats(ctx context.Context, year, month int) (models.MonthlyStats, error) {
	ctx, cancel := context.WithTimeout(ctx, queryTimeout)
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
				TO_CHAR((created_at AT TIME ZONE 'UTC')::date, 'YYYY-MM-DD') as date,
				COUNT(*) as count
			FROM events
			WHERE created_at >= $1 AND created_at < $2
			GROUP BY (created_at AT TIME ZONE 'UTC')::date
			ORDER BY (created_at AT TIME ZONE 'UTC')::date ASC
		`
		dailyRows, err := r.db.QueryContext(ctx, dailyQuery, monthStart, monthEnd)
		if err != nil {
			return stats, fmt.Errorf("failed to query monthly daily counts: %w", err)
		}
		defer closeQuietly(ctx, dailyRows)

		totalEvents := 0
		var busiestDay models.DailyCount
		for dailyRows.Next() {
			var dc models.DailyCount
			err = dailyRows.Scan(&dc.Date, &dc.Count)
			if err != nil {
				return stats, fmt.Errorf("failed to scan daily row: %w", err)
			}
			stats.EventsPerDay = append(stats.EventsPerDay, dc)
			totalEvents += dc.Count
			if dc.Count > busiestDay.Count {
				busiestDay = dc
			}
		}
		err = dailyRows.Err()
		if err != nil {
			return stats, fmt.Errorf("error iterating daily rows: %w", err)
		}

		stats.TotalEvents = totalEvents
		stats.BusiestDay = busiestDay

		// Calculate daily average
		if days := monthlyAverageDays(year, month, time.Now()); days > 0 {
			stats.DailyAverage = float64(totalEvents) / float64(days)
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
		defer closeQuietly(ctx, serviceRows)

		for serviceRows.Next() {
			var sc models.ServiceCount
			err = serviceRows.Scan(&sc.Service, &sc.Count)
			if err != nil {
				return stats, fmt.Errorf("failed to scan service row: %w", err)
			}
			stats.TopServices = append(stats.TopServices, sc)
		}
		err = serviceRows.Err()
		if err != nil {
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
		defer closeQuietly(ctx, catRows)

		for catRows.Next() {
			var cat string
			var count int
			err = catRows.Scan(&cat, &count)
			if err != nil {
				return stats, fmt.Errorf("failed to scan category row: %w", err)
			}
			stats.CategoryBreakdown[cat] = count
		}
		err = catRows.Err()
		if err != nil {
			return stats, fmt.Errorf("error iterating category rows: %w", err)
		}

		return stats, nil
	})
}

// InsertEvent inserts a new event into the database. It returns inserted=false
// when an event with the same delivery id already exists. The insert is
// idempotent, so retrying after a transient error cannot create duplicates.
func (r *EventRepository) InsertEvent(ctx context.Context, event *models.DashboardEvent) (bool, error) {
	metadataJSON, err := json.Marshal(event.Metadata)
	if err != nil {
		return false, fmt.Errorf("failed to marshal metadata: %w", err)
	}

	ctx, cancel := context.WithTimeout(ctx, queryTimeout)
	defer cancel()

	query := `
		INSERT INTO events (event_type, title, metadata, created_at, delivery_id, is_private)
		VALUES ($1, $2, $3, $4, NULLIF($5, ''), $6)
		ON CONFLICT (delivery_id) DO NOTHING
		RETURNING id
	`

	// Use the event's CreatedAt timestamp (set by transformer from webhook timestamp)
	id, err := WithRetry(ctx, DefaultRetryConfig, func() (string, error) {
		var id string
		scanErr := r.db.QueryRowContext(ctx, query,
			event.EventType, event.Title, metadataJSON, event.CreatedAt, event.DeliveryID, event.IsPrivate,
		).Scan(&id)
		return id, scanErr
	})
	if errors.Is(err, sql.ErrNoRows) {
		return false, nil
	}
	if err != nil {
		return false, fmt.Errorf("failed to insert event: %w", err)
	}
	event.ID = id
	return true, nil
}
