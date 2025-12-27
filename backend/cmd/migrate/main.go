package main

import (
	"flag"
	"fmt"
	"log"
	"os"

	"github.com/golang-migrate/migrate/v4"
	_ "github.com/golang-migrate/migrate/v4/database/postgres"
	_ "github.com/golang-migrate/migrate/v4/source/file"
)

func main() {
	// Parse command line flags
	var (
		migrationsPath string
		databaseURL    string
	)

	flag.StringVar(&migrationsPath, "path", "database/migrations", "Path to migration files")
	flag.StringVar(&databaseURL, "database", "", "Database URL (or set DATABASE_URL env var)")
	flag.Parse()

	// Get database URL from flag or environment
	if databaseURL == "" {
		databaseURL = os.Getenv("DATABASE_URL")
	}
	if databaseURL == "" {
		log.Fatal("Database URL is required. Set DATABASE_URL environment variable or use -database flag")
	}

	// Get command
	args := flag.Args()
	if len(args) < 1 {
		printUsage()
		os.Exit(1)
	}

	command := args[0]

	// Create migration instance
	m, err := migrate.New(
		fmt.Sprintf("file://%s", migrationsPath),
		databaseURL,
	)
	if err != nil {
		log.Fatalf("Failed to create migration instance: %v", err)
	}
	defer m.Close()

	// Execute command
	switch command {
	case "up":
		if err := m.Up(); err != nil && err != migrate.ErrNoChange {
			log.Fatalf("Failed to run migrations: %v", err)
		}
		log.Println("Migrations applied successfully")

	case "down":
		if err := m.Down(); err != nil && err != migrate.ErrNoChange {
			log.Fatalf("Failed to rollback migrations: %v", err)
		}
		log.Println("Migrations rolled back successfully")

	case "version":
		version, dirty, err := m.Version()
		if err != nil {
			if err == migrate.ErrNilVersion {
				log.Println("No migrations have been applied yet")
				return
			}
			log.Fatalf("Failed to get version: %v", err)
		}
		log.Printf("Current version: %d (dirty: %v)", version, dirty)

	case "force":
		if len(args) < 2 {
			log.Fatal("Force requires a version number")
		}
		var version int
		if _, err := fmt.Sscanf(args[1], "%d", &version); err != nil {
			log.Fatalf("Invalid version number: %v", err)
		}
		if err := m.Force(version); err != nil {
			log.Fatalf("Failed to force version: %v", err)
		}
		log.Printf("Forced version to %d", version)

	case "steps":
		if len(args) < 2 {
			log.Fatal("Steps requires a number (positive for up, negative for down)")
		}
		var n int
		if _, err := fmt.Sscanf(args[1], "%d", &n); err != nil {
			log.Fatalf("Invalid step count: %v", err)
		}
		if err := m.Steps(n); err != nil && err != migrate.ErrNoChange {
			log.Fatalf("Failed to run steps: %v", err)
		}
		log.Printf("Applied %d migration steps", n)

	default:
		printUsage()
		os.Exit(1)
	}
}

func printUsage() {
	fmt.Println("Usage: migrate [flags] <command>")
	fmt.Println()
	fmt.Println("Commands:")
	fmt.Println("  up        Apply all pending migrations")
	fmt.Println("  down      Rollback all migrations")
	fmt.Println("  version   Show current migration version")
	fmt.Println("  force N   Force set version to N (use with caution)")
	fmt.Println("  steps N   Apply N migrations (positive=up, negative=down)")
	fmt.Println()
	fmt.Println("Flags:")
	flag.PrintDefaults()
}
