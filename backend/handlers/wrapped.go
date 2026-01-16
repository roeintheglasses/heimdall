package handlers

import (
	"encoding/json"
	"errors"
	"net/http"
	"strconv"
	"strings"
	"sync"
	"time"

	"heimdall-backend/database"
	"heimdall-backend/logger"
	"heimdall-backend/models"
)

// Cache TTL for monthly wrapped
const wrappedCacheTTL = 5 * time.Minute

// wrappedCache holds cached monthly stats
type wrappedCache struct {
	cache map[string]wrappedCacheEntry
	mu    sync.RWMutex
}

type wrappedCacheEntry struct {
	stats     models.MonthlyStats
	fetchedAt time.Time
}

// WrappedHandler handles monthly wrapped stats requests
type WrappedHandler struct {
	repo  database.EventStore
	cache *wrappedCache
	log   *logger.Logger
}

// NewWrappedHandler creates a new wrapped handler
func NewWrappedHandler(repo database.EventStore, log *logger.Logger) *WrappedHandler {
	return &WrappedHandler{
		repo: repo,
		cache: &wrappedCache{
			cache: make(map[string]wrappedCacheEntry),
		},
		log: log,
	}
}

// parseYearMonth parses a "YYYY-MM" string into year and month
func parseYearMonth(s string) (int, int, error) {
	parts := strings.Split(s, "-")
	if len(parts) != 2 {
		return 0, 0, errors.New("invalid format: expected YYYY-MM")
	}

	year, err := strconv.Atoi(parts[0])
	if err != nil {
		return 0, 0, errors.New("invalid year: must be a number")
	}

	month, err := strconv.Atoi(parts[1])
	if err != nil {
		return 0, 0, errors.New("invalid month: must be a number")
	}

	if month < 1 || month > 12 {
		return 0, 0, errors.New("invalid month: must be between 1 and 12")
	}

	return year, month, nil
}

// getMonthlyStats retrieves monthly stats from cache or database
func (h *WrappedHandler) getMonthlyStats(year, month int) (models.MonthlyStats, error) {
	cacheKey := strconv.Itoa(year) + "-" + strconv.Itoa(month)

	// Try cache first
	h.cache.mu.RLock()
	if entry, ok := h.cache.cache[cacheKey]; ok {
		if time.Since(entry.fetchedAt) < wrappedCacheTTL {
			h.cache.mu.RUnlock()
			return entry.stats, nil
		}
	}
	h.cache.mu.RUnlock()

	// Cache miss, fetch from database
	h.cache.mu.Lock()
	defer h.cache.mu.Unlock()

	// Double-check
	if entry, ok := h.cache.cache[cacheKey]; ok {
		if time.Since(entry.fetchedAt) < wrappedCacheTTL {
			return entry.stats, nil
		}
	}

	stats, err := h.repo.GetMonthlyStats(year, month)
	if err != nil {
		return models.MonthlyStats{}, err
	}

	// Update cache
	h.cache.cache[cacheKey] = wrappedCacheEntry{
		stats:     stats,
		fetchedAt: time.Now(),
	}

	return stats, nil
}

// ServeHTTP handles the wrapped request
// Expected path: /api/wrapped/{year}-{month} e.g., /api/wrapped/2025-01
func (h *WrappedHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	log := logger.FromContext(r.Context())

	// Extract year-month from URL path
	// Path format: /api/wrapped/2025-01
	path := r.URL.Path
	parts := strings.Split(path, "/")
	if len(parts) < 4 {
		http.Error(w, "Invalid path format. Expected /api/wrapped/YYYY-MM", http.StatusBadRequest)
		return
	}

	yearMonth := parts[len(parts)-1]
	year, month, err := parseYearMonth(yearMonth)
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	log.Debug().Int("year", year).Int("month", month).Msg("retrieving monthly wrapped stats")

	stats, err := h.getMonthlyStats(year, month)
	if err != nil {
		log.Error().Err(err).Msg("failed to retrieve monthly stats")
		http.Error(w, "Failed to retrieve monthly stats", http.StatusInternalServerError)
		return
	}

	log.Debug().
		Int("total_events", stats.TotalEvents).
		Float64("daily_average", stats.DailyAverage).
		Msg("monthly wrapped stats retrieved")

	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("Cache-Control", "private, max-age=300")
	if err := json.NewEncoder(w).Encode(stats); err != nil {
		log.Error().Err(err).Msg("failed to encode wrapped response")
	}
}
