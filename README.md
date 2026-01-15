# Heimdall

A real-time webhook monitoring dashboard that aggregates events from GitHub, Vercel, and Railway into a unified view with intelligent categorization.

## Architecture

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│  Webhook Source │────▶│  Next.js Edge    │────▶│   Go Backend    │
│ GitHub/Vercel/  │     │  /api/webhook    │     │   Port 8080     │
│    Railway      │     └──────────────────┘     └────────┬────────┘
└─────────────────┘                                       │
                                                          ▼
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│   Dashboard UI  │◀────│  SSE Stream      │◀────│   PostgreSQL    │
│                 │     │  /api/events     │     │     (Neon)      │
└─────────────────┘     └──────────────────┘     └─────────────────┘
```

**Three-tier architecture:**

- **Frontend**: Next.js 15 + React 19 (Vercel)
- **Backend**: Go service (Railway)
- **Database**: PostgreSQL (Neon)

## Quick Start

### Prerequisites

- Node.js 18+
- Go 1.21+
- Docker & Docker Compose (for local development)

### Local Development

1. **Clone and install dependencies**

   ```bash
   git clone https://github.com/your-org/heimdall.git
   cd heimdall
   npm install
   ```

2. **Set up environment variables**

   ```bash
   cp .env.example .env.local
   # Edit .env.local with your configuration
   ```

3. **Start the database and Go backend**

   ```bash
   docker-compose up -d
   ```

4. **Start the Next.js frontend**

   ```bash
   npm run dev
   ```

5. **Access the dashboard**
   - Frontend: http://localhost:3000
   - Go API: http://localhost:8080

### Running Without Docker

```bash
# Terminal 1: Start PostgreSQL locally or use a cloud instance

# Terminal 2: Start Go backend
cd backend
DATABASE_URL="your_postgres_url" go run main.go

# Terminal 3: Start Next.js
npm run dev
```

## Commands

### Frontend

| Command                 | Description                  |
| ----------------------- | ---------------------------- |
| `npm run dev`           | Start development server     |
| `npm run build`         | Build for production         |
| `npm run lint`          | Run ESLint                   |
| `npm run lint:fix`      | Fix linting issues           |
| `npm run format`        | Format code with Prettier    |
| `npm run typecheck`     | Run TypeScript type checking |
| `npm run test`          | Run Jest tests               |
| `npm run test:coverage` | Run tests with coverage      |

### Backend

| Command                      | Description                   |
| ---------------------------- | ----------------------------- |
| `go run main.go`             | Start Go service              |
| `go build -o main .`         | Build binary                  |
| `go test ./...`              | Run all tests                 |
| `go test -race -cover ./...` | Run tests with race detection |

### Webhooks

| Command                       | Description           |
| ----------------------------- | --------------------- |
| `npm run add-webhooks`        | Add GitHub webhooks   |
| `npm run add-vercel-webhooks` | Add Vercel webhooks   |
| `npm run test-webhook`        | Test webhook endpoint |

## Environment Variables

### Frontend (Vercel)

| Variable                     | Description                               | Required |
| ---------------------------- | ----------------------------------------- | -------- |
| `WEBHOOK_SECRET`             | Secret for webhook signature verification | Yes      |
| `GO_SERVICE_URL`             | Backend URL for server-side calls         | Yes      |
| `NEXT_PUBLIC_GO_SERVICE_URL` | Backend URL for client-side calls         | Yes      |
| `QSTASH_TOKEN`               | QStash token for reliable message queuing | No       |

### Backend (Railway)

| Variable       | Description                  | Required |
| -------------- | ---------------------------- | -------- |
| `DATABASE_URL` | PostgreSQL connection string | Yes      |
| `PORT`         | Server port (default: 8080)  | No       |

## Event Categories

Events are automatically categorized by source:

| Category       | Event Types                                |
| -------------- | ------------------------------------------ |
| Development    | `github.push`, `github.pr`, `github.issue` |
| Deployments    | `vercel.deploy`, `railway.deploy`          |
| Issues         | `error.*`                                  |
| Security       | `security.*`                               |
| Infrastructure | `monitoring.*`                             |

## Testing Webhooks

```bash
# Test via Next.js Edge Function (full flow)
curl -X POST http://localhost:3000/api/webhook \
  -H "Content-Type: application/json" \
  -H "X-GitHub-Event: push" \
  -d '{"repository":{"name":"test"},"head_commit":{"message":"test","author":{"name":"user"}}}'

# Test Go backend directly
curl -X POST http://localhost:8080/api/webhook \
  -H "Content-Type: application/json" \
  -d '{"event":{"repository":{"name":"test"}},"type":"github.push","timestamp":1690000000}'
```

## Project Structure

```
heimdall/
├── src/
│   ├── app/              # Next.js App Router
│   │   ├── api/          # API routes (webhook, events)
│   │   └── page.tsx      # Dashboard UI
│   ├── components/       # React components
│   ├── contexts/         # React contexts
│   ├── hooks/            # Custom hooks
│   ├── lib/              # Utilities
│   └── types/            # TypeScript types
├── backend/
│   ├── handlers/         # HTTP handlers
│   ├── database/         # Database access layer
│   ├── transformers/     # Event transformation
│   ├── middleware/       # HTTP middleware
│   └── main.go           # Entry point
├── database/
│   └── schema.sql        # Database schema
└── scripts/              # Webhook setup scripts
```

## Deployment

- **Frontend**: Deploy to Vercel
- **Backend**: Deploy to Railway
- **Database**: Use Neon PostgreSQL

See deployment documentation for detailed setup instructions.

## License

MIT
