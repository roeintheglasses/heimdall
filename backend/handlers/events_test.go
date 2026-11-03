package handlers

import (
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"strings"
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

	req := httptest.NewRequestWithContext(context.Background(), http.MethodGet, "/api/events", http.NoBody)
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

	req := httptest.NewRequestWithContext(context.Background(), http.MethodGet, "/api/events?limit=10&offset=5", http.NoBody)
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

	req := httptest.NewRequestWithContext(context.Background(), http.MethodGet, "/api/events?type=github.push", http.NoBody)
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

	req := httptest.NewRequestWithContext(context.Background(), http.MethodGet, "/api/events?since=2024-01-01", http.NoBody)
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

	req := httptest.NewRequestWithContext(context.Background(), http.MethodGet, "/api/events", http.NoBody)
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
	req := httptest.NewRequestWithContext(context.Background(), http.MethodGet, "/api/events?limit=1000", http.NoBody)
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
	req := httptest.NewRequestWithContext(context.Background(), http.MethodGet, "/api/events?limit=invalid", http.NoBody)
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
	handler := NewEventsHandler(&mockEventStore{events: events[:10], totalOverride: 100})

	req := httptest.NewRequestWithContext(context.Background(), http.MethodGet, "/api/events?limit=10", http.NoBody)
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

func TestParseEventsFilter_Cursor(t *testing.T) {
	tests := []struct {
		name    string
		query   string
		wantErr bool
	}{
		{"none", "", false},
		{"both", "before=2026-11-02T10:11:12.123456Z&before_id=abc", false},
		{"only before", "before=2026-11-02T10:11:12Z", true},
		{"only before_id", "before_id=abc", true},
		{"bad before", "before=yesterday&before_id=abc", true},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			req := httptest.NewRequestWithContext(context.Background(), http.MethodGet, "/api/events?"+tt.query, http.NoBody)
			f, err := parseEventsFilter(req)
			if (err != nil) != tt.wantErr {
				t.Fatalf("err = %v, wantErr %v", err, tt.wantErr)
			}
			if err == nil && tt.query != "" {
				if f.BeforeID != "abc" || f.Before.IsZero() {
					t.Errorf("cursor not parsed: %+v", f)
				}
			}
		})
	}
}

func TestEventsHandler_CursorOneOfPair400(t *testing.T) {
	handler := NewEventsHandler(&mockEventStore{})
	req := httptest.NewRequestWithContext(context.Background(), http.MethodGet, "/api/events?before=2026-11-02T10:11:12Z", http.NoBody)
	rec := httptest.NewRecorder()

	handler.ServeHTTP(rec, req)

	if rec.Code != http.StatusBadRequest {
		t.Fatalf("expected 400, got %d", rec.Code)
	}
}

func TestEventsHandler_NextCursor(t *testing.T) {
	created := time.Date(2026, 11, 2, 10, 11, 12, 123456000, time.UTC)
	events := []models.DashboardEvent{
		{ID: "e3", EventType: "github.push", CreatedAt: created.Add(2 * time.Second)},
		{ID: "e2", EventType: "github.push", CreatedAt: created},
		{ID: "e1", EventType: "github.push", CreatedAt: created.Add(-time.Second)},
	}
	repo := &mockEventStore{events: events}
	handler := NewEventsHandler(repo)

	req := httptest.NewRequestWithContext(context.Background(), http.MethodGet, "/api/events?limit=2", http.NoBody)
	rec := httptest.NewRecorder()
	handler.ServeHTTP(rec, req)

	var resp EventsResponse
	if err := json.NewDecoder(rec.Body).Decode(&resp); err != nil {
		t.Fatal(err)
	}
	if repo.lastFilter.Limit != 3 {
		t.Errorf("expected store asked for limit+1=3, got %d", repo.lastFilter.Limit)
	}
	if len(resp.Events) != 2 || !resp.Pagination.HasMore {
		t.Fatalf("expected 2 events and hasMore, got %d / %v", len(resp.Events), resp.Pagination.HasMore)
	}
	c := resp.Pagination.NextCursor
	if c == nil || c.BeforeID != "e2" || c.Before != "2026-11-02T10:11:12.123456Z" {
		t.Errorf("unexpected cursor %+v", c)
	}

	// Last page: no cursor and JSON null.
	repo2 := &mockEventStore{events: events[:2]}
	rec = httptest.NewRecorder()
	NewEventsHandler(repo2).ServeHTTP(rec, httptest.NewRequestWithContext(context.Background(), http.MethodGet, "/api/events?limit=2", http.NoBody))
	if !strings.Contains(rec.Body.String(), `"next_cursor":null`) {
		t.Errorf("expected next_cursor null, got %s", rec.Body.String())
	}
}

