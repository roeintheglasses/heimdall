# Heimdall Webhook Scripts

Scripts for managing webhooks across GitHub, Vercel, and Railway.

## Available Scripts

| Script                    | npm Command                    | Description                                       |
| ------------------------- | ------------------------------ | ------------------------------------------------- |
| `add-webhooks.js`         | `npm run add-webhooks`         | Add or update webhooks on all GitHub repositories |
| `add-vercel-webhooks.js`  | `npm run add-vercel-webhooks`  | Add webhooks to all Vercel projects               |
| `test-webhook.js`         | `npm run test-webhook`         | Send a signed GitHub push to the endpoint         |
| `test-railway-webhook.js` | `npm run test-railway-webhook` | Test Railway webhook integration                  |

## Automatic Webhook Sync

A GitHub Action runs daily to automatically add webhooks to new repositories. See `.github/workflows/sync-webhooks.yml`.

### Required Secrets (GitHub Actions)

Add these in your repo Settings > Secrets and variables > Actions:

| Secret                 | Description                                    |
| ---------------------- | ---------------------------------------------- |
| `WEBHOOK_GITHUB_TOKEN` | GitHub PAT with `repo` and `admin:repo_hook`   |
| `WEBHOOK_SECRET`       | GitHub webhook secret, same value as on Vercel |
| `VERCEL_TOKEN`         | Vercel API token (for manual Vercel sync)      |

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

# Required: must match WEBHOOK_SECRET on Vercel (generate with: openssl rand -hex 32)
export WEBHOOK_SECRET="your-secure-webhook-secret"

# Required for test-railway-webhook: must match RAILWAY_WEBHOOK_TOKEN on Vercel
export RAILWAY_WEBHOOK_TOKEN="your-railway-token"

# Optional override
export WEBHOOK_URL="https://your-custom-url.com/api/webhook"
```

`add-webhooks.js` exits with an error when `WEBHOOK_SECRET` is unset. There is no default secret.

Or create a `.env` file in the project root:

```env
GITHUB_TOKEN=ghp_your_token_here
VERCEL_TOKEN=your_vercel_token_here
WEBHOOK_SECRET=your-webhook-secret
RAILWAY_WEBHOOK_TOKEN=your-railway-token
```

### 2. Run Scripts

```bash
# Add webhooks to all GitHub repos (existing Heimdall hooks get their URL and secret updated)
npm run add-webhooks

# Add webhooks to all Vercel projects (per-project)
npm run add-vercel-webhooks

# Add account-level Vercel webhook (covers all current + future projects)
npm run add-vercel-webhooks -- --account-level

# Replace the Vercel webhook and print its new signing secret
npm run add-vercel-webhooks -- --account-level --recreate

# Test webhook endpoint (signs the payload with WEBHOOK_SECRET)
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

### Vercel signing secret

Heimdall verifies Vercel webhooks with `x-vercel-signature` (HMAC-SHA1). Vercel generates the signing secret when the webhook is created and shows it once. The script prints it. Set it as `VERCEL_WEBHOOK_SECRET` on the Heimdall Vercel deployment and redeploy.

To get a secret for an existing webhook, delete and recreate it:

```bash
node scripts/add-vercel-webhooks.js --account-level --recreate
```

The script subscribes to `deployment.created`, `deployment.succeeded`, `deployment.error`, `deployment.canceled`, and `deployment.promoted`.

## Railway Webhooks

Railway cannot sign requests, so Heimdall authenticates it with a token in the URL. See [RAILWAY_WEBHOOK_SETUP.md](../RAILWAY_WEBHOOK_SETUP.md).

1. Generate a token (`openssl rand -hex 32`) and set it as `RAILWAY_WEBHOOK_TOKEN` on Vercel.
2. In the Railway project, add the webhook URL `https://<your-app>/api/webhook?token=<RAILWAY_WEBHOOK_TOKEN>`.
3. Select deployment events.

Use `npm run test-railway-webhook` to verify your configuration.
