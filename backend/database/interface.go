package database

import "heimdall-backend/models"

// EventStore defines the interface for event storage operations
type EventStore interface {
	InsertEvent(event *models.DashboardEvent) error
	GetRecentEvents(limit int) ([]models.DashboardEvent, error)
	GetEventsWithFilters(filter models.EventsFilter) ([]models.DashboardEvent, int, error)
	GetStats() (models.EventStats, error)
	GetYearlyDailyStats() ([]models.DailyCount, error)
	CalculateStreak() (models.StreakInfo, error)
	GetMonthlyStats(year int, month int) (models.MonthlyStats, error)
}

// Ensure EventRepository implements EventStore
var _ EventStore = (*EventRepository)(nil)
