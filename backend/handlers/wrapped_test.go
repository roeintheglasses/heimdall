package handlers

import (
	"context"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"heimdall-backend/logger"

	"github.com/gorilla/mux"
)

func TestParseYearMonth(t *testing.T) {
	now := time.Date(2026, 11, 15, 12, 0, 0, 0, time.UTC)
	tests := []struct {
		in      string
		year    int
		month   int
		wantErr bool
	}{
		{"2026-11", 2026, 11, false},
		{"2026-01", 2026, 1, false},
		{"2020-01", 2020, 1, false},
		{"2025-12", 2025, 12, false},
		{"2026-+11", 0, 0, true},
		{"2026-1", 0, 0, true},
		{"2019-12", 0, 0, true},
		{"0050-01", 0, 0, true},
		{"2026-12", 0, 0, true}, // after the current month
		{"2027-01", 0, 0, true},
		{"2026-13", 0, 0, true},
		{"2026-00", 0, 0, true},
		{"foo", 0, 0, true},
		{"2026-11-01", 0, 0, true},
		{"", 0, 0, true},
	}
	for _, tt := range tests {
		t.Run(tt.in, func(t *testing.T) {
			y, m, err := parseYearMonth(tt.in, now)
			if (err != nil) != tt.wantErr {
				t.Fatalf("err = %v, wantErr %v", err, tt.wantErr)
			}
			if y != tt.year || m != tt.month {
				t.Errorf("got %d-%d, want %d-%d", y, m, tt.year, tt.month)
			}
		})
	}
}

func wrappedRouter(h *WrappedHandler) *mux.Router {
	r := mux.NewRouter()
	r.Handle("/api/wrapped/{month}", h).Methods(http.MethodGet)
	return r
}

func TestWrappedHandler_Routing(t *testing.T) {
	h := NewWrappedHandler(&mockEventStore{}, logger.New(false))
	now := time.Now().UTC()
	valid := now.Format("2006-01")
	future := now.AddDate(0, 1, 0).Format("2006-01")

	tests := []struct {
		path string
		want int
	}{
		{"/api/wrapped/" + valid, http.StatusOK},
		{"/api/wrapped/foo/" + valid, http.StatusNotFound},
		{"/api/wrapped/2026-+11", http.StatusBadRequest},
		{"/api/wrapped/2026-1", http.StatusBadRequest},
		{"/api/wrapped/2019-12", http.StatusBadRequest},
		{"/api/wrapped/" + future, http.StatusBadRequest},
	}
	for _, tt := range tests {
		t.Run(tt.path, func(t *testing.T) {
			rec := httptest.NewRecorder()
			wrappedRouter(h).ServeHTTP(rec, httptest.NewRequestWithContext(context.Background(), http.MethodGet, tt.path, http.NoBody))
			if rec.Code != tt.want {
				t.Errorf("got %d, want %d", rec.Code, tt.want)
			}
		})
	}
}

func TestWrappedHandler_CacheIsBounded(t *testing.T) {
	h := NewWrappedHandler(&mockEventStore{}, logger.New(false))
	for i := 0; i < wrappedCacheMax*3; i++ {
		if _, err := h.getMonthlyStats(context.Background(), 2020+i/12, i%12+1); err != nil {
			t.Fatal(err)
		}
	}
	if n := len(h.cache.cache); n > wrappedCacheMax {
		t.Errorf("cache grew to %d entries, max %d", n, wrappedCacheMax)
	}
}
