package handlers

import (
	"encoding/json"
	"net/http"
	"sync"
	"time"

	"heimdall-backend/database"
	"heimdall-backend/logger"
	"heimdall-backend/models"
)

// Cache TTL for stats
const statsCacheTTL = 30 * time.Second
const yearlyStatsCacheTTL = 5 * time.Minute

// statsCache holds cached stats with a timestamp
type statsCache struct {
	stats       models.EventStats
	yearlyStats []models.DailyCount
	streak      models.StreakInfo
	fetchedAt   time.Time
	yearlyAt    time.Time
	streakAt    time.Time
	mu          sync.RWMutex
}

// StatsHandler handles stats retrieval requests with caching
type StatsHandler struct {
	repo  database.EventStore
	cache *statsCache
	log   *logger.Logger
}

// NewStatsHandler creates a new stats handler with cache
func NewStatsHandler(repo database.EventStore, log *logger.Logger) *StatsHandler {
	return &StatsHandler{
		repo:  repo,
		cache: &statsCache{},
		log:   log,
	}
}

// getStats retrieves stats from cache or database
func (h *StatsHandler) getStats() (models.EventStats, bool, error) {
	// Try to get from cache first (read lock)
	h.cache.mu.RLock()
	if time.Since(h.cache.fetchedAt) < statsCacheTTL {
		stats := h.cache.stats
		h.cache.mu.RUnlock()
		return stats, true, nil // Cache hit
	}
	h.cache.mu.RUnlock()

	// Cache miss or expired, fetch from database (write lock)
	h.cache.mu.Lock()
	defer h.cache.mu.Unlock()

	// Double-check after acquiring write lock
	if time.Since(h.cache.fetchedAt) < statsCacheTTL {
		return h.cache.stats, true, nil
	}

	// Fetch fresh stats from database
	stats, err := h.repo.GetStats()
	if err != nil {
		// On error, return stale cache if available
		if !h.cache.fetchedAt.IsZero() {
			// Log the error but return stale data to maintain availability
			h.log.Warn().Err(err).Msg("failed to fetch stats, returning stale cache")
			return h.cache.stats, true, nil // true = from cache (stale)
		}
		return models.EventStats{}, false, err
	}

	// Fetch streak data (can fail independently)
	streak, err := h.repo.CalculateStreak()
	if err != nil {
		h.log.Warn().Err(err).Msg("failed to calculate streak")
	} else {
		stats.Streak = streak
		h.cache.streak = streak
		h.cache.streakAt = time.Now()
	}

	// Update cache
	h.cache.stats = stats
	h.cache.fetchedAt = time.Now()
	return stats, false, nil
}

// getYearlyStats retrieves yearly daily counts from cache or database
func (h *StatsHandler) getYearlyStats() ([]models.DailyCount, error) {
	// Try cache first
	h.cache.mu.RLock()
	if time.Since(h.cache.yearlyAt) < yearlyStatsCacheTTL && h.cache.yearlyStats != nil {
		yearly := h.cache.yearlyStats
		h.cache.mu.RUnlock()
		return yearly, nil
	}
	h.cache.mu.RUnlock()

	// Cache miss, fetch from database
	h.cache.mu.Lock()
	defer h.cache.mu.Unlock()

	// Double-check
	if time.Since(h.cache.yearlyAt) < yearlyStatsCacheTTL && h.cache.yearlyStats != nil {
		return h.cache.yearlyStats, nil
	}

	yearly, err := h.repo.GetYearlyDailyStats()
	if err != nil {
		// Return stale cache if available
		if h.cache.yearlyStats != nil {
			h.log.Warn().Err(err).Msg("failed to fetch yearly stats, returning stale cache")
			return h.cache.yearlyStats, nil
		}
		return nil, err
	}

	h.cache.yearlyStats = yearly
	h.cache.yearlyAt = time.Now()
	return yearly, nil
}

// ServeHTTP handles the stats request
func (h *StatsHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	log := logger.FromContext(r.Context())

	// Check for range parameter
	rangeParam := r.URL.Query().Get("range")

	log.Debug().Str("range", rangeParam).Msg("retrieving event stats")

	stats, fromCache, err := h.getStats()
	if err != nil {
		log.Error().Err(err).Msg("failed to retrieve stats")
		http.Error(w, "Failed to retrieve stats", http.StatusInternalServerError)
		return
	}

	// If range=year, fetch yearly data
	if rangeParam == "year" {
		yearly, err := h.getYearlyStats()
		if err != nil {
			log.Error().Err(err).Msg("failed to retrieve yearly stats")
			http.Error(w, "Failed to retrieve yearly stats", http.StatusInternalServerError)
			return
		}
		stats.EventsPerYear = yearly
	}

	log.Debug().
		Int("total_events", stats.TotalEvents).
		Int("last_24h", stats.Last24Hours).
		Int("last_week", stats.LastWeek).
		Int("current_streak", stats.Streak.CurrentStreak).
		Bool("from_cache", fromCache).
		Msg("stats retrieved")

	w.Header().Set("Content-Type", "application/json")
	// Add cache control header - longer for yearly data
	if rangeParam == "year" {
		w.Header().Set("Cache-Control", "private, max-age=300")
	} else {
		w.Header().Set("Cache-Control", "private, max-age=30")
	}
	if err := json.NewEncoder(w).Encode(stats); err != nil {
		log.Error().Err(err).Msg("failed to encode stats response")
	}
}
