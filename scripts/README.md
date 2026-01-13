# Heimdall Webhook Scripts

Scripts for managing webhooks across GitHub, Vercel, and Railway.

## Available Scripts

| Script                    | npm Command                    | Description                             |
| ------------------------- | ------------------------------ | --------------------------------------- |
| `add-webhooks.js`         | `npm run add-webhooks`         | Add webhooks to all GitHub repositories |
| `add-vercel-webhooks.js`  | `npm run add-vercel-webhooks`  | Add webhooks to all Vercel projects     |
| `test-webhook.js`         | `npm run test-webhook`         | Test the webhook endpoint               |
| `test-railway-webhook.js` | `npm run test-railway-webhook` | Test Railway webhook integration        |

## Automatic Webhook Sync

A GitHub Action runs daily to automatically add webhooks to new repositories. See `.github/workflows/sync-webhooks.yml`.

### Required Secrets (GitHub Actions)

Add these in your repo Settings > Secrets and variables > Actions:

| Secret                 | Description                                  |
| ---------------------- | -------------------------------------------- |
| `WEBHOOK_GITHUB_TOKEN` | GitHub PAT with `repo` and `admin:repo_hook` |
| `WEBHOOK_SECRET`       | Secret for webhook signature verification    |
| `VERCEL_TOKEN`         | Vercel API token (for manual Vercel sync)    |

### Required Variables

| Variable      | Description                                        |
| ------------- | -------------------------------------------------- |
| `WEBHOOK_URL` | Your Heimdall webhook URL (defaults to production) |

### Manual Trigger

You can manually trigger the webhook sync from Actions > Sync Webhooks > Run workflow.

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

# Add webhooks to all Vercel projects (per-project)
npm run add-vercel-webhooks

# Add account-level Vercel webhook (covers all current + future projects)
npm run add-vercel-webhooks -- --account-level

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

### Account-Level Webhooks (Recommended)

For automatic coverage of new Vercel projects, use the `--account-level` flag:

```bash
node scripts/add-vercel-webhooks.js --account-level
```

This creates a single webhook that automatically covers all current and future projects.

## Railway Webhooks

Railway requires manual webhook configuration:

1. Go to your Railway dashboard
2. Navigate to your service settings
3. Add webhook URL in the Webhooks section
4. Select deployment events to monitor

Use `npm run test-railway-webhook` to verify your configuration.
