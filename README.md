# Heimdall

A real-time webhook monitoring dashboard that aggregates events from GitHub, Vercel, and Railway into a unified view with intelligent categorization.

## Architecture

```
Webhook source ──▶ Next.js Edge /api/webhook ──▶ Go backend ──▶ PostgreSQL (Neon)
(GitHub, Vercel,    verifies the provider       validates,         │
 Railway)           credential                  stores, dedupes    │
                                                                   │
Dashboard ◀── SSE /api/events/stream ◀── polls Go /api/events ◀────┘
```

- Frontend: Next.js 15 and React 19 on Vercel.
- Backend: Go 1.26 on Railway.
- Database: PostgreSQL on Neon.

## Quick start

### Prerequisites

- Node.js 20 or newer
- Go 1.26
- Docker and Docker Compose (for the local database)

### Local development

1. Install dependencies.

   ```bash
   git clone https://github.com/your-org/heimdall.git
   cd heimdall
   npm install
   ```

2. Copy the environment file and edit it.

   ```bash
   cp .env.example .env.local
   ```

3. Start PostgreSQL and the Go backend. Compose uses `BACKEND_WEBHOOK_SECRET=dev-secret`, so set the same value in `.env.local`.

   ```bash
   docker-compose up -d
   ```

4. Start the frontend.

   ```bash
   npm run dev
   ```

5. Open the app.
   - Frontend: http://localhost:3000 (dashboard at `/dashboard`)
   - Go API: http://localhost:8080

### Running without Docker

```bash
# Terminal 1: run PostgreSQL locally or use a cloud instance

# Terminal 2: apply migrations, then start the backend
cd backend
export DATABASE_URL="your_postgres_url"
export BACKEND_WEBHOOK_SECRET="dev-secret"
go run ./cmd/migrate up
go run main.go

# Terminal 3: start Next.js
npm run dev
```

## Commands

### Frontend

| Command                 | Description                  |
| ----------------------- | ---------------------------- |
| `npm run dev`           | Start the development server |
| `npm run build`         | Build for production         |
| `npm run lint`          | Run ESLint                   |
| `npm run lint:fix`      | Fix lint issues              |
| `npm run format`        | Format code with Prettier    |
| `npm run format:check`  | Check formatting             |
| `npm run typecheck`     | Run TypeScript type checking |
| `npm run test`          | Run Jest tests               |
| `npm run test:coverage` | Run tests with coverage      |

### Backend (from `backend/`)

| Command                        | Description                        |
| ------------------------------ | ---------------------------------- |
| `go run main.go`               | Start the Go service               |
| `go build -o main .`           | Build the binary                   |
| `go vet ./...`                 | Run go vet                         |
| `go test -race ./...`          | Run tests with the race detector   |
| `go run ./cmd/migrate up`      | Apply migrations                   |
| `go run ./cmd/migrate version` | Show the current migration version |
| `go run ./cmd/migrate down`    | Roll back all migrations           |
| `go run ./cmd/repos sync`      | Sync repo visibility from GitHub   |
| `go run ./cmd/repos hide <r>`  | Hide a repo (`unhide`, `list`)     |
| `go run ./cmd/dedupe`          | Dry run of duplicate push cleanup  |

The migrate tool also accepts `force <version>` and `steps <n>`. It reads `DATABASE_URL` (or `-database`) and `database/migrations` (or `-path`). The Docker image ships the compiled tool as `./migrate`.

The repos tool reads `DATABASE_URL` (or `-database`). `sync` also needs `GITHUB_TOKEN` and takes `-dry-run`. The Docker image ships it as `./repos`. The dedupe tool is a dry run unless you pass `-apply -export <file>`.

### Webhook scripts

| Command                        | Description                       |
| ------------------------------ | --------------------------------- |
| `npm run add-webhooks`         | Add or update GitHub webhooks     |
| `npm run add-vercel-webhooks`  | Add Vercel webhooks               |
| `npm run test-webhook`         | Send a signed test GitHub webhook |
| `npm run test-railway-webhook` | Send a test Railway webhook       |

See `scripts/README.md` for options.

## Environment variables

### Frontend (Vercel)

