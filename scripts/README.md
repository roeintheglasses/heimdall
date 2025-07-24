# Heimdall Webhook Automation

This directory contains automation scripts for managing Heimdall webhooks across your GitHub repositories.

## 🚀 Quick Start

### 1. Get a GitHub Token
Create a GitHub Personal Access Token at: https://github.com/settings/tokens

**Required scopes:**
- `repo` (Full control of private repositories)
- `admin:repo_hook` (Full control of repository hooks)

### 2. Set Environment Variable
```bash
export GITHUB_TOKEN="ghp_your_token_here"
```

Or create a `.env` file in the project root:
```env
GITHUB_TOKEN=ghp_your_token_here
WEBHOOK_URL=https://your-custom-url.com/api/webhook  # optional
```

### 3. Run the Script
```bash
# From the project root
node scripts/add-webhooks.js

# Or using npm script
npm run add-webhooks
```

## 📋 Features

- **🔍 Auto-discovery**: Finds all your GitHub repositories
- **🛡️ Smart filtering**: Excludes forks by default
- **✅ Duplicate detection**: Skips repos that already have the webhook
- **📊 Progress tracking**: Shows detailed status for each repository
- **🎯 Event configuration**: Configures webhooks for push, create, delete, and release events
- **⚡ Rate limiting**: Includes delays to respect GitHub API limits
- **🎨 Colored output**: Easy-to-read console output with status indicators

## 🔧 Configuration

### Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `GITHUB_TOKEN` | ✅ Yes | - | GitHub Personal Access Token |
| `WEBHOOK_URL` | ❌ No | Production URL | Custom webhook endpoint |

### Webhook Events

The script configures webhooks to listen for these events:
- `push` - Code pushes to any branch
- `create` - Branch/tag creation
- `delete` - Branch/tag deletion  
- `release` - Release creation/updates

## 📖 Usage Examples

### Basic Usage
```bash
GITHUB_TOKEN="ghp_..." node scripts/add-webhooks.js
```

### With Custom Webhook URL
```bash
GITHUB_TOKEN="ghp_..." WEBHOOK_URL="https://my-domain.com/webhook" node scripts/add-webhooks.js
```

### Using .env File
```bash
# Create .env file with your token
echo "GITHUB_TOKEN=ghp_your_token_here" > .env

# Run the script
node scripts/add-webhooks.js
```

## 📊 Sample Output

```
🚀 Heimdall Webhook Manager
📡 Webhook URL: https://heimdall-roeintheglasses.vercel.app/api/webhook
🎯 Events: push, create, delete, release

🔍 Fetching your repositories...
📚 Found 25 repositories (3 forks excluded)

🔧 Processing repositories...
  ✅ Added webhook to my-awesome-project
  ⏭️  Webhook already exists for old-project
  ✅ Added webhook to new-experiment
  ❌ Failed to add webhook to private-repo: No admin access

📊 Summary:
  Total repositories: 25
  ✅ Webhooks added: 20
  ⏭️  Already existed: 3
  ❌ Errors: 2

🎉 All done! Your repositories are now connected to Heimdall.
```

## ❓ Help & Troubleshooting

### Get Help
```bash
node scripts/add-webhooks.js --help
```

### Common Issues

**"GITHUB_TOKEN environment variable is required"**
- Make sure you've set the `GITHUB_TOKEN` environment variable with a valid GitHub Personal Access Token

**"No admin access to repository"**
- The token needs `admin:repo_hook` scope and admin access to the repository
- For organization repos, you may need organization owner permissions

**"HTTP 403: Forbidden"**
- Check that your token has the correct scopes (`repo` and `admin:repo_hook`)
- Verify the token hasn't expired

**"HTTP 422: Validation Failed"**
- The webhook URL might be invalid or unreachable
- Check that your webhook endpoint is accessible from GitHub

## 🔒 Security Notes

- Keep your GitHub token secure and never commit it to version control
- Use environment variables or `.env` files (add `.env` to `.gitignore`)
- The script only adds webhooks, it doesn't modify repository code
- Webhooks are configured with SSL verification enabled (`insecure_ssl: '0'`)

## 🛠️ Advanced Usage

### Dry Run Mode
To see what would happen without making changes, you can modify the script to log actions without executing them.

### Custom Events
Edit the `WEBHOOK_EVENTS` array in the script to customize which events trigger the webhook.

### Include Forks
To include forked repositories, remove or modify the fork filter in the `getUserRepos()` method.