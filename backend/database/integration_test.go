package database_test

import (
	"bytes"
	"context"
	"database/sql"
	"strings"
	"testing"
	"time"

	"heimdall-backend/database"
	"heimdall-backend/internal/testdb"
	"heimdall-backend/models"
)

func TestInsertEvent_DuplicateDeliveryID(t *testing.T) {
	db := testdb.Open(t)
	repo := database.NewEventRepository(db)
	ctx := context.Background()

	first := &models.DashboardEvent{
		EventType: "github.push", Title: "first", DeliveryID: "d-1",
		Metadata: map[string]interface{}{"repo": "a"}, CreatedAt: time.Now().UTC(),
	}
	inserted, err := repo.InsertEvent(ctx, first)
	if err != nil || !inserted || first.ID == "" {
		t.Fatalf("first insert: inserted=%v id=%q err=%v", inserted, first.ID, err)
	}

	second := &models.DashboardEvent{
		EventType: "github.push", Title: "second", DeliveryID: "d-1",
		Metadata: map[string]interface{}{"repo": "a"}, CreatedAt: time.Now().UTC(),
	}
	inserted, err = repo.InsertEvent(ctx, second)
	if err != nil || inserted {
		t.Fatalf("duplicate insert: inserted=%v err=%v, want false and nil", inserted, err)
	}
	if second.ID != "" {
		t.Errorf("duplicate event got an id %q", second.ID)
	}

	var n int
	var title string
	if err = db.QueryRowContext(ctx, `SELECT count(*), min(title) FROM events WHERE delivery_id = 'd-1'`).Scan(&n, &title); err != nil {
		t.Fatal(err)
	}
	if n != 1 || title != "first" {
		t.Errorf("rows = %d, title = %q, want 1 and first", n, title)
	}
}

func TestInsertEvent_EmptyDeliveryIDsDoNotCollide(t *testing.T) {
	db := testdb.Open(t)
	repo := database.NewEventRepository(db)
	for i := 0; i < 2; i++ {
		ev := &models.DashboardEvent{EventType: "github.push", Title: "x", CreatedAt: time.Now().UTC()}
		inserted, err := repo.InsertEvent(context.Background(), ev)
		if err != nil || !inserted {
			t.Fatalf("insert %d: inserted=%v err=%v", i, inserted, err)
		}
	}
}

// push inserts a github.push row with explicit metadata and time.
func push(t *testing.T, db *sql.DB, title, repo, fullName, branch, sha string, at time.Time) {
	t.Helper()
	_, err := db.ExecContext(context.Background(), `
		INSERT INTO events (event_type, title, metadata, created_at, is_private)
		VALUES ('github.push', $1,
			jsonb_build_object('repo', $2::text, 'full_name', $3::text, 'branch', $4::text, 'commit_sha', $5::text),
			$6, true)`, title, repo, fullName, branch, sha, at)
	if err != nil {
		t.Fatal(err)
	}
}

func TestDuplicatePushes(t *testing.T) {
	db := testdb.Open(t)
	ctx := context.Background()
	t0 := time.Now().UTC().Add(-time.Hour).Truncate(time.Second)

	// Rule A: same repo, branch and sha within 2 minutes. The later row is the duplicate.
	push(t, db, "A keep", "ra", "me/ra", "main", "aaa1111", t0)
	push(t, db, "A dup", "ra", "me/ra", "main", "aaa1111", t0.Add(100*time.Second))
	// Same sha more than 2 minutes apart is kept.
	push(t, db, "A far first", "rfar", "me/rfar", "main", "bbb2222", t0)
	push(t, db, "A far second", "rfar", "me/rfar", "main", "bbb2222", t0.Add(3*time.Minute))
	// Rule B: no sha, same title within 10 seconds (the title must match).
	push(t, db, "B push", "rb", "me/rb", "main", "", t0)
	push(t, db, "B push", "rb", "me/rb", "main", "", t0.Add(8*time.Second))
	// No sha, 60 seconds apart: kept.
	push(t, db, "B slow", "rslow", "me/rslow", "main", "", t0)
	push(t, db, "B slow", "rslow", "me/rslow", "main", "", t0.Add(60*time.Second))
	// Same short repo and sha but different full_name: two accounts, kept.
	push(t, db, "Mismatch me", "shared", "me/shared", "main", "ccc3333", t0)
	push(t, db, "Mismatch you", "shared", "you/shared", "main", "ccc3333", t0.Add(30*time.Second))
	// Different branch with the same sha: kept.
	push(t, db, "Branch main", "rbr", "me/rbr", "main", "ddd4444", t0)
	push(t, db, "Branch dev", "rbr", "me/rbr", "dev", "ddd4444", t0.Add(30*time.Second))

	report, err := database.FindDuplicatePushes(ctx, db, 10)
	if err != nil {
		t.Fatal(err)
	}
	if report.ByRule[database.RuleSameSHA] != 1 || report.ByRule[database.RuleNoSHA] != 1 || report.Total != 2 {
		t.Fatalf("report = %+v, want one row for each rule", report.ByRule)
	}
	titles := map[string]string{}
	for _, s := range report.Samples {
		titles[s.Title] = s.Rule
	}
	if titles["A dup"] != database.RuleSameSHA || titles["B push"] != database.RuleNoSHA || len(titles) != 2 {
		t.Errorf("samples = %v", titles)
	}

	// The report changes nothing.
	var total int
	if err = db.QueryRowContext(ctx, `SELECT count(*) FROM events`).Scan(&total); err != nil || total != 12 {
		t.Fatalf("rows after dry run = %d, err = %v, want 12", total, err)
	}

	var export bytes.Buffer
	deleted, err := database.DeleteDuplicatePushes(ctx, db, &export)
	if err != nil || deleted != 2 {
		t.Fatalf("deleted = %d, err = %v, want 2", deleted, err)
	}
	lines := strings.Split(strings.TrimSpace(export.String()), "\n")
	// Oldest first: "B push" (8 s after t0) comes before "A dup" (100 s after t0).
	if len(lines) != 2 || !strings.Contains(lines[0], "B push") || !strings.Contains(lines[1], "A dup") {
		t.Errorf("export = %q", export.String())
	}

	rows, err := db.QueryContext(ctx, `SELECT title FROM events`)
	if err != nil {
		t.Fatal(err)
	}
	defer func() { _ = rows.Close() }()
	left, bPushes := 0, 0
	for rows.Next() {
		var title string
		if err = rows.Scan(&title); err != nil {
			t.Fatal(err)
		}
		if title == "A dup" {
			t.Errorf("duplicate row %q survived", title)
		}
		if title == "B push" {
			bPushes++
		}
		left++
	}
	if bPushes != 1 {
		t.Errorf("B push rows left = %d, want 1", bPushes)
	}
	if left != 10 {
		t.Errorf("rows left = %d, want 10", left)
	}

	// A second run finds nothing.
	report, err = database.FindDuplicatePushes(ctx, db, 10)
	if err != nil || report.Total != 0 {
		t.Errorf("after apply: total = %d, err = %v", report.Total, err)
	}
}
