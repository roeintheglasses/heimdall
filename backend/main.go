package main

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"time"

	"github.com/gorilla/mux"
	_ "github.com/lib/pq"
)

// QStashPayload represents the payload structure from QStash
type QStashPayload struct {
	Event     json.RawMessage `json:"event"`
	EventType string          `json:"type"`
	Timestamp int64           `json:"timestamp"`
}

// DashboardEvent represents a processed event for the dashboard
type DashboardEvent struct {
	ID        string                 `json:"id"`
	EventType string                 `json:"event_type"`
	Title     string                 `json:"title"`
	Metadata  map[string]interface{} `json:"metadata"`
	CreatedAt time.Time              `json:"created_at"`
}

// App holds the application dependencies
type App struct {
	DB *sql.DB
}

func main() {
	// Get database URL from environment
	databaseURL := os.Getenv("DATABASE_URL")
	if databaseURL == "" {
		databaseURL = "postgres://heimdall_user:heimdall_password@localhost:5432/heimdall?sslmode=disable"
	}

	// Connect to database
	db, err := sql.Open("postgres", databaseURL)
	if err != nil {
		log.Fatal("Failed to connect to database:", err)
	}
	defer db.Close()

	// Test database connection
	if err := db.Ping(); err != nil {
		log.Fatal("Failed to ping database:", err)
	}

	log.Println("Connected to database successfully")

	app := &App{DB: db}

	// Create router
	r := mux.NewRouter()

	// API routes
	api := r.PathPrefix("/api").Subrouter()
	api.HandleFunc("/health", app.healthHandler).Methods("GET", "OPTIONS")
	api.HandleFunc("/events", app.getEventsHandler).Methods("GET", "OPTIONS")
	api.HandleFunc("/webhook", app.processWebhookHandler).Methods("POST", "OPTIONS")

	// Add CORS middleware
	r.Use(corsMiddleware)

	// Get port from environment
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	log.Printf("Go webhook processor starting on :%s", port)
	log.Fatal(http.ListenAndServe(":"+port, r))
}

func corsMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")

		if r.Method == "OPTIONS" {
			w.WriteHeader(http.StatusOK)
			return
		}

		next.ServeHTTP(w, r)
	})
}

func (app *App) healthHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method == "OPTIONS" {
		w.WriteHeader(http.StatusOK)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]interface{}{
		"status":    "healthy",
		"timestamp": time.Now().UTC(),
		"service":   "heimdall-go-service",
		"version":   "1.0.2",
		"webhook_test": "railway-auto-deploy",
	})
}

func (app *App) getEventsHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method == "OPTIONS" {
		w.WriteHeader(http.StatusOK)
		return
	}
	
	query := `
		SELECT id, event_type, title, metadata, created_at 
		FROM events 
		ORDER BY created_at DESC 
		LIMIT 50
	`

	rows, err := app.DB.Query(query)
	if err != nil {
		http.Error(w, "Database query failed", http.StatusInternalServerError)
		log.Printf("Database query error: %v", err)
		return
	}
	defer rows.Close()

	var events []DashboardEvent
	for rows.Next() {
		var event DashboardEvent
		var metadataBytes []byte

		err := rows.Scan(&event.ID, &event.EventType, &event.Title, &metadataBytes, &event.CreatedAt)
		if err != nil {
			log.Printf("Row scan error: %v", err)
			continue
		}

		// Parse metadata JSON
		if metadataBytes != nil {
			if err := json.Unmarshal(metadataBytes, &event.Metadata); err != nil {
				log.Printf("Metadata parse error: %v", err)
				event.Metadata = make(map[string]interface{})
			}
		}

		events = append(events, event)
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(events)
}

