# Heimdall Webhook Scripts

Scripts for managing webhooks across GitHub, Vercel, and Railway.

## Available Scripts

| Script                    | npm Command                    | Description                             |
| ------------------------- | ------------------------------ | --------------------------------------- |
| `add-webhooks.js`         | `npm run add-webhooks`         | Add webhooks to all GitHub repositories |
| `add-vercel-webhooks.js`  | `npm run add-vercel-webhooks`  | Add webhooks to all Vercel projects     |
| `test-webhook.js`         | `npm run test-webhook`         | Test the webhook endpoint               |
| `test-railway-webhook.js` | `npm run test-railway-webhook` | Test Railway webhook integration        |

## Quick Start

### 1. Set Environment Variables

```bash
# GitHub webhooks
export GITHUB_TOKEN="ghp_your_token_here"

# Vercel webhooks
export VERCEL_TOKEN="your_vercel_token_here"

# Optional overrides
export WEBHOOK_URL="https://your-custom-url.com/api/webhook"
export WEBHOOK_SECRET="your-secure-webhook-secret"
```

Or create a `.env` file in the project root:

```env
GITHUB_TOKEN=ghp_your_token_here
VERCEL_TOKEN=your_vercel_token_here
WEBHOOK_SECRET=your-webhook-secret
```

### 2. Run Scripts

```bash
# Add webhooks to all GitHub repos
npm run add-webhooks

# Add webhooks to all Vercel projects
npm run add-vercel-webhooks

# Test webhook endpoint
npm run test-webhook

# Test Railway webhook
npm run test-railway-webhook
```

## GitHub Token Setup

1. Go to https://github.com/settings/tokens
2. Create a token with scopes:
   - `repo` (Full control of private repositories)
   - `admin:repo_hook` (Full control of repository hooks)

## Vercel Token Setup

1. Go to https://vercel.com/account/tokens
2. Create a new token

## Railway Webhooks

Railway requires manual webhook configuration:

1. Go to your Railway dashboard
2. Navigate to your service settings
3. Add webhook URL in the Webhooks section
4. Select deployment events to monitor

Use `npm run test-railway-webhook` to verify your configuration.
