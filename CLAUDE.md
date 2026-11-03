# CLAUDE.md

This file guides Claude Code (claude.ai/code) when it works in this repository.

## Project overview

Heimdall is a real-time webhook monitoring dashboard. It collects events from GitHub, Vercel, and Railway and shows them in one view with categories.

## Architecture

Three tiers:

1. Frontend (Next.js 15 and React 19) on Vercel. An Edge Function receives webhooks, and the app serves the dashboard and public pages.
2. Backend (Go 1.26) on Railway. It validates and transforms events, stores them in PostgreSQL, and serves the read API.
3. Database (PostgreSQL) on Neon.

Data flow:

```
Webhook source -> /api/webhook (Edge) -> QStash (optional) -> Go /api/webhook -> PostgreSQL
                                                                                    |
Dashboard <- SSE /api/events/stream <- polls Go /api/events <-----------------------+
```

Key files:

- `src/app/api/webhook/route.ts` verifies the provider credential, detects the event type, and forwards the event. Helpers live in `src/lib/webhook/` (`verify.ts`, `detect.ts`, `forward.ts`).
- `backend/handlers/webhook.go` authenticates the Edge call, validates the payload, and stores it. `backend/transformers/` turns provider payloads into `DashboardEvent`.
- `backend/handlers/redact.go` strips details from private events in `GET /api/events`.
- `src/app/api/events/stream/route.ts` is the SSE endpoint. It polls the backend and broadcasts new events.
- `src/app/dashboard/page.tsx` is the dashboard. `src/app/page.tsx` is the landing page.
- `src/contexts/CategoryContext.tsx` does client-side categorization and filtering.
- `backend/cmd/migrate` applies SQL migrations from `backend/database/migrations`.

## Commands

```bash
# Frontend (port 3000)
npm run dev
npm run build
npm run lint
npm run lint:fix
npm run typecheck
npm run format          # prettier --write
npm run format:check
npm run test
npm run test:watch
npm run test:coverage

# Webhook scripts (see scripts/README.md)
npm run add-webhooks
npm run add-vercel-webhooks
npm run test-webhook
npm run test-railway-webhook

# Backend (port 8080, from backend/)
go build -o main .
go run main.go
go vet ./...
go test -race ./...

# Migrations (from backend/)
DATABASE_URL=... go run ./cmd/migrate up
```

The migrate tool takes `up`, `down`, `version`, `force <version>`, and `steps <n>`. Flags: `-database` (default: `DATABASE_URL`) and `-path` (default: `database/migrations`). In the Docker image the binary is `./migrate`.

## Environment variables

Frontend (Vercel):

- `WEBHOOK_SECRET`: GitHub webhook secret. Required.
- `VERCEL_WEBHOOK_SECRET`: secret Vercel returns when the webhook is created. Required for Vercel events.
- `RAILWAY_WEBHOOK_TOKEN`: token carried in the Railway webhook URL. Required for Railway events.
- `BACKEND_WEBHOOK_SECRET`: shared secret sent to the backend as `X-Heimdall-Secret`. Must equal the Railway value. If unset, the Edge handler returns 500 and forwards nothing.
- `GO_SERVICE_URL`: backend URL for server-side calls. Falls back to `NEXT_PUBLIC_GO_SERVICE_URL`. Outside production both fall back to `http://localhost:8080`. In production, one of them is required.
- `NEXT_PUBLIC_GO_SERVICE_URL`: backend URL for browser calls.
- `NEXT_PUBLIC_BASE_URL`: public site URL for Open Graph metadata. Falls back to `https://$VERCEL_PROJECT_PRODUCTION_URL`, then localhost.
- `DEBUG_KEY`: enables `/api/debug/env`. Sent in the `x-debug-key` header.
- `QSTASH_TOKEN`: optional. Queues deliveries through QStash.

Backend (Railway):

- `DATABASE_URL`: PostgreSQL connection string. Required.
- `BACKEND_WEBHOOK_SECRET`: required for ingestion. If unset, `POST /api/webhook` returns 503.
- `PORT`: default 8080.
- `RATE_LIMIT_RPS` and `RATE_LIMIT_BURST`: per-IP limits. Defaults 10 and 30.
- `LOG_LEVEL`: `debug`, `info`, `warn`, or `error`. Default `info`.
- `PRETTY_LOGS`: `true` for console-style logs.

## Webhook authentication

The Edge handler picks the provider from the credential that is present, never from the payload. Every check fails closed.

| Provider | Detected by                 | Check                                                                      |
| -------- | --------------------------- | -------------------------------------------------------------------------- |
| GitHub   | `x-github-event` header     | `x-hub-signature-256` is the HMAC-SHA256 of the raw body, key `WEBHOOK_SECRET` |
| Vercel   | `x-vercel-signature` header | Hex HMAC-SHA1 of the raw body, key `VERCEL_WEBHOOK_SECRET`                 |
| Railway  | `token` query parameter     | Constant-time equality with `RAILWAY_WEBHOOK_TOKEN`                        |

Railway webhook URL: `https://<app>/api/webhook?token=<RAILWAY_WEBHOOK_TOKEN>`. The Railway `token` query parameter appears in Vercel's platform request logs, so rotate `RAILWAY_WEBHOOK_TOKEN` if those logs are shared.