func (app *App) processWebhookHandler(w http.ResponseWriter, r *http.Request) {
	// Handle CORS preflight
	if r.Method == "OPTIONS" {
		w.WriteHeader(http.StatusOK)
		return
	}

	var payload QStashPayload
	if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
		http.Error(w, "Invalid payload", http.StatusBadRequest)
		log.Printf("JSON decode error: %v", err)
		return
	}

	log.Printf("Received webhook payload: %+v", payload)
	log.Printf("Raw event data: %s", string(payload.Event))

	var dashboardEvent DashboardEvent
	var err error

	switch payload.EventType {
	case "github.push":
		log.Printf("Processing GitHub push event")
		dashboardEvent, err = transformGitHubPush(payload.Event)
	case "vercel.deploy":
		log.Printf("Processing Vercel deploy event")
		dashboardEvent, err = transformVercelDeploy(payload.Event)
	case "railway.deploy":
		log.Printf("Processing Railway deploy event")
		dashboardEvent, err = transformRailwayDeploy(payload.Event)
	default:
		log.Printf("Unknown event type: %s", payload.EventType)
		http.Error(w, "Unknown event type", http.StatusBadRequest)
		return
	}

	if err != nil {
		http.Error(w, "Transform error", http.StatusInternalServerError)
		log.Printf("Transform error: %v", err)
		return
	}

	// Insert into database
	if err := app.insertEvent(dashboardEvent); err != nil {
		http.Error(w, "Database error", http.StatusInternalServerError)
		log.Printf("Database insert error: %v", err)
		return
	}

	log.Printf("Processed %s event: %s", dashboardEvent.EventType, dashboardEvent.Title)
	w.WriteHeader(http.StatusOK)
}

func (app *App) insertEvent(event DashboardEvent) error {
	metadataJSON, err := json.Marshal(event.Metadata)
	if err != nil {
		return err
	}

	query := `
		INSERT INTO events (event_type, title, metadata, created_at) 
		VALUES ($1, $2, $3, $4)
	`

	_, err = app.DB.Exec(query, event.EventType, event.Title, metadataJSON, time.Now().UTC())
	return err
}

func transformGitHubPush(eventData json.RawMessage) (DashboardEvent, error) {
	var pushEvent struct {
		Repository struct {
			Name string `json:"name"`
		} `json:"repository"`
		HeadCommit struct {
			Message string `json:"message"`
			Author  struct {
				Name string `json:"name"`
			} `json:"author"`
		} `json:"head_commit"`
	}

	if err := json.Unmarshal(eventData, &pushEvent); err != nil {
		return DashboardEvent{}, err
	}

	return DashboardEvent{
		EventType: "github.push",
		Title:     fmt.Sprintf("Push to %s", pushEvent.Repository.Name),
		Metadata: map[string]interface{}{
			"repo":    pushEvent.Repository.Name,
			"message": pushEvent.HeadCommit.Message,
			"author":  pushEvent.HeadCommit.Author.Name,
		},
		CreatedAt: time.Now().UTC(),
	}, nil
}

func transformVercelDeploy(eventData json.RawMessage) (DashboardEvent, error) {
	// The eventData is the raw Vercel webhook payload
	var deployEvent struct {
		Type    string `json:"type"`
		Payload struct {
			Team struct {
				ID string `json:"id"`
			} `json:"team"`
			User struct {
				ID string `json:"id"`
			} `json:"user"`
			Alias      []string `json:"alias"`
			Deployment struct {
				ID   string                 `json:"id"`
				Meta map[string]interface{} `json:"meta"`
				URL  string                 `json:"url"`
				Name string                 `json:"name"`
			} `json:"deployment"`
			Links struct {
				Deployment string `json:"deployment"`
				Project    string `json:"project"`
			} `json:"links"`
			Target  string `json:"target"`
			Project struct {
				ID string `json:"id"`
			} `json:"project"`
			Plan    string   `json:"plan"`
			Regions []string `json:"regions"`
		} `json:"payload"`
	}

	if err := json.Unmarshal(eventData, &deployEvent); err != nil {
		log.Printf("Error unmarshaling Vercel event: %v", err)
		log.Printf("Raw event data: %s", string(eventData))
		return DashboardEvent{}, err
	}

	// Determine status from event type
	status := "UNKNOWN"
	switch deployEvent.Type {
	case "deployment.created":
		status = "BUILDING"
	case "deployment.succeeded":
		status = "SUCCESS"
	case "deployment.error":
		status = "FAILED"
	default:
		status = "DEPLOY" // Fallback for unknown types
	}

	// Use deployment name as project name if available
	projectName := deployEvent.Payload.Deployment.Name
	if projectName == "" {
		projectName = "Unknown Project"
	}

	log.Printf("Processing Vercel event - Type: %s, Project: %s, Status: %s", deployEvent.Type, projectName, status)

	return DashboardEvent{
		EventType: "vercel.deploy",
		Title:     fmt.Sprintf("Deployment of %s", projectName),
		Metadata: map[string]interface{}{
			"project":       projectName,
			"status":        status,
			"url":           deployEvent.Payload.Deployment.URL,
			"deployment_id": deployEvent.Payload.Deployment.ID,
			"target":        deployEvent.Payload.Target,
			"plan":          deployEvent.Payload.Plan,
			"regions":       deployEvent.Payload.Regions,
			"event_type":    deployEvent.Type,
		},
		CreatedAt: time.Now().UTC(),
	}, nil
}

