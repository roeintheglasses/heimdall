package main

import (
	"errors"
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

	// Execute command
	var exitCode int
	switch command {
	case "up":
		if err := m.Up(); err != nil && !errors.Is(err, migrate.ErrNoChange) {
			log.Printf("Failed to run migrations: %v", err)
			exitCode = 1
		} else {
			log.Println("Migrations applied successfully")
		}

	case "down":
		if err := m.Down(); err != nil && !errors.Is(err, migrate.ErrNoChange) {
			log.Printf("Failed to rollback migrations: %v", err)
			exitCode = 1
		} else {
			log.Println("Migrations rolled back successfully")
		}

	case "version":
		version, dirty, err := m.Version()
		if err != nil {
			if errors.Is(err, migrate.ErrNilVersion) {
				log.Println("No migrations have been applied yet")
			} else {
				log.Printf("Failed to get version: %v", err)
				exitCode = 1
			}
		} else {
			log.Printf("Current version: %d (dirty: %v)", version, dirty)
		}

	case "force":
		if len(args) < 2 {
			log.Println("Force requires a version number")
			exitCode = 1
		} else {
			var version int
			if _, err := fmt.Sscanf(args[1], "%d", &version); err != nil {
				log.Printf("Invalid version number: %v", err)
				exitCode = 1
			} else if err := m.Force(version); err != nil {
				log.Printf("Failed to force version: %v", err)
				exitCode = 1
			} else {
				log.Printf("Forced version to %d", version)
			}
		}

	case "steps":
		if len(args) < 2 {
			log.Println("Steps requires a number (positive for up, negative for down)")
			exitCode = 1
		} else {
			var n int
			if _, err := fmt.Sscanf(args[1], "%d", &n); err != nil {
				log.Printf("Invalid step count: %v", err)
				exitCode = 1
			} else if err := m.Steps(n); err != nil && !errors.Is(err, migrate.ErrNoChange) {
				log.Printf("Failed to run steps: %v", err)
				exitCode = 1
			} else {
				log.Printf("Applied %d migration steps", n)
			}
		}

	default:
		printUsage()
		exitCode = 1
	}

	// Close migration instance before exiting
	if _, closeErr := m.Close(); closeErr != nil {
		log.Printf("Warning: failed to close migration instance: %v", closeErr)
	}

	if exitCode != 0 {
		os.Exit(exitCode)
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
