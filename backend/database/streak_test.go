package database

import (
	"testing"
	"time"
)

func d(s string) time.Time {
	t, err := time.Parse("2006-01-02", s)
	if err != nil {
		panic(err)
	}
	return t
}

func TestComputeStreak(t *testing.T) {
	today := time.Date(2026, 11, 10, 15, 30, 0, 0, time.UTC)
	tests := []struct {
		name        string
		dates       []time.Time
		wantCurrent int
		wantLongest int
		wantLast    string
	}{
		{"empty", nil, 0, 0, ""},
		{"active streak with old gap", []time.Time{d("2026-11-10"), d("2026-11-09"), d("2026-11-08"), d("2026-10-01"), d("2026-09-30")}, 3, 3, "2026-11-10"},
		{"historical gap does not reset", []time.Time{d("2026-11-10"), d("2026-11-09"), d("2026-10-01"), d("2026-09-30"), d("2026-09-29"), d("2026-09-28")}, 2, 4, "2026-11-10"},
		{"future date ignored", []time.Time{d("2026-11-20"), d("2026-11-10"), d("2026-11-09")}, 2, 2, "2026-11-10"},
		{"only future dates", []time.Time{d("2026-11-20")}, 0, 0, ""},
		{"starts yesterday", []time.Time{d("2026-11-09"), d("2026-11-08")}, 2, 2, "2026-11-09"},
		{"starts two days ago", []time.Time{d("2026-11-08"), d("2026-11-07")}, 0, 2, "2026-11-08"},
		{"unsorted with duplicates", []time.Time{d("2026-11-08"), d("2026-11-10"), d("2026-11-09"), d("2026-11-10")}, 3, 3, "2026-11-10"},
		{"single today", []time.Time{d("2026-11-10")}, 1, 1, "2026-11-10"},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := computeStreak(tt.dates, today)
			if got.CurrentStreak != tt.wantCurrent || got.LongestStreak != tt.wantLongest || got.LastActiveDate != tt.wantLast {
				t.Errorf("got %+v, want current=%d longest=%d last=%q", got, tt.wantCurrent, tt.wantLongest, tt.wantLast)
			}
		})
	}
}

func TestMonthlyAverageDays(t *testing.T) {
	now := time.Date(2026, 11, 10, 23, 59, 0, 0, time.UTC)
	tests := []struct {
		year, month, want int
	}{
		{2026, 11, 10}, // current month: elapsed days
		{2026, 10, 31},
		{2026, 2, 28},
		{2024, 2, 29},
		{2025, 12, 31},
	}
	for _, tt := range tests {
		if got := monthlyAverageDays(tt.year, tt.month, now); got != tt.want {
			t.Errorf("monthlyAverageDays(%d,%d) = %d, want %d", tt.year, tt.month, got, tt.want)
		}
	}
}
