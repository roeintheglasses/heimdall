# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Heimdall is a real-time webhook monitoring dashboard that aggregates events from GitHub, Vercel, and Railway into a unified view with intelligent categorization.

## Architecture

**Three-tier architecture:**
1. **Frontend (Next.js 15 + React 19)** - Deployed on Vercel, handles webhook ingestion via Edge Functions and serves the dashboard UI
2. **Backend (Go)** - Deployed on Railway, processes webhooks and stores events in PostgreSQL
3. **Database (PostgreSQL)** - Hosted on Neon

**Data flow:**
```
Webhook Source → /api/webhook (Edge) → QStash (optional) → Go Backend → PostgreSQL
                                                                            ↓
Dashboard UI ← SSE /api/events/stream ← Polling ← Go Backend /api/events ←─┘
```

**Key patterns:**
- Edge Runtime webhook handler (`src/app/api/webhook/route.ts`) detects event source (GitHub/Vercel/Railway) and forwards to Go backend
- Go backend (`backend/main.go`) transforms provider-specific payloads into unified `DashboardEvent` format
- SSE stream (`src/app/api/events/stream/route.ts`) polls Go backend and broadcasts to connected clients
- CategoryContext (`src/contexts/CategoryContext.tsx`) provides client-side event categorization and filtering

## Commands

```bash
# Frontend (runs on port 3000)
npm run dev          # Start Next.js dev server
npm run build        # Build for production
npm run lint         # Run ESLint
npm run test         # Run Jest tests
npm run test:watch   # Run tests in watch mode

# Backend (runs on port 8080, from /backend directory)
go build -o main .   # Build Go binary
go run main.go       # Run Go service locally
go test ./...        # Run Go tests

# Webhook Scripts
npm run add-webhooks         # Add GitHub webhooks
npm run add-vercel-webhooks  # Add Vercel webhooks
npm run setup-all-webhooks   # Configure all webhooks
npm run test-webhook         # Test webhook endpoint
npm run check-webhooks       # Verify webhook URLs

# Database
# Apply schema: Run contents of database/schema.sql in Neon SQL Editor
```

## Environment Variables

**Frontend (Vercel):**
- `GITHUB_WEBHOOK_SECRET` - GitHub webhook signature verification
- `GO_SERVICE_URL` - Backend URL for server-side calls
- `NEXT_PUBLIC_GO_SERVICE_URL` - Backend URL for client-side calls
- `QSTASH_TOKEN` - Optional, for reliable message queuing

**Backend (Railway):**
- `DATABASE_URL` - PostgreSQL connection string
- `PORT` - Server port (default: 8080)

## Event Types

Events are categorized by source prefix:
- `github.push`, `github.pr`, `github.issue` → Development category
- `vercel.deploy`, `railway.deploy` → Deployments category
- `error.*` → Issues category
- `security.*` → Security category
- `monitoring.*` → Infrastructure category

## Testing Webhooks Locally

```bash
# Start local postgres
docker-compose up -d postgres

# Start Go backend
cd backend && go run main.go

# Start Next.js
npm run dev

# Test via Next.js Edge Function (full flow)
curl -X POST http://localhost:3000/api/webhook \
  -H "Content-Type: application/json" \
  -H "X-GitHub-Event: push" \
  -d '{"repository":{"name":"test"},"head_commit":{"message":"test","author":{"name":"user"}}}'

# Test Go backend directly
curl -X POST http://localhost:8080/api/webhook \
  -H "Content-Type: application/json" \
  -d '{"event":{"repository":{"name":"test"},"head_commit":{"message":"test","author":{"name":"user"}}},"type":"github.push","timestamp":1690000000}'
```

## Key Data Structures

**DashboardEvent** (Go backend output, stored in PostgreSQL):
```go
type DashboardEvent struct {
    ID        string                 // UUID
    EventType string                 // e.g., "github.push", "vercel.deploy"
    Title     string                 // Human-readable summary
    Metadata  map[string]interface{} // Provider-specific details (JSONB)
    CreatedAt time.Time
}
```

**QStashPayload** (Input to Go backend from Edge Function):
```go
type QStashPayload struct {
    Event     json.RawMessage // Raw provider webhook payload
    EventType string          // Detected event type
    Timestamp int64           // Unix timestamp
}
```
