# Railway webhook setup

Railway webhooks let Heimdall track your Railway deployments. Railway does not sign its requests, so Heimdall authenticates them with a secret token in the webhook URL. Railway events are always stored as private: the public dashboard shows only the status, environment, and timing.

## Setup

### 1. Generate a token

```bash
openssl rand -hex 32
```

Set the value as `RAILWAY_WEBHOOK_TOKEN` on the Vercel deployment of Heimdall and redeploy. Without it, the webhook route answers every Railway request with 500.

### 2. Add the webhook in Railway

1. Open your project on [railway.app](https://railway.app).
2. Go to **Settings** > **Webhooks**.
3. Set the URL to:

   ```
   https://your-heimdall-app.vercel.app/api/webhook?token=<RAILWAY_WEBHOOK_TOKEN>
   ```

4. Subscribe to the deployment events (for example `deployment.created`, `deployment.completed`, `deployment.failed`).

Requests with a missing or wrong `token` get 401. Treat the URL as a secret and do not paste it into logs or tickets.

### 3. Test the configuration

```bash
RAILWAY_WEBHOOK_TOKEN=<token> node scripts/test-railway-webhook.js
```

The script asks for the webhook URL (default `http://localhost:3000/api/webhook`) and appends `?token=` itself. It also needs the Go backend and `BACKEND_WEBHOOK_SECRET` to be set up if you run it against a local stack.

To test with a real deployment, run `railway up` or push to the connected branch, then check the dashboard.

## Accepted payload shapes

The Edge route treats a request as a Railway deployment if any of these holds:

- `type` is a string containing `deploy` (case-insensitive)
- `event` is a string containing `deploy`
- `deployment`, `data.deployment`, or `resource.deployment` is an object

Anything else gets a 202 `ignored` response. The Go backend reads three shapes:

```json
{
  "event": "deployment.completed",
  "data": {
    "deployment": {
      "id": "dep_123456789",
      "status": "DEPLOYED",
      "url": "https://your-service.railway.app",
      "meta": {
        "branch": "main",
        "commitSha": "7f343de0",
        "commitMessage": "Update",
        "author": "Your Name"
      }
    },
    "service": { "id": "svc_987654321", "name": "heimdall-backend" },
    "project": { "id": "prj_123456789", "name": "heimdall" },
    "environment": { "name": "production" }
  }
}
```

Two other shapes work as well: the legacy `{type, status, project, environment, service?, deployment{id, creator, meta}}` and a best-effort `{type: "Deployment.*", resource{project, environment, service, deployment}, details?{status}}`.

The status comes from a `status` field first, then from the suffix of `type` or `event`. These values are normalised:

| Railway value                                      | Heimdall status |
| -------------------------------------------------- | --------------- |
| SUCCESS, DEPLOYED, COMPLETED                       | SUCCESS         |
| BUILDING, DEPLOYING, INITIALIZING, QUEUED, WAITING | BUILDING        |
| FAILED, CRASHED                                    | FAILED          |
| REMOVED, CANCELED, SKIPPED                         | CANCELED        |

The stored metadata keeps only: `project_name`, `service_name`, `service_id`, `deployment_id`, `deployment_url`, `environment`, `status`, `branch`, `commit_sha`, `commit_message`, `author`.

## Environment variables

Vercel (Heimdall frontend):

```env
RAILWAY_WEBHOOK_TOKEN=<token from step 1>
BACKEND_WEBHOOK_SECRET=<shared with the Go backend>
GO_SERVICE_URL=https://your-railway-backend.railway.app
NEXT_PUBLIC_GO_SERVICE_URL=https://your-railway-backend.railway.app
```

Railway (Go backend service):

```env
BACKEND_WEBHOOK_SECRET=<same value as on Vercel>
```

## Troubleshooting

- **401 from the webhook**: the `token` query parameter is missing or does not match `RAILWAY_WEBHOOK_TOKEN`.
- **500 from the webhook**: `RAILWAY_WEBHOOK_TOKEN` or `BACKEND_WEBHOOK_SECRET` is not set on Vercel.
- **202 ignored**: the payload did not look like a deployment event. Check that you subscribed to deployment events.
- **502 from the webhook**: the Go backend is unreachable or returned a server error. Check `/api/health` on the frontend, which reports the backend as `up` or `down`.
- **Event shows wrong status or missing fields**: compare the payload Railway sends with the shapes above, then adjust `backend/transformers/railway.go`.
- **Logs**: the Edge route logs only the provider, event type, delivery id, body size, status, and duration. It never logs headers, payloads, or the token.
