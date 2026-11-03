package main

import (
	"bytes"
	"context"
	"testing"

	"heimdall-backend/internal/testdb"
)

// TestSyncReposDB needs a migrated database. Set TEST_DATABASE_URL to run it.
// It rewrites the events and repo_settings tables, so never point it at real data.
func TestSyncReposDB(t *testing.T) {
	ctx := context.Background()
	db := testdb.Open(t)
	var err error
	if _, err = db.ExecContext(ctx, `
		INSERT INTO repo_settings (full_name, visibility, hidden) VALUES ('me/pub', 'private', true);
		INSERT INTO events (event_type, title, metadata, is_private) VALUES
		('github.push', 'a', '{"repo":"pub","full_name":"me/pub"}', true),
		('github.push', 'b', '{"repo":"pub"}', true),
		('github.push', 'b2', '{"repo":"pub","repository_url":"https://github.com/me/pub"}', true),
		('github.push', 'c', '{"repo":"pub","repository_url":"https://github.com/other/pub"}', true),
		('github.push', 'd', '{"repo":"dup"}', true),
		('github.push', 'e', '{"repo":"sec","full_name":"me/sec"}', false),
		('error.ci', 'g', '{"repo":"sec","full_name":"me/sec"}', false),
		('vercel.deploy', 'f', '{"repo":"pub"}', true)`); err != nil {
		t.Fatal(err)
	}
	repos := []repo{
		{FullName: "me/pub", Name: "pub", Visibility: "public"},
		{FullName: "me/sec", Name: "sec", Private: true},
		{FullName: "me/dup", Name: "dup", Visibility: "public"},
		{FullName: "you/dup", Name: "dup", Visibility: "public"},
	}

	var out bytes.Buffer
	if err = syncRepos(ctx, db, repos, true, &out); err != nil {
		t.Fatal(err)
	}
	var n int
	if err = db.QueryRowContext(ctx, `SELECT count(*) FROM events WHERE is_private = false`).Scan(&n); err != nil || n != 2 {
		t.Fatalf("dry run changed data: public rows = %d, err = %v", n, err)
	}

	if err = syncRepos(ctx, db, repos, false, &out); err != nil {
		t.Fatal(err)
	}
	// b has no full_name or repository_url, so it may belong to another account's
	// "pub" and must not become public. b2's URL proves it is me/pub.
	want := map[string]bool{"a": false, "b": true, "b2": false, "c": true, "d": true, "e": true, "f": true, "g": true}
	rows, err := db.QueryContext(ctx, `SELECT title, is_private FROM events`)
	if err != nil {
		t.Fatal(err)
	}
	defer func() { _ = rows.Close() }()
	for rows.Next() {
		var title string
		var priv bool
		if err := rows.Scan(&title, &priv); err != nil {
			t.Fatal(err)
		}
		if priv != want[title] {
			t.Errorf("event %s is_private = %v, want %v", title, priv, want[title])
		}
	}
	var hidden bool
	var vis string
	if err := db.QueryRowContext(ctx, `SELECT hidden, visibility FROM repo_settings WHERE full_name = 'me/pub'`).Scan(&hidden, &vis); err != nil {
		t.Fatal(err)
	}
	if !hidden || vis != "public" {
		t.Errorf("hidden = %v visibility = %s, want hidden preserved and public", hidden, vis)
	}
}
