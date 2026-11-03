// Command dedupe finds and removes duplicate github.push events.
//
// It is a dry run unless -apply is given. -apply requires -export, a file that
// receives every deleted row as one JSON object per line before the delete runs.
package main

import (
	"context"
	"database/sql"
	"flag"
	"fmt"
	"log"
	"os"
	"time"

	_ "github.com/lib/pq"

	"heimdall-backend/database"
)

const maxSamples = 10

func main() {
	var (
		databaseURL string
		apply       bool
		exportPath  string
	)
	flag.StringVar(&databaseURL, "database", "", "Database URL (or set DATABASE_URL env var)")
	flag.BoolVar(&apply, "apply", false, "Delete the duplicates (default is a dry run)")
	flag.StringVar(&exportPath, "export", "", "File for deleted rows as JSON lines (required with -apply)")
	flag.Parse()

	if databaseURL == "" {
		databaseURL = os.Getenv("DATABASE_URL")
	}
	if databaseURL == "" {
		log.Fatal("Database URL is required. Set DATABASE_URL environment variable or use -database flag")
	}
	if apply && exportPath == "" {
		log.Fatal("-apply requires -export <file>")
	}

	if err := run(databaseURL, apply, exportPath); err != nil {
		log.Fatal(err)
	}
}

func run(databaseURL string, apply bool, exportPath string) error {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Minute)
	defer cancel()

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

	report, err := database.FindDuplicatePushes(ctx, db, maxSamples)
	if err != nil {
		return err
	}
	fmt.Printf("Duplicate github.push rows: %d\n", report.Total)
	fmt.Printf("  rule A (same repo, branch, sha within 2m): %d\n", report.ByRule[database.RuleSameSHA])
	fmt.Printf("  rule B (no sha, same repo, branch, title within 10s): %d\n", report.ByRule[database.RuleNoSHA])
	for _, s := range report.Samples {
		fmt.Printf("  [%s] %s %s %s %s %q\n", s.Rule, s.CreatedAt.UTC().Format(time.RFC3339), s.Repo, s.Branch, s.ShortSHA, s.Title)
	}

	if !apply {
		fmt.Println("Dry run. Nothing deleted. Re-run with -apply -export <file> to delete.")
		return nil
	}
	if report.Total == 0 {
		fmt.Println("Nothing to delete.")
		return nil
	}

	f, err := os.OpenFile(exportPath, os.O_WRONLY|os.O_CREATE|os.O_EXCL, 0o600) //nolint:gosec // operator-supplied path
	if err != nil {
		return fmt.Errorf("create export file (it must not exist): %w", err)
	}
	deleted, err := database.DeleteDuplicatePushes(ctx, db, f)
	if cerr := f.Close(); err == nil && cerr != nil {
		err = cerr
	}
	if err != nil {
		return err
	}
	fmt.Printf("Deleted %d rows. Exported to %s\n", deleted, exportPath)
	return nil
}
