package database

import (
	"context"

	"heimdall-backend/models"
)

// EventStore defines the interface for event storage operations
type EventStore interface {
	// InsertEvent stores the event. inserted is false when an event with the same
	// delivery id already exists. On insert, event.ID is set from the database.
	InsertEvent(ctx context.Context, event *models.DashboardEvent) (inserted bool, err error)
	GetRecentEvents(ctx context.Context, limit int) ([]models.DashboardEvent, error)
	GetEventsWithFilters(ctx context.Context, filter *models.EventsFilter) ([]models.DashboardEvent, int, error)
	GetStats(ctx context.Context) (models.EventStats, error)
	GetYearlyDailyStats(ctx context.Context) ([]models.DailyCount, error)
	CalculateStreak(ctx context.Context) (models.StreakInfo, error)
	GetMonthlyStats(ctx context.Context, year int, month int) (models.MonthlyStats, error)
}

// Ensure EventRepository implements EventStore
var _ EventStore = (*EventRepository)(nil)