| Variable                     | Description                                                 | Required           |
| ---------------------------- | ----------------------------------------------------------- | ------------------ |
| `WEBHOOK_SECRET`             | GitHub webhook secret                                       | Yes                |
| `VERCEL_WEBHOOK_SECRET`      | Secret Vercel returns when the webhook is created           | For Vercel events  |
| `RAILWAY_WEBHOOK_TOKEN`      | Token in the Railway webhook URL                            | For Railway events |
| `BACKEND_WEBHOOK_SECRET`     | Shared secret sent to the backend. Same value as on Railway | Yes                |
| `GO_SERVICE_URL`             | Backend URL for server-side calls                           | Yes in production  |
| `NEXT_PUBLIC_GO_SERVICE_URL` | Backend URL for browser calls                               | Yes in production  |
| `NEXT_PUBLIC_BASE_URL`       | Public site URL for Open Graph metadata                     | No                 |
| `DEBUG_KEY`                  | Enables `/api/debug/env`. Sent as the `x-debug-key` header  | No                 |
| `QSTASH_TOKEN`               | Queue deliveries through QStash                             | No                 |

Without `NEXT_PUBLIC_BASE_URL`, the app uses `https://$VERCEL_PROJECT_PRODUCTION_URL`, then `http://localhost:3000`. Outside production, the backend URL falls back to `http://localhost:8080`.

### Backend (Railway)

| Variable                 | Description                                          | Required |
| ------------------------ | ---------------------------------------------------- | -------- |
| `DATABASE_URL`           | PostgreSQL connection string                         | Yes      |
| `BACKEND_WEBHOOK_SECRET` | Expected in `X-Heimdall-Secret`. Unset means 503     | Yes      |
| `PORT`                   | Server port (default 8080)                           | No       |
| `RATE_LIMIT_RPS`         | Requests per second per IP (default 10)              | No       |
| `RATE_LIMIT_BURST`       | Burst size per IP (default 30)                       | No       |
| `LOG_LEVEL`              | `debug`, `info`, `warn`, or `error` (default `info`) | No       |
| `PRETTY_LOGS`            | `true` for console-style logs                        | No       |
| `ALERT_WEBHOOK_URL`      | Failure alerts go here. Unset means no alerts        | No       |
| `ALERT_WEBHOOK_FORMAT`   | `discord`, `slack`, or `ntfy`. Overrides detection   | No       |

Generate secrets with `openssl rand -hex 32`.

## Webhook setup

The Edge handler picks the provider from the credential on the request and rejects anything it cannot verify.

| Provider | Setup                                                                                                            |
| -------- | ---------------------------------------------------------------------------------------------------------------- |
| GitHub   | Webhook URL `https://<app>/api/webhook`, content type JSON, secret `WEBHOOK_SECRET`. Run `npm run add-webhooks`. |
| Vercel   | Run `node scripts/add-vercel-webhooks.js --account-level`. Set the printed secret as `VERCEL_WEBHOOK_SECRET`.    |
| Railway  | Webhook URL `https://<app>/api/webhook?token=<RAILWAY_WEBHOOK_TOKEN>`.                                           |

The Railway `token` query parameter appears in Vercel's platform request logs, so rotate `RAILWAY_WEBHOOK_TOKEN` if those logs are shared.

Response codes: 200 accepted, 202 ignored event type, 400 invalid JSON, 401 bad or missing credential, 413 body over 1 MiB, 500 server secret not set, 502 backend unreachable.

GitHub events handled: `push`, `pull_request`, `issues`, `release`, and `workflow_run`. A `ping` returns 200. A `workflow_run` is stored as `error.ci` only when `action` is `completed` and the conclusion is `failure`, `timed_out`, or `cancelled`. Every other run, and every other GitHub event, gets 202 `ignored`. `npm run add-webhooks` subscribes hooks to `workflow_run`. It also lists hooks on a Heimdall host whose URL differs from the current one, without changing them.

The Edge handler calls the Go backend with `X-Heimdall-Secret`. The backend returns 401 for a wrong secret and 503 when `BACKEND_WEBHOOK_SECRET` is unset. Each event has a `delivery_id`, so a redelivered webhook returns `{"status":"duplicate"}` and stores nothing.

