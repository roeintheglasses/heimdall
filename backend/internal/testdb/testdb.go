// Package testdb opens the Postgres database used by integration tests.
package testdb

import (
	"context"
	"database/sql"
	"net"
	"net/url"
	"os"
	"strings"
	"testing"

	_ "github.com/lib/pq" // registers the postgres driver
)

// Open returns a connection to TEST_DATABASE_URL with the events and
// repo_settings tables emptied. The database must already be migrated, and tests
// that use it must not run in parallel with each other, so never point it at real data.
//
// Without TEST_DATABASE_URL the test is skipped, unless HEIMDALL_REQUIRE_DB is
// set (CI sets it), in which case the test fails so a missing database cannot
// pass silently.
func Open(t *testing.T) *sql.DB {
	t.Helper()
	dsn := os.Getenv("TEST_DATABASE_URL")
	if dsn == "" {
		if os.Getenv("HEIMDALL_REQUIRE_DB") != "" {
			t.Fatal("HEIMDALL_REQUIRE_DB is set but TEST_DATABASE_URL is not")
		}
		t.Skip("TEST_DATABASE_URL not set")
	}
	if err := checkSafe(dsn); err != "" {
		t.Fatal(err)
	}
	db, err := sql.Open("postgres", dsn)
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() {
		if cerr := db.Close(); cerr != nil {
			t.Logf("close database: %v", cerr)
		}
	})
	if err = Truncate(context.Background(), db); err != nil {
		t.Fatalf("truncate: %v (is the database migrated?)", err)
	}
	return db
}

// Truncate empties the tables the tests write to.
func Truncate(ctx context.Context, db *sql.DB) error {
	_, err := db.ExecContext(ctx, `TRUNCATE events, repo_settings`)
	return err
}

// checkSafe refuses any database that is not on localhost or whose name does
// not contain "test", because Open truncates tables.
func checkSafe(dsn string) string {
	u, err := url.Parse(dsn)
	if err != nil || u.Scheme == "" {
		return "TEST_DATABASE_URL must be a postgres:// URL"
	}
	host := u.Hostname()
	if ip := net.ParseIP(host); host == "localhost" || (ip != nil && ip.IsLoopback()) {
		return ""
	}
	if strings.Contains(strings.ToLower(strings.TrimPrefix(u.Path, "/")), "test") {
		return ""
	}
	return "TEST_DATABASE_URL must point at localhost or a database whose name contains \"test\", since the tests truncate tables"
}
