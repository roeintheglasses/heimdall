# 🚂 Railway Webhook Setup Guide for Heimdall

Railway webhooks allow Heimdall to automatically track your Railway deployments and display them in your dashboard with rich metadata.

## 📋 Setup Steps

### 1. Configure Railway Project Webhooks

**Navigate to your Railway project:**

1. Go to [railway.app](https://railway.app)
2. Select your project (e.g., `heimdall`)
3. Go to **Settings** → **Webhooks**

### 2. Add Webhook Endpoint

**Create a new webhook:**

- **URL**: `https://your-heimdall-app.vercel.app/api/webhook`
- **Events to subscribe to**:
  - ✅ `deployment.completed`
  - ✅ `deployment.failed`
  - ✅ `deployment.created`
  - ✅ `service.deploy`

**Headers** (optional but recommended):

- `X-Railway-Event`: `deployment.completed` (or relevant event)
- `X-Railway-Project`: `your-project-id`
- `X-Railway-Service`: `your-service-id`

### 3. Test Your Configuration

**Option A: Use the test script**

```bash
node scripts/test-railway-webhook.js
```

**Option B: Manual deployment test**

1. Deploy your Railway service: `railway up` or push to connected branch
2. Check your Heimdall dashboard for the Railway deployment event
3. Verify the event shows proper metadata (service name, status, URLs, etc.)

### 4. Expected Railway Event Format

Heimdall expects Railway webhooks in this format:

```json
{
  "event": "deployment.completed",
  "data": {
    "deployment": {
      "id": "dep_123456789",
      "status": "DEPLOYED",
      "createdAt": "2024-07-25T18:30:00.000Z",
      "url": "https://your-service.railway.app",
      "meta": {
        "branch": "main",
        "commitSha": "7f343de0a1b2c3d4e5f6789012345678901234ab",
        "commitMessage": "Update backend configuration",
        "author": "Your Name"
      }
    },
    "service": {
      "id": "svc_987654321",
      "name": "heimdall-backend",
      "url": "https://heimdall-backend-production.up.railway.app"
    },
    "project": {
      "id": "prj_123456789",
      "name": "heimdall"
    },
    "environment": {
      "name": "production"
    }
  }
}
```

### 5. Environment Variables

**Required in your Railway service** (if not already set):

```bash
railway variables set WEBHOOK_URL="https://your-heimdall-app.vercel.app/api/webhook"
railway variables set HEIMDALL_WEBHOOK_SECRET="your-optional-secret-key"
```

**Required in your Vercel/Heimdall app**:

```env
GO_SERVICE_URL=https://your-railway-backend.railway.app
NEXT_PUBLIC_GO_SERVICE_URL=https://your-railway-backend.railway.app
```

## 🎯 What Railway Events Will Show

Once configured, you'll see Railway deployment events in Heimdall with:

### ✨ Enhanced Railway Event Display

- **🚀 Deployment Status**: SUCCESS, BUILDING, FAILED with color-coded badges
- **⚙️ Service Information**: Service name, project name, environment
- **🔗 Direct Links**: Links to deployed service and Railway logs
- **📊 Resource Details**: Memory/CPU limits if available
- **🌿 Git Integration**: Branch, commit SHA, author, and commit message
- **⏱️ Build Metrics**: Deployment duration and timestamps

### 📱 Mobile-Friendly Display

- Expandable details with "Details" button
- Copy-to-clipboard for IDs and URLs
- Responsive design for all screen sizes

## 🔧 Troubleshooting

### Railway Events Not Appearing?

1. **Check webhook URL**: Ensure `https://your-app.vercel.app/api/webhook` is correct
2. **Verify events**: Make sure you selected the right Railway events
3. **Test manually**: Use `node scripts/test-railway-webhook.js`
4. **Check logs**: Look at Vercel function logs and Railway service logs

### Wrong Event Format?

Railway webhook formats may vary. If events aren't displaying correctly:

1. Check the webhook payload in your logs
2. Update the `transformRailwayDeploy` function in `backend/main.go`
3. Adjust the frontend webhook handler in `src/app/api/webhook/route.ts`

### Headers Not Working?

Railway may send different headers. Common alternatives:

- `X-Railway-Signature` (if signature verification is enabled)
- `X-Webhook-Source: railway`
- `Content-Type: application/json`

## 🚀 Advanced Configuration

### Custom Railway Event Processing

Edit `backend/main.go` to customize how Railway events are processed:

```go
func transformRailwayDeploy(eventData json.RawMessage) (DashboardEvent, error) {
    // Customize this function for your Railway webhook format
    // Add additional metadata fields
    // Handle different Railway event types
}
```

### Multiple Railway Services

To track multiple Railway services:

1. Add separate webhooks for each service
2. Use different Railway project/service headers
3. Customize the event title format in the transform function

## 🎉 Success!

Once configured, your Railway deployments will automatically appear in Heimdall with rich deployment information, making it easy to track your entire deployment pipeline in one place!
