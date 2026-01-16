package handlers

import (
	"bytes"
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"heimdall-backend/models"
	"heimdall-backend/transformers"
)

// mockEventStore is a mock implementation of database.EventStore for testing
type mockEventStore struct {
	events      []models.DashboardEvent
	insertErr   error
	getErr      error
	insertCalls int
}

func (m *mockEventStore) InsertEvent(event *models.DashboardEvent) error {
	m.insertCalls++
	if m.insertErr != nil {
		return m.insertErr
	}
	m.events = append(m.events, *event)
	return nil
}

func (m *mockEventStore) GetRecentEvents(limit int) ([]models.DashboardEvent, error) {
	if m.getErr != nil {
		return nil, m.getErr
	}
	return m.events, nil
}

func (m *mockEventStore) GetEventsWithFilters(filter models.EventsFilter) ([]models.DashboardEvent, int, error) {
	if m.getErr != nil {
		return nil, 0, m.getErr
	}
	return m.events, len(m.events), nil
}

func (m *mockEventStore) GetStats() (models.EventStats, error) {
	if m.getErr != nil {
		return models.EventStats{}, m.getErr
	}
	return models.EventStats{
		TotalEvents:    len(m.events),
		CategoryCounts: make(map[string]int),
		ServiceCounts:  make(map[string]int),
		EventsPerDay:   []models.DailyCount{},
	}, nil
}

func (m *mockEventStore) GetYearlyDailyStats() ([]models.DailyCount, error) {
	return []models.DailyCount{}, nil
}

func (m *mockEventStore) CalculateStreak() (models.StreakInfo, error) {
	return models.StreakInfo{}, nil
}

func (m *mockEventStore) GetMonthlyStats(year, month int) (models.MonthlyStats, error) {
	return models.MonthlyStats{
		Year:              year,
		Month:             month,
		CategoryBreakdown: make(map[string]int),
	}, nil
}

func TestWebhookHandler_ValidPayload(t *testing.T) {
	mockRepo := &mockEventStore{}
	registry := transformers.NewRegistry()
	handler := NewWebhookHandler(mockRepo, registry)

	payload := models.QStashPayload{
		EventType: "github.push",
		Timestamp: time.Now().Unix(),
		Event: json.RawMessage(`{
			"ref": "refs/heads/main",
			"repository": {"name": "test-repo"},
			"head_commit": {
				"message": "Test commit",
				"author": {"name": "Test User"}
			},
			"commits": [{"id": "abc123"}]
		}`),
	}

	body, _ := json.Marshal(payload)
	req := httptest.NewRequest(http.MethodPost, "/api/webhook", bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	rec := httptest.NewRecorder()

	handler.ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Errorf("expected status 200, got %d", rec.Code)
	}

	if mockRepo.insertCalls != 1 {
		t.Errorf("expected 1 insert call, got %d", mockRepo.insertCalls)
	}
}

func TestWebhookHandler_InvalidJSON(t *testing.T) {
	mockRepo := &mockEventStore{}
	registry := transformers.NewRegistry()
	handler := NewWebhookHandler(mockRepo, registry)

	req := httptest.NewRequest(http.MethodPost, "/api/webhook", bytes.NewReader([]byte("invalid json")))
	req.Header.Set("Content-Type", "application/json")
	rec := httptest.NewRecorder()

	handler.ServeHTTP(rec, req)

	if rec.Code != http.StatusBadRequest {
		t.Errorf("expected status 400, got %d", rec.Code)
	}

	if mockRepo.insertCalls != 0 {
		t.Errorf("expected 0 insert calls, got %d", mockRepo.insertCalls)
	}
}