## Event categories

| Category       | Event types                                      |
| -------------- | ------------------------------------------------ |
| Development    | `github.push`, `github.pr`, `github.release`     |
| Deployments    | `vercel.deploy`, `railway.deploy`                |
| Issues         | `github.issue`, `error.*` (including `error.ci`) |
| Security       | `security.*`                                     |
| Infrastructure | `monitoring.*`                                   |

## Privacy

Events are private unless the source is known to be public: a GitHub repository with `private: false`, or a Vercel deployment from a public GitHub repository. Railway events are always private.

`GET /api/events` and the dashboard show private events with a generic title and only these metadata keys: `status`, `action`, `commit_count`, `environment`, `merged`, `conclusion`. Repository names, branches, commit messages, authors, and URLs are not returned. Stats, badges, `/me`, and wrapped pages count private activity in totals.

Vercel deployments also store `branch`, `commit_sha`, `commit_message` (cut to 500 characters), `repo`, and `full_name` from the deployment `meta`. These keys are not in the redaction list, so private deployments never show them. The hidden repo filter matches on `repo` and `full_name` for every event type, so hiding a repo also hides its Vercel deploys.

## Failure alerts

Set `ALERT_WEBHOOK_URL` on the backend to get a short message when a newly stored event is a failure. Duplicates never alert.

- `vercel.deploy` with status `FAILED` (Vercel `deployment.error`). Canceled deploys do not alert.
- `railway.deploy` with status `FAILED` (the backend maps Railway `FAILED`, `CRASHED`, and `ERROR` to `FAILED`).
- Every `error.ci` event (a failed, timed out, or cancelled GitHub Actions run).

The message names the provider, project or repo, branch, short SHA, status, and a link when there is one. It uses the full event, including private ones, so point the URL at your own channel. The body shape depends on the URL host: `discord.com` and `discordapp.com` get `{"content": ...}`, `hooks.slack.com` gets `{"text": ...}`, and `ntfy.sh` or a host containing `ntfy` gets plain text with a `Title` header. Other hosts get the Discord shape. Set `ALERT_WEBHOOK_FORMAT` to `discord`, `slack`, or `ntfy` to override. Sends run in the background with a 5 second timeout, at most 8 at a time. The URL is never logged.

## Endpoints

### Pages

| Path               | Description                 |
| ------------------ | --------------------------- |
| `/`                | Landing page                |
| `/dashboard`       | Live event dashboard        |
| `/me`              | Public activity stats       |
| `/wrapped/YYYY-MM` | Monthly recap (2020 to now) |

### Frontend API

| Endpoint                      | Description                                                                              |
| ----------------------------- | ---------------------------------------------------------------------------------------- |
| `POST /api/webhook`           | Webhook ingestion (Edge)                                                                 |
| `GET /api/events/stream`      | SSE stream. The server closes it after 290 seconds and clients reconnect                 |
| `GET /api/health`             | Health check that pings the backend                                                      |
| `GET /api/badge`              | SVG badge. Params: `type=last\|today\|streak\|total`, `style=flat\|flat-square`, `color` |
| `GET /api/og/stats`           | Open Graph image for `/me`                                                               |
| `GET /api/og/wrapped/YYYY-MM` | Open Graph image for a wrapped page                                                      |
| `GET /api/debug/env`          | Which env vars are set. Needs the `x-debug-key` header                                   |

The `today` badge counts events in the last 24 hours.

### Go backend

| Endpoint                   | Description                                                      |
| -------------------------- | ---------------------------------------------------------------- |
| `GET /api/health`          | Health check. Pings Postgres (2 s limit), 503 when it fails      |
| `GET /api/health/live`     | Liveness check. Always 200, no database call. Used by Docker     |
| `GET /api/events`          | Events, newest first. See below                                  |
| `GET /api/stats`           | Counts, streaks, activity. Add `?range=year` for the yearly view |
| `GET /api/wrapped/YYYY-MM` | Monthly stats                                                    |
| `POST /api/webhook`        | Ingestion. Needs `X-Heimdall-Secret`                             |

