# 🤖 Webhook Automation Scripts

Automated scripts to set up Heimdall webhooks across all your projects on different platforms.

## 🚀 Quick Start

### Set up webhooks for all platforms

```bash
npm run setup-all-webhooks
```

### Set up webhooks for specific platforms

```bash
# Only GitHub
npm run setup-all-webhooks -- --platform=github

# Only Vercel
npm run add-vercel-webhooks

# Only GitHub (legacy)
npm run add-webhooks
```

## 📋 Prerequisites

### GitHub

1. Create a Personal Access Token at [github.com/settings/tokens](https://github.com/settings/tokens)
2. Grant scopes: `repo` and `admin:repo_hook`
3. Set environment variable:
   ```bash
   export GITHUB_TOKEN="ghp_your_token_here"
   ```

### Vercel

Choose **one** method:

**Method 1 - CLI (Recommended):**

```bash
npm i -g vercel
vercel login
```

**Method 2 - API Token:**

```bash
# Get token from https://vercel.com/account/tokens
export VERCEL_TOKEN="your_token_here"
```

### Railway

Manual setup required - see [RAILWAY_WEBHOOK_SETUP.md](./RAILWAY_WEBHOOK_SETUP.md)

## 🛠️ Available Scripts

| Script                        | Description                           |
| ----------------------------- | ------------------------------------- |
| `npm run setup-all-webhooks`  | Sets up webhooks for all platforms    |
| `npm run add-webhooks`        | GitHub only (legacy)                  |
| `npm run add-vercel-webhooks` | Vercel only                           |
| `npm run check-webhooks`      | Check existing webhook configurations |
| `npm run test-webhook`        | Test webhook endpoint                 |

## 🎯 What Gets Set Up

### GitHub Webhooks

- **Events**: `push`, `create`, `delete`, `release`
- **URL**: `https://your-heimdall-app.vercel.app/api/webhook`
- **Headers**: `X-GitHub-Event`, `X-Hub-Signature-256`

### Vercel Webhooks

- **Events**: `deployment.created`, `deployment.succeeded`, `deployment.failed`, `deployment.ready`
- **URL**: `https://your-heimdall-app.vercel.app/api/webhook`
- **Headers**: `X-Vercel-Deployment-URL`

### Railway Webhooks

- **Events**: `deployment.completed`, `deployment.failed`, `deployment.created`
- **Manual setup**: Configure in Railway dashboard
- **Headers**: `X-Railway-Event`

## 🔧 Configuration

### Environment Variables

```bash
# Required for GitHub
GITHUB_TOKEN=ghp_your_github_token

# Required for Vercel (if not using CLI)
VERCEL_TOKEN=your_vercel_token

# Optional - Custom webhook URL
WEBHOOK_URL=https://your-custom-domain.com/api/webhook

# Optional - Custom webhook secret
WEBHOOK_SECRET=your_custom_secret_here
```

### Custom Webhook URL

```bash
# Use custom domain
WEBHOOK_URL="https://my-domain.com/api/webhook" npm run setup-all-webhooks
```

## 🧪 Testing

### Test webhook endpoint

```bash
npm run test-webhook
```

### Check existing webhooks

```bash
npm run check-webhooks
```

### Manual test

1. Make a commit and push to GitHub
2. Deploy a Vercel project
3. Check your Heimdall dashboard for events

## 🔍 Troubleshooting

### Common Issues

**GitHub: "403 Forbidden"**

- Check token has `admin:repo_hook` scope
- Verify you have admin access to the repository

**Vercel: "Authentication failed"**

- Run `vercel login` or check `VERCEL_TOKEN`
- Verify token has appropriate permissions

**Webhook not receiving events**

- Check webhook URL is publicly accessible
- Verify webhook endpoint is responding with 200
- Check platform webhook logs

### Debug Commands

```bash
# Check webhook configurations
npm run check-webhooks

# Test endpoint manually
curl -X POST https://your-app.vercel.app/api/webhook \
  -H "Content-Type: application/json" \
  -H "X-GitHub-Event: push" \
  -d '{"test": true}'
```

## 📊 Script Output

The scripts provide detailed output:

- ✅ Success indicators
- ⏭️ Skip indicators (webhook already exists)
- ❌ Error indicators with details
- 📊 Final summary with statistics

## 🔐 Security Notes

- Webhook secrets are used for GitHub signature verification
- Tokens are never logged or displayed
- Use environment variables or `.env` files for sensitive data
- Default webhook secret is provided but custom secrets are recommended for production

## 📞 Support

If you encounter issues:

1. Check the error messages in the script output
2. Verify prerequisites are met
3. Test webhook endpoint manually
4. Check platform-specific documentation