func TestWebhookHandler_UnknownEventType(t *testing.T) {
	mockRepo := &mockEventStore{}
	registry := transformers.NewRegistry()
	handler := NewWebhookHandler(mockRepo, registry)

	payload := models.QStashPayload{
		EventType: "unknown.event",
		Timestamp: time.Now().Unix(),
		Event:     json.RawMessage(`{}`),
	}

	body, _ := json.Marshal(payload)
	req := httptest.NewRequest(http.MethodPost, "/api/webhook", bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	rec := httptest.NewRecorder()

	handler.ServeHTTP(rec, req)

	if rec.Code != http.StatusBadRequest {
		t.Errorf("expected status 400, got %d", rec.Code)
	}

	if mockRepo.insertCalls != 0 {
		t.Errorf("expected 0 insert calls, got %d", mockRepo.insertCalls)
	}
}

func TestWebhookHandler_DatabaseError(t *testing.T) {
	mockRepo := &mockEventStore{
		insertErr: errors.New("database connection failed"),
	}
	registry := transformers.NewRegistry()
	handler := NewWebhookHandler(mockRepo, registry)

	payload := models.QStashPayload{
		EventType: "github.push",
		Timestamp: time.Now().Unix(),
		Event: json.RawMessage(`{
			"ref": "refs/heads/main",
			"repository": {"name": "test"},
			"head_commit": {"message": "Test", "author": {"name": "User"}},
			"commits": [{"id": "abc"}]
		}`),
	}

	body, _ := json.Marshal(payload)
	req := httptest.NewRequest(http.MethodPost, "/api/webhook", bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	rec := httptest.NewRecorder()

	handler.ServeHTTP(rec, req)

	if rec.Code != http.StatusInternalServerError {
		t.Errorf("expected status 500, got %d", rec.Code)
	}
}

func TestWebhookHandler_UsesPayloadTimestamp(t *testing.T) {
	mockRepo := &mockEventStore{}
	registry := transformers.NewRegistry()
	handler := NewWebhookHandler(mockRepo, registry)

	expectedTime := time.Date(2024, 6, 15, 12, 0, 0, 0, time.UTC)
	payload := models.QStashPayload{
		EventType: "github.push",
		Timestamp: expectedTime.Unix(),
		Event: json.RawMessage(`{
			"ref": "refs/heads/main",
			"repository": {"name": "test"},
			"head_commit": {"message": "Test", "author": {"name": "User"}},
			"commits": [{"id": "abc"}]
		}`),
	}

	body, _ := json.Marshal(payload)
	req := httptest.NewRequest(http.MethodPost, "/api/webhook", bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	rec := httptest.NewRecorder()

	handler.ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Errorf("expected status 200, got %d", rec.Code)
	}

	if len(mockRepo.events) == 0 {
		t.Fatal("expected event to be inserted")
	}

	insertedEvent := mockRepo.events[0]
	if !insertedEvent.CreatedAt.Equal(expectedTime) {
		t.Errorf("expected timestamp %v, got %v", expectedTime, insertedEvent.CreatedAt)
	}
}

func TestWebhookHandler_FallbackToCurrentTime(t *testing.T) {
	mockRepo := &mockEventStore{}
	registry := transformers.NewRegistry()
	handler := NewWebhookHandler(mockRepo, registry)

	beforeTest := time.Now().UTC().Add(-time.Second)

	// Timestamp of 0 should trigger fallback to current time
	payload := models.QStashPayload{
		EventType: "github.push",
		Timestamp: 0,
		Event: json.RawMessage(`{
			"ref": "refs/heads/main",
			"repository": {"name": "test"},
			"head_commit": {"message": "Test", "author": {"name": "User"}},
			"commits": [{"id": "abc"}]
		}`),
	}

	body, _ := json.Marshal(payload)
	req := httptest.NewRequest(http.MethodPost, "/api/webhook", bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	rec := httptest.NewRecorder()

	handler.ServeHTTP(rec, req)

	afterTest := time.Now().UTC().Add(time.Second)

	if rec.Code != http.StatusOK {
		t.Errorf("expected status 200, got %d", rec.Code)
	}

	if len(mockRepo.events) == 0 {
		t.Fatal("expected event to be inserted")
	}

	insertedEvent := mockRepo.events[0]
	if insertedEvent.CreatedAt.Before(beforeTest) || insertedEvent.CreatedAt.After(afterTest) {
		t.Errorf("expected timestamp to be around current time, got %v", insertedEvent.CreatedAt)
	}
}