`GET /api/events` params: `limit` (default 50, max 500), `type`, `since`, `offset`, `before`, and `before_id`. To page, pass the `before` and `before_id` values from `pagination.next_cursor` in the previous response. Send both or neither. `next_cursor` is null on the last page.

## Testing webhooks

Signed GitHub push through the Edge handler. Set `WEBHOOK_SECRET` and `BACKEND_WEBHOOK_SECRET` for the frontend first.

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

Directly to the Go backend:

```bash
curl -X POST http://localhost:8080/api/webhook \
  -H "Content-Type: application/json" \
  -H "X-Heimdall-Secret: dev-secret" \
  -d '{"type":"github.push","timestamp":'"$(date +%s)"',"delivery_id":"manual-1","event":{"repository":{"name":"test"},"head_commit":{"message":"test","author":{"name":"user"}}}}'
```

## Project structure

```
heimdall/
├── src/
│   ├── app/
│   │   ├── api/          # webhook, events/stream, health, badge, og, debug
│   │   ├── dashboard/    # live dashboard
│   │   ├── me/           # public stats
│   │   └── wrapped/      # monthly recap
│   ├── components/       # React components
│   ├── contexts/         # React contexts
│   ├── hooks/            # custom hooks
│   ├── lib/              # utilities, webhook verification and forwarding
│   └── types/            # TypeScript types
├── backend/
│   ├── cmd/migrate/      # migration tool
│   ├── cmd/repos/        # repo visibility and hidden repos
│   ├── cmd/dedupe/       # duplicate push cleanup
│   ├── config/           # environment config
│   ├── database/         # data access and migrations
│   ├── handlers/         # HTTP handlers, redaction
│   ├── middleware/       # rate limiting, logging
│   ├── transformers/     # provider payload to event
│   └── main.go           # entry point
├── database/
│   └── schema.sql        # mirror of the migrations for fresh setups
└── scripts/              # webhook setup scripts
```

`backend/database/migrations` is the source of truth for the schema.

## Upgrading from the previous version

This release changes the webhook contract. Existing deployments stop accepting webhooks until you finish these steps.

1. Generate two secrets with `openssl rand -hex 32`: `BACKEND_WEBHOOK_SECRET` and `RAILWAY_WEBHOOK_TOKEN`.
2. Run the migration before you deploy the new backend: `cd backend && DATABASE_URL=... go run ./cmd/migrate up`. Every existing event becomes private. To publish events from a public repository, run `UPDATE events SET is_private = false WHERE metadata->>'repo' IN (...)`.
3. On Railway, set `BACKEND_WEBHOOK_SECRET` (and optionally `LOG_LEVEL`), then deploy.
4. On Vercel, set `BACKEND_WEBHOOK_SECRET` and `RAILWAY_WEBHOOK_TOKEN`. Check that `WEBHOOK_SECRET`, `GO_SERVICE_URL`, and `NEXT_PUBLIC_GO_SERVICE_URL` are set. Optionally set `NEXT_PUBLIC_BASE_URL` and `DEBUG_KEY`. Deploy.
5. Recreate the Vercel webhook with `node scripts/add-vercel-webhooks.js --account-level --recreate`. Set the printed secret as `VERCEL_WEBHOOK_SECRET` and redeploy.
6. Rotate `WEBHOOK_SECRET` if it was ever the old default. Update it on Vercel and in the GitHub Actions secrets, then rerun `npm run add-webhooks`. The script now updates existing hooks.
7. Change the Railway webhook URL to `https://<app>/api/webhook?token=<RAILWAY_WEBHOOK_TOKEN>`.
8. Check the result. Redeliver a GitHub ping and expect 200. Push to a private repository and confirm the dashboard shows a redacted event. Open `/api/health` and expect `backend: up`. Open `/api/og/stats` and expect a PNG.

`/api/events/stream` now sets `maxDuration = 300`. If your Vercel plan rejects 300 seconds, lower the value to 60 in `src/app/api/events/stream/route.ts`.

## Deployment

- Frontend: Vercel
- Backend: Railway (Docker image built from `backend/Dockerfile`)
- Database: Neon PostgreSQL

## License

MIT