func transformRailwayDeploy(eventData json.RawMessage) (DashboardEvent, error) {
	var railwayEvent struct {
		Type      string `json:"type"`
		Timestamp string `json:"timestamp"`
		Project   struct {
			ID          string `json:"id"`
			Name        string `json:"name"`
			Description string `json:"description"`
			CreatedAt   string `json:"createdAt"`
		} `json:"project"`
		Environment struct {
			ID   string `json:"id"`
			Name string `json:"name"`
		} `json:"environment"`
		Deployment struct {
			ID      string `json:"id"`
			Creator struct {
				ID     string `json:"id"`
				Name   string `json:"name"`
				Avatar string `json:"avatar"`
			} `json:"creator"`
			Meta map[string]interface{} `json:"meta"`
		} `json:"deployment"`
	}

	if err := json.Unmarshal(eventData, &railwayEvent); err != nil {
		log.Printf("Error unmarshaling Railway event: %v", err)
		log.Printf("Raw Railway event data: %s", string(eventData))
		return DashboardEvent{}, err
	}
	
	log.Printf("Processing Railway event - Type: %s, Project: %s, Environment: %s", railwayEvent.Type, railwayEvent.Project.Name, railwayEvent.Environment.Name)

	// Map Railway type to our standard format
	status := "UNKNOWN"
	switch railwayEvent.Type {
	case "DEPLOY":
		status = "SUCCESS"
	case "DEPLOY_STARTED":
		status = "BUILDING"
	case "DEPLOY_FAILED":
		status = "FAILED"
	default:
		status = "DEPLOY"
	}

	// Use project name and environment for title
	title := fmt.Sprintf("Railway deployment of %s", railwayEvent.Project.Name)
	if railwayEvent.Environment.Name != "" {
		title = fmt.Sprintf("Railway deployment of %s to %s", railwayEvent.Project.Name, railwayEvent.Environment.Name)
	}

	metadata := map[string]interface{}{
		"project_name":   railwayEvent.Project.Name,
		"project_id":     railwayEvent.Project.ID,
		"status":         status,
		"environment":    railwayEvent.Environment.Name,
		"environment_id": railwayEvent.Environment.ID,
		"deployment_id":  railwayEvent.Deployment.ID,
		"creator_name":   railwayEvent.Deployment.Creator.Name,
		"creator_id":     railwayEvent.Deployment.Creator.ID,
		"event_type":     railwayEvent.Type,
		"timestamp":      railwayEvent.Timestamp,
	}

	// Add deployment meta information if available
	if railwayEvent.Deployment.Meta != nil {
		for key, value := range railwayEvent.Deployment.Meta {
			metadata[fmt.Sprintf("meta_%s", key)] = value
		}
	}

	return DashboardEvent{
		EventType: "railway.deploy",
		Title:     title,
		Metadata:  metadata,
		CreatedAt: time.Now().UTC(),
	}, nil
}