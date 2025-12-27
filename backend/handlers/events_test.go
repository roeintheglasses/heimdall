package handlers

import (
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"heimdall-backend/models"
)

func TestEventsHandler_Success(t *testing.T) {
	mockRepo := &mockEventStore{
		events: []models.DashboardEvent{
			{
				ID:        "1",
				EventType: "github.push",
				Title:     "Test push",
				Metadata:  map[string]interface{}{"repo": "test"},
				CreatedAt: time.Now(),
			},
		},
	}
	handler := NewEventsHandler(mockRepo)

	req := httptest.NewRequest(http.MethodGet, "/api/events", nil)
	rec := httptest.NewRecorder()

	handler.ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Errorf("expected status 200, got %d", rec.Code)
	}

	var response EventsResponse
	if err := json.NewDecoder(rec.Body).Decode(&response); err != nil {
		t.Fatalf("failed to decode response: %v", err)
	}

	if len(response.Events) != 1 {
		t.Errorf("expected 1 event, got %d", len(response.Events))
	}

	if response.Pagination.Total != 1 {
		t.Errorf("expected total 1, got %d", response.Pagination.Total)
	}
}

func TestEventsHandler_WithPagination(t *testing.T) {
	mockRepo := &mockEventStore{}
	handler := NewEventsHandler(mockRepo)

	req := httptest.NewRequest(http.MethodGet, "/api/events?limit=10&offset=5", nil)
	rec := httptest.NewRecorder()

	handler.ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Errorf("expected status 200, got %d", rec.Code)
	}

	var response EventsResponse
	if err := json.NewDecoder(rec.Body).Decode(&response); err != nil {
		t.Fatalf("failed to decode response: %v", err)
	}

	if response.Pagination.Limit != 10 {
		t.Errorf("expected limit 10, got %d", response.Pagination.Limit)
	}

	if response.Pagination.Offset != 5 {
		t.Errorf("expected offset 5, got %d", response.Pagination.Offset)
	}
}

func TestEventsHandler_WithTypeFilter(t *testing.T) {
	mockRepo := &mockEventStore{
		events: []models.DashboardEvent{
			{
				ID:        "1",
				EventType: "github.push",
				Title:     "Push event",
				CreatedAt: time.Now(),
			},
		},
	}
	handler := NewEventsHandler(mockRepo)

	req := httptest.NewRequest(http.MethodGet, "/api/events?type=github.push", nil)
	rec := httptest.NewRecorder()

	handler.ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Errorf("expected status 200, got %d", rec.Code)
	}

	var response EventsResponse
	if err := json.NewDecoder(rec.Body).Decode(&response); err != nil {
		t.Fatalf("failed to decode response: %v", err)
	}

	// We're testing that the handler correctly parses query params
	// The mock doesn't actually filter, but we verify the request was processed
	if rec.Header().Get("Content-Type") != "application/json" {
		t.Errorf("expected Content-Type application/json")
	}
}

func TestEventsHandler_WithSinceFilter(t *testing.T) {
	mockRepo := &mockEventStore{}
	handler := NewEventsHandler(mockRepo)

	req := httptest.NewRequest(http.MethodGet, "/api/events?since=2024-01-01", nil)
	rec := httptest.NewRecorder()

	handler.ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Errorf("expected status 200, got %d", rec.Code)
	}
}

func TestEventsHandler_DatabaseError(t *testing.T) {
	mockRepo := &mockEventStore{
		getErr: errors.New("database connection failed"),
	}
	handler := NewEventsHandler(mockRepo)

	req := httptest.NewRequest(http.MethodGet, "/api/events", nil)
	rec := httptest.NewRecorder()

	handler.ServeHTTP(rec, req)

	if rec.Code != http.StatusInternalServerError {
		t.Errorf("expected status 500, got %d", rec.Code)
	}
}

func TestEventsHandler_MaxLimit(t *testing.T) {
	mockRepo := &mockEventStore{}
	handler := NewEventsHandler(mockRepo)

	// Request a limit higher than max (500)
	req := httptest.NewRequest(http.MethodGet, "/api/events?limit=1000", nil)
	rec := httptest.NewRecorder()

	handler.ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Errorf("expected status 200, got %d", rec.Code)
	}

	var response EventsResponse
	if err := json.NewDecoder(rec.Body).Decode(&response); err != nil {
		t.Fatalf("failed to decode response: %v", err)
	}

	// Limit should be capped at 500
	if response.Pagination.Limit != 500 {
		t.Errorf("expected limit capped at 500, got %d", response.Pagination.Limit)
	}
}

func TestEventsHandler_InvalidLimitIgnored(t *testing.T) {
	mockRepo := &mockEventStore{}
	handler := NewEventsHandler(mockRepo)

	// Invalid limit should be ignored and use default
	req := httptest.NewRequest(http.MethodGet, "/api/events?limit=invalid", nil)
	rec := httptest.NewRecorder()

	handler.ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Errorf("expected status 200, got %d", rec.Code)
	}

	var response EventsResponse
	if err := json.NewDecoder(rec.Body).Decode(&response); err != nil {
		t.Fatalf("failed to decode response: %v", err)
	}

	// Should use default limit of 50
	if response.Pagination.Limit != 50 {
		t.Errorf("expected default limit 50, got %d", response.Pagination.Limit)
	}
}

func TestEventsHandler_HasMorePagination(t *testing.T) {
	// Create more events than we're requesting
	events := make([]models.DashboardEvent, 100)
	for i := 0; i < 100; i++ {
		events[i] = models.DashboardEvent{
			ID:        string(rune(i)),
			EventType: "github.push",
			Title:     "Push event",
			CreatedAt: time.Now(),
		}
	}

	// Use mockStoreWithTotal to return total of 100
	handler := NewEventsHandler(&mockStoreWithTotal{events: events[:10], total: 100})

	req := httptest.NewRequest(http.MethodGet, "/api/events?limit=10", nil)
	rec := httptest.NewRecorder()

	handler.ServeHTTP(rec, req)

	var response EventsResponse
	if err := json.NewDecoder(rec.Body).Decode(&response); err != nil {
		t.Fatalf("failed to decode response: %v", err)
	}

	if !response.Pagination.HasMore {
		t.Error("expected HasMore to be true")
	}
}

// mockStoreWithTotal is a mock that returns a specific total count
type mockStoreWithTotal struct {
	events []models.DashboardEvent
	total  int
}

func (m *mockStoreWithTotal) InsertEvent(event models.DashboardEvent) error {
	return nil
}

func (m *mockStoreWithTotal) GetRecentEvents(limit int) ([]models.DashboardEvent, error) {
	return m.events, nil
}

func (m *mockStoreWithTotal) GetEventsWithFilters(filter models.EventsFilter) ([]models.DashboardEvent, int, error) {
	return m.events, m.total, nil
}

func (m *mockStoreWithTotal) GetStats() (models.EventStats, error) {
	return models.EventStats{
		TotalEvents:    m.total,
		CategoryCounts: make(map[string]int),
		ServiceCounts:  make(map[string]int),
		EventsPerDay:   []models.DailyCount{},
	}, nil
}
