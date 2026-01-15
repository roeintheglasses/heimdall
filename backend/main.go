package main

import (
	"context"
	"database/sql"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"heimdall-backend/config"
	"heimdall-backend/database"
	"heimdall-backend/handlers"
	"heimdall-backend/logger"
	"heimdall-backend/middleware"
	"heimdall-backend/transformers"

	"github.com/gorilla/mux"
	_ "github.com/lib/pq"
)

func main() {
	// Load configuration
	cfg := config.LoadWithDefaults()

	// Initialize structured logger
	log := logger.New(cfg.PrettyLogs)

	log.Info().
		Str("version", cfg.Version).
		Str("port", cfg.Port).
		Float64("rate_limit_rps", cfg.RateLimitRPS).
		Int("rate_limit_burst", cfg.RateLimitBurst).
		Msg("starting Heimdall Go service")

	// Connect to database
	db, err := sql.Open("postgres", cfg.DatabaseURL)
	if err != nil {
		log.Fatal().Err(err).Msg("failed to connect to database")
	}

	// Configure connection pool for Neon (serverless Postgres)
	// Tuned for better performance while respecting serverless constraints
	db.SetMaxOpenConns(25)                 // Increased for higher concurrency
	db.SetMaxIdleConns(10)                 // Keep more warm connections ready
	db.SetConnMaxLifetime(5 * time.Minute) // Longer lifetime for connection reuse
	db.SetConnMaxIdleTime(1 * time.Minute) // Balance between memory and connection churn

	// Test database connection
	if err := db.Ping(); err != nil {
		db.Close()
		log.Fatal().Err(err).Msg("failed to ping database")
	}
	// Defer close after successful ping to ensure cleanup on graceful shutdown
	defer db.Close()

	log.Info().Msg("connected to database successfully")

	// Initialize dependencies
	eventRepo := database.NewEventRepository(db)
	transformerRegistry := transformers.NewRegistry()

	// Create handlers
	healthHandler := handlers.NewHealthHandler(cfg)
	eventsHandler := handlers.NewEventsHandler(eventRepo)
	statsHandler := handlers.NewStatsHandler(eventRepo, log)
	webhookHandler := handlers.NewWebhookHandler(eventRepo, transformerRegistry)

	// Create rate limiter for webhook endpoint
	rateLimiter := middleware.NewRateLimiter(cfg.RateLimitRPS, cfg.RateLimitBurst)

	// Create router
	r := mux.NewRouter()

	// Apply global middleware (order matters - executed in reverse order)
	r.Use(middleware.CORS)
	r.Use(middleware.LogRequest(log))
	r.Use(middleware.RequestID)

	// API routes
	api := r.PathPrefix("/api").Subrouter()
	api.Handle("/health", healthHandler).Methods("GET", "OPTIONS")
	api.Handle("/events", eventsHandler).Methods("GET", "OPTIONS")
	api.Handle("/stats", statsHandler).Methods("GET", "OPTIONS")
	// Apply rate limiting only to webhook endpoint
	api.Handle("/webhook", rateLimiter.Limit(webhookHandler)).Methods("POST", "OPTIONS")

	// Create server with timeouts
	srv := &http.Server{
		Addr:         ":" + cfg.Port,
		Handler:      r,
		ReadTimeout:  15 * time.Second,
		WriteTimeout: 15 * time.Second,
		IdleTimeout:  60 * time.Second,
	}

	// Start server in goroutine
	go func() {
		log.Info().Str("port", cfg.Port).Msg("server listening")
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatal().Err(err).Msg("server error")
		}
	}()

	// Wait for shutdown signal
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit

	log.Info().Msg("shutting down server...")

	// Create shutdown context with timeout
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	// Attempt graceful shutdown
	if err := srv.Shutdown(ctx); err != nil {
		log.Error().Err(err).Msg("server forced to shutdown")
	}

	log.Info().Msg("server exited gracefully")
}
