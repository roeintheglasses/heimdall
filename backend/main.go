package main

import (
	"database/sql"
	"log"
	"net/http"

	"github.com/gorilla/mux"
	_ "github.com/lib/pq"
	"heimdall-backend/config"
	"heimdall-backend/database"
	"heimdall-backend/handlers"
	"heimdall-backend/middleware"
	"heimdall-backend/transformers"
)

func main() {
	// Load configuration
	cfg := config.LoadWithDefaults()

	// Connect to database
	db, err := sql.Open("postgres", cfg.DatabaseURL)
	if err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
	}
	defer db.Close()

	// Test database connection
	if err := db.Ping(); err != nil {
		log.Fatalf("Failed to ping database: %v", err)
	}

	log.Println("Connected to database successfully")

	// Initialize dependencies
	eventRepo := database.NewEventRepository(db)
	transformerRegistry := transformers.NewRegistry()

	// Create handlers
	healthHandler := handlers.NewHealthHandler(cfg)
	eventsHandler := handlers.NewEventsHandler(eventRepo)
	webhookHandler := handlers.NewWebhookHandler(eventRepo, transformerRegistry)

	// Create router
	r := mux.NewRouter()

	// API routes
	api := r.PathPrefix("/api").Subrouter()
	api.Handle("/health", healthHandler).Methods("GET", "OPTIONS")
	api.Handle("/events", eventsHandler).Methods("GET", "OPTIONS")
	api.Handle("/webhook", webhookHandler).Methods("POST", "OPTIONS")

	// Add CORS middleware
	r.Use(middleware.CORS)

	log.Printf("Heimdall Go service starting on :%s", cfg.Port)
	log.Fatal(http.ListenAndServe(":"+cfg.Port, r))
}
