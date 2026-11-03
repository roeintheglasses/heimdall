package handlers_test

import (
	"bytes"
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"net/url"
	"strings"
	"testing"
	"time"

	"heimdall-backend/config"
	"heimdall-backend/database"
	"heimdall-backend/handlers"
	"heimdall-backend/internal/testdb"
	"heimdall-backend/models"
	"heimdall-backend/transformers"
)

const secret = "integration-secret"

func get(t *testing.T, h http.Handler, path string) *httptest.ResponseRecorder {
	t.Helper()
	req := httptest.NewRequestWithContext(context.Background(), http.MethodGet, path, http.NoBody)
	rec := httptest.NewRecorder()
	h.ServeHTTP(rec, req)
	return rec
}

func eventsPage(t *testing.T, h http.Handler, query string) handlers.EventsResponse {
	t.Helper()
	rec := get(t, h, "/api/events?"+query)
	if rec.Code != http.StatusOK {
		t.Fatalf("GET /api/events?%s = %d %s", query, rec.Code, rec.Body.String())
	}
	var resp handlers.EventsResponse
	if err := json.Unmarshal(rec.Body.Bytes(), &resp); err != nil {
		t.Fatal(err)
	}
	return resp
}

func insert(t *testing.T, repo *database.EventRepository, ev *models.DashboardEvent) {
	t.Helper()
	inserted, err := repo.InsertEvent(context.Background(), ev)
	if err != nil || !inserted {
		t.Fatalf("insert %q: inserted=%v err=%v", ev.Title, inserted, err)
	}
}

func countRows(t *testing.T, db *sql.DB) int {
	t.Helper()
	var n int
	if err := db.QueryRowContext(context.Background(), `SELECT count(*) FROM events`).Scan(&n); err != nil {
		t.Fatal(err)
	}
	return n
}

func TestWebhookPush_SameDeliveryIDStoresOneRow(t *testing.T) {
	db := testdb.Open(t)
	repo := database.NewEventRepository(db)
	h := handlers.NewWebhookHandler(repo, transformers.NewRegistry(), secret)

	// The Edge builds delivery_id from repo, ref, before and after, so two hooks
	// on one repo send the same id even though X-GitHub-Delivery differs. The
	// backend never sees that header, so equal ids must collapse into one row.
	event := `{"ref":"refs/heads/main","before":"1111","after":"2222",
		"repository":{"name":"r","full_name":"me/r","private":false},
		"head_commit":{"id":"2222","message":"m","author":{"name":"me"}},"commits":[{"id":"2222"}]}`
	post := func(githubDelivery string) map[string]string {
		body, err := json.Marshal(models.QStashPayload{
			EventType: "github.push", Timestamp: time.Now().Unix(),
			Event: json.RawMessage(event), DeliveryID: "github:push:abc",
		})
		if err != nil {
			t.Fatal(err)
		}
		req := httptest.NewRequestWithContext(context.Background(), http.MethodPost, "/api/webhook", bytes.NewReader(body))
		req.Header.Set("X-Heimdall-Secret", secret)
		req.Header.Set("X-GitHub-Delivery", githubDelivery)
		rec := httptest.NewRecorder()
		h.ServeHTTP(rec, req)
		if rec.Code != http.StatusOK {
			t.Fatalf("status = %d %s", rec.Code, rec.Body.String())
		}
		var out map[string]string
		if err := json.Unmarshal(rec.Body.Bytes(), &out); err != nil {
			t.Fatal(err)
		}
		return out
	}

	if out := post("delivery-1"); out["status"] != "ok" || out["id"] == "" {
		t.Fatalf("first response = %v", out)
	}
	if out := post("delivery-2"); out["status"] != "duplicate" {
		t.Fatalf("second response = %v, want duplicate", out)
	}
	if n := countRows(t, db); n != 1 {
		t.Errorf("rows = %d, want 1", n)
	}
}

