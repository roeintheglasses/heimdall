# Heimdall - Real-Time Personal Dashboard

A real-time personal dashboard system built with an over-engineered edge pipeline architecture. Monitor your GitHub commits, Vercel deployments, Railway services, and other webhook-enabled integrations with sub-400ms end-to-end latency.

![Dashboard Preview](https://img.shields.io/badge/status-active-brightgreen)
![Next.js](https://img.shields.io/badge/Next.js-15.1.8-blue)
![Go](https://img.shields.io/badge/Go-1.21-blue)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15-blue)

## Architecture

The system follows a serverless, event-driven architecture:

```
[ GitHub / Vercel Webhooks ]
            |
       (HTTP POST)
            |
   [Vercel Edge Function]
            |
      (Queue Message)
            |
     [ Upstash QStash ]
            |
      (Job Processing)
            |
      [Go Service]
            |
    (Data Transformation)
            |
  [Neon Serverless Postgres]
            |
      (Live Queries)
            |
   [ Next.js Frontend ]
            |
    (Server-Sent Events)
            |
         You
```

## Features

- **Real-time Updates**: Server-Sent Events (SSE) for live dashboard updates
- **Webhook Processing**: GitHub push events and Vercel deployment notifications
- **Edge Functions**: Sub-100ms webhook ingestion with global distribution
- **Event Transformation**: Clean, normalized data from various webhook sources
- **Modern UI**: Responsive dashboard with Tailwind CSS and dark mode
- **Scalable Architecture**: Serverless components with automatic scaling

## Performance

- Webhook processing: ~45ms p95
- Go service processing: ~80ms p95
- Database writes: ~100ms p95
- End-to-end frontend updates: <400ms
- Monthly costs: $0 (using generous free tiers)

## Quick Start

### Prerequisites

- Node.js 18+ and npm
- Go 1.21+
- Docker and Docker Compose
- PostgreSQL (or use Docker)

### Local Development

1. **Clone and install dependencies**:

   ```bash
   git clone <your-repo-url>
   cd heimdall
   npm install
   ```

2. **Start the database**:

   ```bash
   docker-compose up -d postgres
   ```

3. **Start the Go service**:

   ```bash
   cd backend
   go run main.go
   ```

4. **Start the Next.js frontend**:

   ```bash
   npm run dev
   ```

5. **Access the dashboard**:
   - Frontend: http://localhost:3000
   - Dashboard: http://localhost:3000/dashboard
   - Go API: http://localhost:8080/api/health

### Environment Variables

Create a `.env.local` file:

```env
# Database
DATABASE_URL=postgres://heimdall_user:heimdall_password@localhost:5432/heimdall?sslmode=disable

# Go Service
GO_SERVICE_URL=http://localhost:8080

# GitHub Webhook Secret
GITHUB_WEBHOOK_SECRET=your_webhook_secret_here

# QStash (optional for production)
QSTASH_URL=https://qstash.upstash.io/v2/publish/your-endpoint
QSTASH_TOKEN=your_qstash_token_here
```

## Testing

### Backend Tests

```bash
cd backend
go test -v
```

### Frontend Tests

```bash
npm test
```

### Test Webhooks

```bash
# Test GitHub push webhook
curl -X POST http://localhost:8080/api/webhook \\
  -H "Content-Type: application/json" \\
  -d '{
    "event": {
      "repository": {"name": "test-repo"},
      "head_commit": {
        "message": "Test commit",
        "author": {"name": "Test User"}
      }
    },
    "type": "github.push",
    "timestamp": 1690000000
  }'

# Test Vercel deployment webhook
curl -X POST http://localhost:8080/api/webhook \\
  -H "Content-Type: application/json" \\
  -d '{
    "event": {
      "project": {"name": "test-project"},
      "deployment": {
        "state": "success",
        "url": "https://test-project.vercel.app"
      }
    },
    "type": "vercel.deploy",
    "timestamp": 1690000001
  }'
```

## Project Structure

```
heimdall/
├── api/                    # Vercel Edge Functions
│   └── webhook/           # Webhook ingestion endpoint
├── backend/               # Go microservice
│   ├── main.go           # HTTP server and handlers
│   ├── main_test.go      # Unit tests
│   └── Dockerfile        # Container build
├── database/             # Database schema
│   └── schema.sql        # PostgreSQL tables and indexes
├── src/                  # Next.js frontend
│   ├── app/              # App Router pages and API
│   │   ├── api/         # Next.js API routes
│   │   ├── dashboard/   # Dashboard page
│   │   └── globals.css  # Global styles
│   └── components/       # React components
├── __tests__/            # Test files
├── docker-compose.yml    # Local development setup
└── README.md            # This file
```

## Deployment

### Vercel (Frontend + Edge Functions)

1. Connect your GitHub repository to Vercel
2. Set environment variables in Vercel dashboard
3. Deploy automatically on push to main branch

### Railway/Fly.io (Go Service)

1. Deploy the Go service using the provided Dockerfile
2. Update `GO_SERVICE_URL` in Vercel environment variables

### Neon/Supabase (Database)

1. Create a PostgreSQL database
2. Run the schema from `database/schema.sql`
3. Update `DATABASE_URL` environment variable

## Webhook Setup

### GitHub

1. Go to your repository settings > Webhooks
2. Add webhook URL: `https://your-domain.vercel.app/api/webhook`
3. Select "Push events"
4. Set content type to "application/json"
5. Add your webhook secret

### Vercel

1. Go to your project settings > Webhooks
2. Add webhook URL: `https://your-domain.vercel.app/api/webhook`
3. Select deployment events
4. The edge function will handle routing

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Run tests: `npm test && cd backend && go test`
6. Submit a pull request

## Tech Stack

- **Frontend**: Next.js 15, React 19, TypeScript, Tailwind CSS
- **Backend**: Go 1.21, Gorilla Mux, PostgreSQL driver
- **Database**: PostgreSQL 15 with JSONB for metadata
- **Infrastructure**: Vercel Edge Functions, Docker
- **Real-time**: Server-Sent Events (SSE)
- **Testing**: Jest, Go testing package

## License

## Use how you like License.

Built with ❤️ for the over-engineering community.
