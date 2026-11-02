package handlers

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"
	"unicode/utf8"

	"heimdall-backend/models"
	"heimdall-backend/transformers"
)

const testSecret = "test-secret"

// mockEventStore is a mock implementation of database.EventStore for testing
type mockEventStore struct {
	getErr        error
	insertErr     error
	deliveries    map[string]bool
	events        []models.DashboardEvent
	lastFilter    models.EventsFilter
	totalOverride int
	insertCalls   int
}

func (m *mockEventStore) InsertEvent(_ context.Context, event *models.DashboardEvent) (bool, error) {
	m.insertCalls++
	if m.insertErr != nil {
		return false, m.insertErr
	}
	if event.DeliveryID != "" {
		if m.deliveries == nil {
			m.deliveries = map[string]bool{}
		}
		if m.deliveries[event.DeliveryID] {
			return false, nil
		}
		m.deliveries[event.DeliveryID] = true
	}
	event.ID = fmt.Sprintf("id-%d", len(m.events)+1)
	m.events = append(m.events, *event)
	return true, nil
}

func (m *mockEventStore) GetRecentEvents(_ context.Context, _ int) ([]models.DashboardEvent, error) {
	if m.getErr != nil {
		return nil, m.getErr
	}
	return m.events, nil
}

func (m *mockEventStore) GetEventsWithFilters(_ context.Context, filter *models.EventsFilter) ([]models.DashboardEvent, int, error) {
	if m.getErr != nil {
		return nil, 0, m.getErr
	}
	m.lastFilter = *filter
	total := len(m.events)
	if m.totalOverride > 0 {
		total = m.totalOverride
	}
	return m.events, total, nil
}

func (m *mockEventStore) GetStats(_ context.Context) (models.EventStats, error) {
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

func (m *mockEventStore) GetYearlyDailyStats(_ context.Context) ([]models.DailyCount, error) {
	return []models.DailyCount{}, nil
}

func (m *mockEventStore) CalculateStreak(_ context.Context) (models.StreakInfo, error) {
	return models.StreakInfo{}, nil
}

func (m *mockEventStore) GetMonthlyStats(_ context.Context, year, month int) (models.MonthlyStats, error) {
	return models.MonthlyStats{
		Year:              year,
		Month:             month,
		CategoryBreakdown: make(map[string]int),
	}, nil
}

const validPushEvent = `{
	"ref": "refs/heads/main",
	"repository": {"name": "test-repo"},
	"head_commit": {"message": "Test commit", "author": {"name": "Test User"}},
	"commits": [{"id": "abc123"}]
}`

func newWebhookHandler(repo *mockEventStore) *WebhookHandler {
	return NewWebhookHandler(repo, transformers.NewRegistry(), testSecret)
}

// postWebhook sends a raw body with the correct secret header.
func postWebhook(h http.Handler, body []byte) *httptest.ResponseRecorder {
	req := httptest.NewRequestWithContext(context.Background(), http.MethodPost, "/api/webhook", bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("X-Heimdall-Secret", testSecret)
	req.Header.Set("X-Heimdall-Secret", testSecret)
	rec := httptest.NewRecorder()
	h.ServeHTTP(rec, req)
	return rec
}

func pushPayload(ts int64, event string) []byte {
	body, _ := json.Marshal(models.QStashPayload{ //nolint:errchkjson // test helper with valid input
		EventType: "github.push",
		Timestamp: ts,
		Event:     json.RawMessage(event),
	})
	return body
}

func TestWebhookHandler_ValidPayload(t *testing.T) {
	mockRepo := &mockEventStore{}
	registry := transformers.NewRegistry()
	handler := NewWebhookHandler(mockRepo, registry, testSecret)

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
	req := httptest.NewRequestWithContext(context.Background(), http.MethodPost, "/api/webhook", bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("X-Heimdall-Secret", testSecret)
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
	handler := NewWebhookHandler(mockRepo, registry, testSecret)

	req := httptest.NewRequestWithContext(context.Background(), http.MethodPost, "/api/webhook", bytes.NewReader([]byte("invalid json")))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("X-Heimdall-Secret", testSecret)
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
	handler := NewWebhookHandler(mockRepo, registry, testSecret)

	payload := models.QStashPayload{
		EventType: "unknown.event",
		Timestamp: time.Now().Unix(),
		Event:     json.RawMessage(`{}`),
	}

	body, _ := json.Marshal(payload)
	req := httptest.NewRequestWithContext(context.Background(), http.MethodPost, "/api/webhook", bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("X-Heimdall-Secret", testSecret)
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
	handler := NewWebhookHandler(mockRepo, registry, testSecret)

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
	req := httptest.NewRequestWithContext(context.Background(), http.MethodPost, "/api/webhook", bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("X-Heimdall-Secret", testSecret)
	rec := httptest.NewRecorder()

	handler.ServeHTTP(rec, req)

	if rec.Code != http.StatusInternalServerError {
		t.Errorf("expected status 500, got %d", rec.Code)
	}
}

func TestWebhookHandler_UsesPayloadTimestamp(t *testing.T) {
	mockRepo := &mockEventStore{}
	registry := transformers.NewRegistry()
	handler := NewWebhookHandler(mockRepo, registry, testSecret)

	expectedTime := time.Now().UTC().Add(-48 * time.Hour).Truncate(time.Second)
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
	req := httptest.NewRequestWithContext(context.Background(), http.MethodPost, "/api/webhook", bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("X-Heimdall-Secret", testSecret)
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
	handler := NewWebhookHandler(mockRepo, registry, testSecret)

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
	req := httptest.NewRequestWithContext(context.Background(), http.MethodPost, "/api/webhook", bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("X-Heimdall-Secret", testSecret)
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

func TestWebhookHandler_TruncatesLongTitleOnRuneBoundary(t *testing.T) {
	repo := &mockEventStore{}
	h := newWebhookHandler(repo)
	repoName := strings.Repeat("é", 800)
	event := `{"ref":"refs/heads/main","repository":{"name":"` + repoName + `"},"head_commit":{"message":"m","author":{"name":"u"}},"commits":[{"id":"a"}]}`

	rec := postWebhook(h, pushPayload(time.Now().Unix(), event))

	if rec.Code != http.StatusOK || len(repo.events) != 1 {
		t.Fatalf("code=%d events=%d", rec.Code, len(repo.events))
	}
	title := repo.events[0].Title
	if n := utf8.RuneCountInString(title); n != maxTitleLength {
		t.Errorf("title has %d runes, want %d", n, maxTitleLength)
	}
	if !utf8.ValidString(title) {
		t.Error("title is not valid UTF-8")
	}
}