func TestEvents_CursorPagingHasNoGapsOrDuplicates(t *testing.T) {
	db := testdb.Open(t)
	repo := database.NewEventRepository(db)
	h := handlers.NewEventsHandler(repo)

	const total = 120
	base := time.Now().UTC().Add(-24 * time.Hour).Truncate(time.Second)
	want := map[string]bool{}
	for i := 0; i < total; i++ {
		// Groups of 7 rows share one created_at, so the id tie-breaker decides the order.
		at := base.Add(time.Duration(i/7) * time.Minute)
		ev := models.DashboardEvent{
			EventType: "github.push", Title: fmt.Sprintf("e%03d", i), CreatedAt: at,
			DeliveryID: fmt.Sprintf("page-%d", i), Metadata: map[string]interface{}{"repo": "r"},
		}
		insert(t, repo, &ev)
	}
	rows, err := db.QueryContext(context.Background(), `SELECT id FROM events`)
	if err != nil {
		t.Fatal(err)
	}
	defer func() { _ = rows.Close() }()
	for rows.Next() {
		var id string
		if err = rows.Scan(&id); err != nil {
			t.Fatal(err)
		}
		want[id] = true
	}

	seen := map[string]bool{}
	var prevAt time.Time
	var prevID string
	query := "limit=25"
	pages := 0
	for {
		resp := eventsPage(t, h, query)
		pages++
		if resp.Pagination.Total != total {
			t.Errorf("total = %d, want %d", resp.Pagination.Total, total)
		}
		for _, e := range resp.Events {
			if seen[e.ID] {
				t.Fatalf("event %s appears twice", e.ID)
			}
			seen[e.ID] = true
			if prevID != "" && (e.CreatedAt.After(prevAt) || (e.CreatedAt.Equal(prevAt) && e.ID >= prevID)) {
				t.Fatalf("order broke at %s (%s) after %s (%s)", e.ID, e.CreatedAt, prevID, prevAt)
			}
			prevAt, prevID = e.CreatedAt, e.ID
		}
		if resp.Pagination.NextCursor == nil {
			if resp.Pagination.HasMore {
				t.Fatal("hasMore with no cursor")
			}
			break
		}
		query = "limit=25&before=" + url.QueryEscape(resp.Pagination.NextCursor.Before) +
			"&before_id=" + url.QueryEscape(resp.Pagination.NextCursor.BeforeID)
		if pages > 20 {
			t.Fatal("paging does not end")
		}
	}
	if pages != 5 {
		t.Errorf("pages = %d, want 5", pages)
	}
	if len(seen) != total {
		t.Errorf("saw %d events, want %d", len(seen), total)
	}
	for id := range want {
		if !seen[id] {
			t.Errorf("event %s missing from paging", id)
		}
	}
}

func TestEvents_TypeAndSinceFilters(t *testing.T) {
	db := testdb.Open(t)
	repo := database.NewEventRepository(db)
	h := handlers.NewEventsHandler(repo)
	now := time.Now().UTC().Truncate(time.Second)

	insert(t, repo, &models.DashboardEvent{EventType: "github.push", Title: "old push", CreatedAt: now.Add(-10 * 24 * time.Hour), DeliveryID: "f1"})
	insert(t, repo, &models.DashboardEvent{EventType: "github.push", Title: "new push", CreatedAt: now.Add(-time.Hour), DeliveryID: "f2"})
	insert(t, repo, &models.DashboardEvent{EventType: "vercel.deploy", Title: "new deploy", CreatedAt: now.Add(-time.Hour), DeliveryID: "f3"})
	insert(t, repo, &models.DashboardEvent{EventType: "vercel.deploy", Title: "old deploy", CreatedAt: now.Add(-9 * 24 * time.Hour), DeliveryID: "f4"})

	titles := func(query string) (got []string, total int) {
		resp := eventsPage(t, h, query)
		for _, e := range resp.Events {
			got = append(got, e.Title)
		}
		return got, resp.Pagination.Total
	}
	// Every event here is private, so the handler redacts titles. Compare event types and counts instead.
	byType := eventsPage(t, h, "type=vercel.deploy")
	if byType.Pagination.Total != 2 || len(byType.Events) != 2 {
		t.Fatalf("type filter: total=%d events=%d, want 2", byType.Pagination.Total, len(byType.Events))
	}
	for _, e := range byType.Events {
		if e.EventType != "vercel.deploy" {
			t.Errorf("type filter returned %s", e.EventType)
		}
	}

	since := now.Add(-48 * time.Hour).Format(time.RFC3339)
	got, total := titles("since=" + url.QueryEscape(since))
	if total != 2 || len(got) != 2 {
		t.Errorf("since filter: total=%d events=%d, want 2", total, len(got))
	}
	day := now.Add(-5 * 24 * time.Hour).Format("2006-01-02")
	if _, total = titles("since=" + day); total != 2 {
		t.Errorf("since date filter: total=%d, want 2", total)
	}

	both := eventsPage(t, h, "type=github.push&since="+url.QueryEscape(since))
	if both.Pagination.Total != 1 || len(both.Events) != 1 || both.Events[0].EventType != "github.push" {
		t.Errorf("combined filter: %+v", both.Pagination)
	}
}

