# Heimdall Dashboard - Complete Setup Guide

This guide walks you through deploying your Heimdall real-time dashboard to production using Vercel, Railway/Fly.io, and a cloud database.

## Overview

The deployment involves three main components:
1. **Frontend + Edge Functions** → Vercel
2. **Go Service** → Railway/Fly.io/Render
3. **Database** → Neon/Supabase

## Step 1: Deploy the Go Service

You need to deploy the backend service first to get its URL for the frontend.

### Option A: Railway (Recommended)

1. **Install Railway CLI**:
   ```bash
   npm install -g @railway/cli
   ```

2. **Deploy the Go service**:
   ```bash
   cd backend
   railway login
   railway link
   railway up
   ```

3. **Note the deployment URL** (e.g., `https://your-service.railway.app`)

### Option B: Fly.io

1. **Install flyctl**: Follow [fly.io/docs/hands-on/install-flyctl/](https://fly.io/docs/hands-on/install-flyctl/)

2. **Deploy from backend directory**:
   ```bash
   cd backend
   fly launch
   fly deploy
   ```

### Option C: Render

1. Go to [render.com](https://render.com)
2. Connect your GitHub repository
3. Choose "Web Service"
4. **Settings**:
   - Root directory: `backend`
   - Build command: `go build -o main .`
   - Start command: `./main`
   - Environment: Add `PORT=8080`

## Step 2: Set Up Database

### Option A: Neon (Recommended)

1. **Create account**: Go to [neon.tech](https://neon.tech)
2. **Create new project** with PostgreSQL
3. **Get connection string** from dashboard
4. **Run schema**:
   - Go to Neon SQL Editor
   - Copy and paste contents from `database/schema.sql`
   - Execute the SQL

### Option B: Supabase

1. **Create account**: Go to [supabase.com](https://supabase.com)
2. **Create new project**
3. **Set up schema**:
   - Go to SQL Editor in dashboard
   - Paste contents of `database/schema.sql`
   - Run the query

## Step 3: Deploy Frontend to Vercel

### Connect Repository

**Option A: Vercel CLI**
```bash
npm i -g vercel
vercel
```

**Option B: Vercel Dashboard**
1. Go to [vercel.com](https://vercel.com)
2. Click "Import Project"
3. Connect your GitHub repository
4. Click "Deploy"

### Set Environment Variables

In Vercel dashboard, go to **Settings → Environment Variables** and add:

```env
# GitHub Webhook Secret (generate a random string)
GITHUB_WEBHOOK_SECRET=your_random_secret_here_123

# Go Service URL (from Step 1)
GO_SERVICE_URL=https://your-go-service.railway.app
NEXT_PUBLIC_GO_SERVICE_URL=https://your-go-service.railway.app

# Database URL (from Step 2)
DATABASE_URL=postgresql://user:password@host:port/database?sslmode=require

# Optional: QStash for production message queue
QSTASH_URL=https://qstash.upstash.io/v2/publish/your-endpoint
QSTASH_TOKEN=your_qstash_token_here
```

**Important**: Click "Add" for each variable and ensure they're available for all environments (Production, Preview, Development).

## Step 4: Update Go Service Environment

Add environment variables to your Go service deployment:

### Railway
```bash
railway variables set DATABASE_URL="your_database_url_here"
railway variables set PORT="8080"
```

### Fly.io
Add to `fly.toml`:
```toml
[env]
  PORT = "8080"

[[env]]
  DATABASE_URL = "your_database_url_here"
```

### Render
Add in Render dashboard under Environment Variables.

## Step 5: Configure GitHub Webhooks

1. **Go to your GitHub repository**
2. **Settings → Webhooks → Add webhook**
3. **Configure webhook**:
   - **Payload URL**: `https://your-app.vercel.app/api/webhook`
   - **Content type**: `application/json`
   - **Secret**: Same value as your `GITHUB_WEBHOOK_SECRET`
   - **Events**: Select "Push events"
   - **Active**: ✅ Checked

4. **Save webhook**

## Step 6: Test Your Deployment

### Test Health Endpoints

```bash
# Test frontend
curl https://your-app.vercel.app/api/health

# Test Go service
curl https://your-go-service.railway.app/api/health

# Test database connection (should return events)
curl https://your-go-service.railway.app/api/events
```

### Test Dashboard

1. Visit `https://your-app.vercel.app/dashboard`
2. You should see the connection indicator as "🟢 Live"
3. Make a commit to your repository
4. Watch it appear in real-time on your dashboard!

### Test Webhook Manually

```bash
# Test with curl (replace with your actual webhook secret)
curl -X POST https://your-app.vercel.app/api/webhook \
  -H "Content-Type: application/json" \
  -H "X-GitHub-Event: push" \
  -H "X-Hub-Signature-256: sha256=$(echo -n '{"test":"data"}' | openssl dgst -sha256 -hmac 'your_webhook_secret' | sed 's/^.* //')" \
  -d '{"repository":{"name":"test-repo"},"head_commit":{"message":"Test commit","author":{"name":"Test User"}}}'
```

## Step 7: Optional - QStash Setup (Production)

For production-grade message queuing:

1. **Create account**: Go to [upstash.com](https://upstash.com)
2. **Create QStash instance**
3. **Get credentials**:
   - QStash URL endpoint
   - QStash token
4. **Update Vercel environment variables**:
   ```env
   QSTASH_URL=https://qstash.upstash.io/v2/publish/your-endpoint
   QSTASH_TOKEN=your_qstash_token_here
   ```

## Troubleshooting

### Common Issues

**❌ "Go service not reachable"**
- ✅ Verify `GO_SERVICE_URL` in Vercel environment variables
- ✅ Check Go service is running: `curl https://your-go-service.railway.app/api/health`
- ✅ Check Go service logs for errors

**❌ "Database connection failed"**
- ✅ Verify `DATABASE_URL` format is correct
- ✅ Check database schema was applied (tables exist)
- ✅ Test database connection from Go service logs

**❌ "Webhooks not working"**
- ✅ Check GitHub webhook delivery tab (Settings → Webhooks → Recent Deliveries)
- ✅ Verify webhook secret matches in both GitHub and Vercel
- ✅ Check Vercel function logs: `vercel logs`

**❌ "Dashboard shows disconnected"**
- ✅ Check browser console for SSE connection errors
- ✅ Verify `NEXT_PUBLIC_GO_SERVICE_URL` is set correctly
- ✅ Test SSE endpoint: `curl https://your-app.vercel.app/api/events/stream`

### Checking Logs

**Vercel Function Logs**:
```bash
vercel logs
```

**Railway Logs**:
```bash
railway logs
```

**GitHub Webhook Deliveries**:
Go to your repo → Settings → Webhooks → Click on your webhook → Recent Deliveries

## Environment Variables Summary

Here's a complete list of all environment variables you need:

### Vercel (Frontend)
```env
GITHUB_WEBHOOK_SECRET=your_random_secret_123
GO_SERVICE_URL=https://your-go-service.railway.app
NEXT_PUBLIC_GO_SERVICE_URL=https://your-go-service.railway.app
QSTASH_URL=https://qstash.upstash.io/v2/publish/your-endpoint  # Optional
QSTASH_TOKEN=your_qstash_token_here  # Optional
```

### Go Service (Railway/Fly.io/Render)
```env
DATABASE_URL=postgresql://user:password@host:port/database?sslmode=require
PORT=8080
```

### GitHub Webhook
```env
Secret: your_random_secret_123  # Same as GITHUB_WEBHOOK_SECRET
```

## Success Checklist

- [ ] Go service deployed and health check returns 200
- [ ] Database created and schema applied
- [ ] Frontend deployed to Vercel
- [ ] All environment variables configured
- [ ] GitHub webhook configured and active
- [ ] Dashboard accessible at your-app.vercel.app/dashboard
- [ ] Connection indicator shows "🟢 Live"
- [ ] Test commit appears in dashboard within seconds

## Next Steps

Once everything is working:

1. **Monitor performance**: Check that updates appear within 400ms as targeted
2. **Add more webhooks**: Set up Vercel deployment webhooks
3. **Scale monitoring**: Add more services and event types
4. **Custom domains**: Configure custom domain in Vercel
5. **Analytics**: Monitor usage and performance

Your Heimdall dashboard is now live and monitoring your development activity in real-time! 🎉