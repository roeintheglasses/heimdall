package handlers

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"regexp"
	"strconv"
	"sync"
	"time"

	"heimdall-backend/database"
	"heimdall-backend/logger"
	"heimdall-backend/models"

	"github.com/gorilla/mux"
)

// Cache TTL for monthly wrapped
const wrappedCacheTTL = 5 * time.Minute

// wrappedCacheMax bounds the number of cached months.
const wrappedCacheMax = 64

const minWrappedYear = 2020

var yearMonthPattern = regexp.MustCompile(`^\d{4}-\d{2}$`)

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

// parseYearMonth parses a strict "YYYY-MM" string. The year must be between 2020
// and the current UTC year, the month between 1 and 12, and the month must not
// be after the current UTC month.
func parseYearMonth(s string, now time.Time) (year, month int, err error) {
	if !yearMonthPattern.MatchString(s) {
		return 0, 0, errors.New("invalid format: expected YYYY-MM")
	}

	year, err = strconv.Atoi(s[:4])
	if err != nil {
		return 0, 0, errors.New("invalid year: must be a number")
	}
	month, err = strconv.Atoi(s[5:])
	if err != nil {
		return 0, 0, errors.New("invalid month: must be a number")
	}

	now = now.UTC()
	if year < minWrappedYear || year > now.Year() {
		return 0, 0, fmt.Errorf("invalid year: must be between %d and %d", minWrappedYear, now.Year())
	}
	if month < 1 || month > 12 {
		return 0, 0, errors.New("invalid month: must be between 1 and 12")
	}
	if year == now.Year() && month > int(now.Month()) {
		return 0, 0, errors.New("invalid month: must not be in the future")
	}

	return year, month, nil
}

// getMonthlyStats retrieves monthly stats from cache or database.
// No lock is held while the database query runs.
func (h *WrappedHandler) getMonthlyStats(ctx context.Context, year, month int) (models.MonthlyStats, error) {
	cacheKey := fmt.Sprintf("%04d-%02d", year, month)

	h.cache.mu.RLock()
	entry, ok := h.cache.cache[cacheKey]
	h.cache.mu.RUnlock()
	if ok && time.Since(entry.fetchedAt) < wrappedCacheTTL {
		return entry.stats, nil
	}

	stats, err := h.repo.GetMonthlyStats(ctx, year, month)
	if err != nil {
		return models.MonthlyStats{}, err
	}

	h.cache.mu.Lock()
	if _, exists := h.cache.cache[cacheKey]; !exists && len(h.cache.cache) >= wrappedCacheMax {
		for k := range h.cache.cache {
			if time.Since(h.cache.cache[k].fetchedAt) >= wrappedCacheTTL {
				delete(h.cache.cache, k)
			}
		}
		if len(h.cache.cache) >= wrappedCacheMax {
			h.cache.cache = make(map[string]wrappedCacheEntry)
		}
	}
	h.cache.cache[cacheKey] = wrappedCacheEntry{stats: stats, fetchedAt: time.Now()}
	h.cache.mu.Unlock()

	return stats, nil
}

// ServeHTTP handles the wrapped request
// Route: /api/wrapped/{month} where month is YYYY-MM, e.g. /api/wrapped/2025-01
func (h *WrappedHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	log := logger.FromContext(r.Context())

	year, month, err := parseYearMonth(mux.Vars(r)["month"], time.Now())
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	log.Debug().Int("year", year).Int("month", month).Msg("retrieving monthly wrapped stats")

	stats, err := h.getMonthlyStats(r.Context(), year, month)
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
