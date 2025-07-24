package main

import (
	"database/sql"
	"fmt"
	"io/ioutil"
	"log"
	"os"

	_ "github.com/lib/pq"
)

func main() {
	// Get database URL from environment variable
	databaseURL := os.Getenv("DATABASE_URL")
	if databaseURL == "" {
		log.Fatal("DATABASE_URL environment variable is required")
	}

	// Connect to database
	db, err := sql.Open("postgres", databaseURL)
	if err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
	}
	defer db.Close()

	// Test connection
	if err := db.Ping(); err != nil {
		log.Fatalf("Failed to ping database: %v", err)
	}

	fmt.Println("✅ Connected to database successfully")

	// Read migration file
	migrationSQL, err := ioutil.ReadFile("migrations/001_add_categories.sql")
	if err != nil {
		log.Fatalf("Failed to read migration file: %v", err)
	}

	fmt.Println("📄 Executing database migration...")

	// Execute migration
	_, err = db.Exec(string(migrationSQL))
	if err != nil {
		log.Fatalf("Failed to execute migration: %v", err)
	}

	fmt.Println("✅ Database migration completed successfully!")

	// Verify categories were created
	rows, err := db.Query("SELECT id, name FROM event_categories ORDER BY priority")
	if err != nil {
		log.Printf("Warning: Could not verify categories: %v", err)
		return
	}
	defer rows.Close()

	fmt.Println("\n📊 Categories created:")
	for rows.Next() {
		var id, name string
		if err := rows.Scan(&id, &name); err != nil {
			log.Printf("Error scanning row: %v", err)
			continue
		}
		fmt.Printf("  • %s: %s\n", id, name)
	}

	// Show event distribution
	rows, err = db.Query("SELECT category, COUNT(*) as count FROM events GROUP BY category ORDER BY count DESC")
	if err != nil {
		log.Printf("Warning: Could not get event stats: %v", err)
		return
	}
	defer rows.Close()

	fmt.Println("\n📈 Event distribution by category:")
	for rows.Next() {
		var category string
		var count int
		if err := rows.Scan(&category, &count); err != nil {
			log.Printf("Error scanning row: %v", err)
			continue
		}
		fmt.Printf("  • %s: %d events\n", category, count)
	}

	fmt.Println("\n🎉 Migration completed successfully!")
}