func TestEventsHandler_RedactsPrivateEvents(t *testing.T) {
	repo := &mockEventStore{events: []models.DashboardEvent{{
		ID: "1", EventType: "github.push", Title: "Push to acme/secret", CreatedAt: time.Now(),
		IsPrivate: true,
		Metadata:  map[string]interface{}{"repo": "acme/secret", "message": "hush", "commit_count": 2, "url": "https://x"},
	}}}
	rec := httptest.NewRecorder()

	NewEventsHandler(repo).ServeHTTP(rec, httptest.NewRequestWithContext(context.Background(), http.MethodGet, "/api/events", http.NoBody))

	body := rec.Body.String()
	for _, leak := range []string{"acme", "secret", "hush", "https://x", `"repo"`, `"message"`, `"url"`} {
		if strings.Contains(body, leak) {
			t.Errorf("response leaks %q: %s", leak, body)
		}
	}
	if !strings.Contains(body, `"private":true`) || !strings.Contains(body, "Private repository: 2 commits pushed") {
		t.Errorf("unexpected body %s", body)
	}
}

func TestEventsHandler_EncodeError500(t *testing.T) {
	repo := &mockEventStore{events: []models.DashboardEvent{{
		ID: "1", EventType: "github.push", CreatedAt: time.Date(10000, 1, 1, 0, 0, 0, 0, time.UTC),
	}}}
	rec := httptest.NewRecorder()

	NewEventsHandler(repo).ServeHTTP(rec, httptest.NewRequestWithContext(context.Background(), http.MethodGet, "/api/events", http.NoBody))

	if rec.Code != http.StatusInternalServerError {
		t.Fatalf("expected 500, got %d", rec.Code)
	}
}

func TestETagMatches(t *testing.T) {
	etag := `"abc123"`
	tests := []struct {
		header string
		want   bool
	}{
		{`"abc123"`, true},
		{`W/"abc123"`, true},
		{`"zzz", W/"abc123"`, true},
		{`*`, true},
		{`"other"`, false},
		{`W/"other"`, false},
	}
	for _, tt := range tests {
		if got := etagMatches(tt.header, etag); got != tt.want {
			t.Errorf("etagMatches(%q) = %v, want %v", tt.header, got, tt.want)
		}
	}
}

func TestEventsHandler_ServesNotModifiedForWeakETag(t *testing.T) {
	repo := &mockEventStore{events: []models.DashboardEvent{{ID: "1", EventType: "github.push", CreatedAt: time.Now()}}}
	h := NewEventsHandler(repo)

	rec := httptest.NewRecorder()
	h.ServeHTTP(rec, httptest.NewRequestWithContext(context.Background(), http.MethodGet, "/api/events", http.NoBody))
	etag := rec.Header().Get("ETag")

	req := httptest.NewRequestWithContext(context.Background(), http.MethodGet, "/api/events", http.NoBody)
	req.Header.Set("If-None-Match", "W/"+etag)
	rec = httptest.NewRecorder()
	h.ServeHTTP(rec, req)

	if rec.Code != http.StatusNotModified {
		t.Fatalf("expected 304, got %d", rec.Code)
	}
}

func TestGenerateETag_ChangesWhenPrivacyFlips(t *testing.T) {
	events := []models.DashboardEvent{{ID: "1", CreatedAt: time.Now(), IsPrivate: true}}
	before := generateETag(events, 1)
	events[0].IsPrivate = false
	if after := generateETag(events, 1); after == before {
		t.Fatal("etag unchanged after is_private flipped")
	}
}