func TestEvents_RedactionAndHiddenRepos(t *testing.T) {
	db := testdb.Open(t)
	repo := database.NewEventRepository(db)
	h := handlers.NewEventsHandler(repo)
	now := time.Now().UTC().Truncate(time.Second)

	insert(t, repo, &models.DashboardEvent{
		EventType: "github.push", Title: "SECRET commit message", IsPrivate: true,
		CreatedAt: now.Add(-3 * time.Minute), DeliveryID: "r1",
		Metadata: map[string]interface{}{"repo": "priv", "full_name": "me/priv", "commit_count": 3, "author": "alice", "commit_sha": "deadbeef"},
	})
	insert(t, repo, &models.DashboardEvent{
		EventType: "github.push", Title: "Public title", IsPrivate: false,
		CreatedAt: now.Add(-2 * time.Minute), DeliveryID: "r2",
		Metadata: map[string]interface{}{"repo": "pub", "full_name": "me/pub", "author": "alice"},
	})
	insert(t, repo, &models.DashboardEvent{
		EventType: "github.push", Title: "hidden with full name", IsPrivate: false,
		CreatedAt: now.Add(-time.Minute), DeliveryID: "r3",
		Metadata: map[string]interface{}{"repo": "hid", "full_name": "me/hid"},
	})
	insert(t, repo, &models.DashboardEvent{
		EventType: "github.push", Title: "hidden legacy row", IsPrivate: true,
		CreatedAt: now.Add(-30 * time.Second), DeliveryID: "r4",
		Metadata: map[string]interface{}{"repo": "hid"},
	})
	if _, err := db.ExecContext(context.Background(),
		`INSERT INTO repo_settings (full_name, visibility, hidden) VALUES ('me/hid', 'public', true), ('me/pub', 'public', false)`); err != nil {
		t.Fatal(err)
	}

	rec := get(t, h, "/api/events")
	if rec.Code != http.StatusOK {
		t.Fatalf("status = %d", rec.Code)
	}
	raw := rec.Body.String()
	for _, leak := range []string{"SECRET", "deadbeef", "me/priv", "hidden"} {
		if strings.Contains(raw, leak) {
			t.Errorf("response leaks %q: %s", leak, raw)
		}
	}
	var resp handlers.EventsResponse
	if err := json.Unmarshal(rec.Body.Bytes(), &resp); err != nil {
		t.Fatal(err)
	}
	if resp.Pagination.Total != 2 || len(resp.Events) != 2 {
		t.Fatalf("total=%d events=%d, want 2: hidden repo rows must be excluded", resp.Pagination.Total, len(resp.Events))
	}
	for _, e := range resp.Events {
		switch {
		case e.IsPrivate:
			if e.Title == "SECRET commit message" || e.Metadata["author"] != nil || e.Metadata["commit_sha"] != nil || e.Metadata["repo"] != nil {
				t.Errorf("private event not redacted: %+v", e)
			}
			if e.Metadata["commit_count"] == nil {
				t.Errorf("private event lost commit_count: %+v", e.Metadata)
			}
		default:
			if e.Title != "Public title" || e.Metadata["author"] != "alice" {
				t.Errorf("public event changed: %+v", e)
			}
		}
	}

	// Aggregates still count every row, hidden ones included.
	stats, err := repo.GetStats(context.Background())
	if err != nil {
		t.Fatal(err)
	}
	if stats.TotalEvents != 4 {
		t.Errorf("stats total = %d, want 4", stats.TotalEvents)
	}
}

func TestHealth_RealDatabase(t *testing.T) {
	db := testdb.Open(t)
	h := handlers.NewHealthHandler(&config.Config{Version: "test"}, db)

	if rec := get(t, h, "/api/health"); rec.Code != http.StatusOK {
		t.Fatalf("open database: status = %d %s, want 200", rec.Code, rec.Body.String())
	}

	if err := db.Close(); err != nil {
		t.Fatal(err)
	}
	rec := get(t, h, "/api/health")
	if rec.Code != http.StatusServiceUnavailable {
		t.Fatalf("closed database: status = %d, want 503", rec.Code)
	}
	var body map[string]interface{}
	if err := json.Unmarshal(rec.Body.Bytes(), &body); err != nil {
		t.Fatal(err)
	}
	if body["status"] != "unhealthy" {
		t.Errorf("body = %v", body)
	}
}
