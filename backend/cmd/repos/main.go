// Command repos manages repo_settings: it syncs repo visibility from GitHub,
// hides and unhides repos on the public feed, and lists the settings.
package main

import (
	"context"
	"database/sql"
	"errors"
	"flag"
	"fmt"
	"log"
	"os"
	"strings"
	"time"

	_ "github.com/lib/pq"
)

func main() {
	var databaseURL string
	flag.StringVar(&databaseURL, "database", "", "Database URL (or set DATABASE_URL env var)")
	flag.Parse()

	if databaseURL == "" {
		databaseURL = os.Getenv("DATABASE_URL")
	}
	if databaseURL == "" {
		log.Fatal("Database URL is required. Set DATABASE_URL environment variable or use -database flag")
	}

	args := flag.Args()
	if len(args) < 1 {
		printUsage()
		os.Exit(1)
	}

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Minute)
	defer cancel()

	if err := run(ctx, databaseURL, args); err != nil {
		cancel()
		log.Fatal(err) //nolint:gocritic // cancel is called explicitly above
	}
}

func run(ctx context.Context, databaseURL string, args []string) error {
	switch args[0] {
	case "sync", "hide", "unhide", "list":
	default:
		printUsage()
		return fmt.Errorf("unknown command %q", args[0])
	}

	// Validate arguments before touching the network or the database.
	var (
		dryRun bool
		target string
	)
	switch args[0] {
	case "sync":
		fs := flag.NewFlagSet("sync", flag.ContinueOnError)
		fs.BoolVar(&dryRun, "dry-run", false, "Run in a transaction, print the changes, and roll back")
		if err := fs.Parse(args[1:]); err != nil {
			return err
		}
	case "hide", "unhide":
		if len(args) != 2 || !validFullName(args[1]) {
			return fmt.Errorf("usage: repos %s <owner/name>", args[0])
		}
		target = args[1]
	}

	db, err := sql.Open("postgres", databaseURL)
	if err != nil {
		return fmt.Errorf("open database: %w", err)
	}
	defer func() {
		if cerr := db.Close(); cerr != nil {
			log.Printf("close database: %v", cerr)
		}
	}()
	if err = db.PingContext(ctx); err != nil {
		return fmt.Errorf("connect to database: %w", err)
	}

	switch args[0] {
	case "sync":
		token := os.Getenv("GITHUB_TOKEN")
		if token == "" {
			return fmt.Errorf("GITHUB_TOKEN is required for sync")
		}
		repos, err := fetchRepos(ctx, githubAPI, token)
		if err != nil {
			return err
		}
		return syncRepos(ctx, db, repos, dryRun, os.Stdout)
	case "hide":
		return setHidden(ctx, db, target, true)
	case "unhide":
		return setHidden(ctx, db, target, false)
	default:
		return list(ctx, db)
	}
}

func printUsage() {
	fmt.Fprintln(os.Stderr, `Usage: repos [-database url] <command>

Commands:
  sync [-dry-run]        Sync visibility from GitHub (needs GITHUB_TOKEN), update events.is_private
  hide <owner/name>      Hide a repo from GET /api/events
  unhide <owner/name>    Show a hidden repo again
  list                   Print repo_settings`)
}

func validFullName(s string) bool {
	owner, name, ok := strings.Cut(s, "/")
	return ok && owner != "" && name != "" && !strings.Contains(name, "/")
}

func setHidden(ctx context.Context, db *sql.DB, fullName string, hidden bool) error {
	// GitHub names are case-insensitive but events store the canonical casing,
	// so reuse the casing already in repo_settings when there is one.
	var existing string
	err := db.QueryRowContext(ctx,
		`SELECT full_name FROM repo_settings WHERE lower(full_name) = lower($1) LIMIT 1`, fullName).Scan(&existing)
	switch {
	case err == nil:
		fullName = existing
	case errors.Is(err, sql.ErrNoRows):
		fmt.Fprintf(os.Stderr, "warning: %s is not in repo_settings; run sync first so the name matches event casing\n", fullName)
	default:
		return fmt.Errorf("look up repo: %w", err)
	}
	_, err = db.ExecContext(ctx, `
		INSERT INTO repo_settings (full_name, visibility, hidden)
		VALUES ($1, 'private', $2)
		ON CONFLICT (full_name) DO UPDATE SET hidden = EXCLUDED.hidden, updated_at = now()`,
		fullName, hidden)
	if err != nil {
		return fmt.Errorf("set hidden: %w", err)
	}
	fmt.Printf("%s: hidden=%v\n", fullName, hidden)
	return nil
}

func list(ctx context.Context, db *sql.DB) error {
	rows, err := db.QueryContext(ctx, `SELECT full_name, visibility, hidden, updated_at FROM repo_settings ORDER BY full_name`)
	if err != nil {
		return fmt.Errorf("list repo_settings: %w", err)
	}
	defer func() {
		if cerr := rows.Close(); cerr != nil {
			log.Printf("close rows: %v", cerr)
		}
	}()
	fmt.Printf("%-40s %-10s %-6s %s\n", "FULL_NAME", "VISIBILITY", "HIDDEN", "UPDATED_AT")
	for rows.Next() {
		var name, vis string
		var hidden bool
		var updated time.Time
		if err := rows.Scan(&name, &vis, &hidden, &updated); err != nil {
			return err
		}
		fmt.Printf("%-40s %-10s %-6v %s\n", name, vis, hidden, updated.UTC().Format(time.RFC3339))
	}
	return rows.Err()
}