A missing server secret returns 500. A missing or wrong credential returns 401. Bodies over 1 MiB return 413. Invalid JSON returns 400.

Edge to Go: the Edge handler sends `X-Heimdall-Secret: $BACKEND_WEBHOOK_SECRET`. The Go service compares it in constant time. A missing or wrong value returns 401. The Go service rejects timestamps older than 7 days or more than 5 minutes ahead. It treats timestamps above 1e12 as milliseconds.

GitHub events other than `push`, `pull_request`, `issues`, and `release` get 202 `{"status":"ignored"}`. A GitHub `ping` gets 200.

Each forwarded payload carries a `delivery_id`. The backend has a unique index on it and answers duplicates with 200 `{"status":"duplicate"}`.

## Event types and categories

| Event type                           | Category       |
| ------------------------------------ | -------------- |
| `github.push`, `github.pr`           | Development    |
| `github.release`                     | Development    |
| `github.issue`                       | Issues         |
| `vercel.deploy`, `railway.deploy`    | Deployments    |
| `error.*`                            | Issues         |
| `security.*`                         | Security       |
| `monitoring.*`                       | Infrastructure |

The mapping lives in `src/types/categories.ts`.

## Privacy

Each event has a `private` flag. It is true unless the source is known to be public: a GitHub repository with `private: false`, or a Vercel deployment from a public GitHub repository. Railway events are always private. Rows from before the flag existed are private.

`GET /api/events` redacts private events. It keeps `id`, `event_type`, `created_at`, and `private`, replaces the title with a generic one (for example `Private repository: 3 commits pushed`), and keeps only the metadata keys `status`, `action`, `commit_count`, `environment`, and `merged`. `/api/stats` and `/api/wrapped` are aggregates and include private events.

## Endpoints

Frontend pages:

- `/` landing page, `/dashboard` live dashboard.
- `/me` public activity stats.
- `/wrapped/YYYY-MM` monthly recap. Years 2020 to the current year, not after the current month. Anything else is a 404.

Frontend API:

- `POST /api/webhook` webhook ingestion (Edge).
- `GET /api/events/stream` SSE stream. Node runtime, closed by the server after 290 seconds. Clients reconnect and re-fetch the first page. At most 50 clients per instance, then 503.
- `GET /api/health` frontend health, with a backend ping.
- `GET /api/badge?type=last|today|streak|total&style=flat|flat-square&color=...` SVG badge. `today` shows events in the last 24 hours.
- `GET /api/og/stats` and `GET /api/og/wrapped/YYYY-MM` PNG Open Graph images.
- `GET /api/debug/env` environment check. Needs the `x-debug-key` header.

Go backend:

- `GET /api/health`
- `GET /api/events` with `limit` (default 50, max 500), `type`, `since`, `offset`, and cursor params `before` (RFC 3339) plus `before_id`. Send both cursor params or neither. The response has `pagination.next_cursor`, which is null on the last page. With a cursor, `offset` is ignored.
- `GET /api/stats` with optional `range=year`.
- `GET /api/wrapped/YYYY-MM`
- `POST /api/webhook` requires `X-Heimdall-Secret`.

## Testing webhooks locally

```bash
docker-compose up -d postgres
cd backend && BACKEND_WEBHOOK_SECRET=dev-secret DATABASE_URL=... go run main.go
npm run dev
```

Signed GitHub push through the Edge handler (set `WEBHOOK_SECRET` and `BACKEND_WEBHOOK_SECRET` in `.env.local`):

```bash
BODY='{"repository":{"name":"test","private":false},"ref":"refs/heads/main","commits":[{"id":"abc"}],"head_commit":{"message":"test","author":{"name":"user"}}}'
SIG="sha256=$(printf '%s' "$BODY" | openssl dgst -sha256 -hmac "$WEBHOOK_SECRET" | awk '{print $NF}')"
curl -X POST http://localhost:3000/api/webhook \
  -H "Content-Type: application/json" \
  -H "X-GitHub-Event: push" \
  -H "X-GitHub-Delivery: local-1" \
  -H "X-Hub-Signature-256: $SIG" \
  -d "$BODY"
```

Direct to the Go backend:

```bash
curl -X POST http://localhost:8080/api/webhook \
  -H "Content-Type: application/json" \
  -H "X-Heimdall-Secret: dev-secret" \
  -d '{"type":"github.push","timestamp":'"$(date +%s)"',"delivery_id":"manual-1","event":{"repository":{"name":"test"},"head_commit":{"message":"test","author":{"name":"user"}}}}'
```

The helper scripts `npm run test-webhook` and `npm run test-railway-webhook` send signed requests. See `scripts/README.md`.

## Key data structures

`DashboardEvent` (Go output, stored in PostgreSQL):

```go
type DashboardEvent struct {
    ID         string                 // UUID
    EventType  string                 // "github.push", "vercel.deploy", ...
    Title      string
    Metadata   map[string]interface{} // provider details (JSONB)
    IsPrivate  bool                   // json:"private"
    CreatedAt  time.Time
}
```

`QStashPayload` (Edge to Go):

```go
type QStashPayload struct {
    Event      json.RawMessage // raw provider payload, must be a JSON object
    EventType  string          // detected type, for example "github.push"
    Timestamp  int64           // Edge receipt time, unix seconds
    DeliveryID string          // json:"delivery_id", for deduplication
}
```
