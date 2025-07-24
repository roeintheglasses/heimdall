#!/usr/bin/env node

/**
 * Heimdall Webhook Automation Script
 * 
 * This script automatically adds the Heimdall webhook to all your GitHub repositories.
 * It uses the GitHub API to list your repos and configure webhooks for each one.
 * 
 * Prerequisites:
 * - GitHub Personal Access Token with 'repo' and 'admin:repo_hook' scopes
 * - Node.js environment
 * 
 * Usage:
 *   node scripts/add-webhooks.js
 * 
 * Environment Variables:
 *   GITHUB_TOKEN - Your GitHub Personal Access Token
 *   WEBHOOK_URL - Your Heimdall webhook URL (optional, defaults to production)
 */

const https = require('https');
const { promisify } = require('util');

// Configuration
const GITHUB_API_BASE = 'https://api.github.com';
const DEFAULT_WEBHOOK_URL = 'https://heimdall-roeintheglasses.vercel.app/api/webhook';
const WEBHOOK_EVENTS = ['push', 'create', 'delete', 'release'];
const DEFAULT_WEBHOOK_SECRET = 'heimdall-webhook-secret-2024';

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

class GitHubWebhookManager {
  constructor(token, webhookUrl, webhookSecret) {
    this.token = token;
    this.webhookUrl = webhookUrl;
    this.webhookSecret = webhookSecret;
    this.stats = {
      total: 0,
      added: 0,
      skipped: 0,
      errors: 0
    };
  }

  log(message, color = 'reset') {
    console.log(`${colors[color]}${message}${colors.reset}`);
  }

  async makeRequest(method, path, data = null) {
    return new Promise((resolve, reject) => {
      const url = new URL(path, GITHUB_API_BASE);
      const options = {
        method,
        headers: {
          'Authorization': `token ${this.token}`,
          'User-Agent': 'Heimdall-Webhook-Manager/1.0',
          'Accept': 'application/vnd.github.v3+json',
          'Content-Type': 'application/json'
        }
      };

      const req = https.request(url, options, (res) => {
        let body = '';
        res.on('data', chunk => body += chunk);
        res.on('end', () => {
          try {
            const parsed = body ? JSON.parse(body) : {};
            if (res.statusCode >= 200 && res.statusCode < 300) {
              resolve({ data: parsed, status: res.statusCode });
            } else {
              reject(new Error(`HTTP ${res.statusCode}: ${parsed.message || body}`));
            }
          } catch (err) {
            reject(new Error(`Parse error: ${err.message}`));
          }
        });
      });

      req.on('error', reject);

      if (data) {
        req.write(JSON.stringify(data));
      }
      
      req.end();
    });
  }

  async getUserRepos() {
    this.log('\n🔍 Fetching your repositories...', 'cyan');
    
    let allRepos = [];
    let page = 1;
    let hasMore = true;

    while (hasMore) {
      try {
        const response = await this.makeRequest('GET', `/user/repos?per_page=100&page=${page}&sort=updated`);
        const repos = response.data;
        
        if (repos.length === 0) {
          hasMore = false;
        } else {
          allRepos = allRepos.concat(repos);
          page++;
        }
      } catch (error) {
        throw new Error(`Failed to fetch repositories: ${error.message}`);
      }
    }

    // Filter out forks unless you want to include them
    const ownRepos = allRepos.filter(repo => !repo.fork);
    
    this.log(`📚 Found ${ownRepos.length} repositories (${allRepos.length - ownRepos.length} forks excluded)`, 'green');
    return ownRepos;
  }

  async getExistingWebhooks(repo) {
    try {
      const response = await this.makeRequest('GET', `/repos/${repo.full_name}/hooks`);
      return response.data;
    } catch (error) {
      if (error.message.includes('403')) {
        throw new Error(`No admin access to ${repo.full_name}`);
      }
      throw error;
    }
  }

  async addWebhook(repo) {
    const webhookPayload = {
      name: 'web',
      active: true,
      events: WEBHOOK_EVENTS,
      config: {
        url: this.webhookUrl,
        content_type: 'json',
        secret: this.webhookSecret,
        insecure_ssl: '0'
      }
    };

    try {
      const response = await this.makeRequest('POST', `/repos/${repo.full_name}/hooks`, webhookPayload);
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  async processRepository(repo) {
    this.stats.total++;
    
    try {
      // Check if webhook already exists
      const existingHooks = await this.getExistingWebhooks(repo);
      const heimdallHook = existingHooks.find(hook => 
        hook.config && hook.config.url === this.webhookUrl
      );

      if (heimdallHook) {
        this.log(`  ⏭️  Webhook already exists for ${repo.name}`, 'yellow');
        this.stats.skipped++;
        return { repo: repo.name, status: 'skipped', reason: 'already exists' };
      }

      // Add the webhook
      await this.addWebhook(repo);
      this.log(`  ✅ Added webhook to ${repo.name}`, 'green');
      this.stats.added++;
      return { repo: repo.name, status: 'added' };

    } catch (error) {
      this.log(`  ❌ Failed to add webhook to ${repo.name}: ${error.message}`, 'red');
      this.stats.errors++;
      return { repo: repo.name, status: 'error', error: error.message };
    }
  }

  async run() {
    try {
      this.log(`${colors.bright}🚀 Heimdall Webhook Manager${colors.reset}`, 'cyan');
      this.log(`📡 Webhook URL: ${this.webhookUrl}`, 'blue');
      this.log(`🔐 Webhook Secret: ${'*'.repeat(this.webhookSecret.length)}`, 'blue');
      this.log(`🎯 Events: ${WEBHOOK_EVENTS.join(', ')}`, 'blue');

      // Get all repositories
      const repos = await this.getUserRepos();
      
      if (repos.length === 0) {
        this.log('📭 No repositories found to process.', 'yellow');
        return;
      }

      // Process each repository
      this.log('\n🔧 Processing repositories...', 'cyan');
      const results = [];
      
      for (const repo of repos) {
        const result = await this.processRepository(repo);
        results.push(result);
        
        // Add a small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      // Print summary
      this.printSummary();
      
      // Print detailed results if there were errors
      const errors = results.filter(r => r.status === 'error');
      if (errors.length > 0) {
        this.log('\n❌ Repositories with errors:', 'red');
        errors.forEach(error => {
          this.log(`  • ${error.repo}: ${error.error}`, 'red');
        });
      }

    } catch (error) {
      this.log(`\n💥 Fatal error: ${error.message}`, 'red');
      process.exit(1);
    }
  }

  printSummary() {
    this.log('\n📊 Summary:', 'cyan');
    this.log(`  Total repositories: ${this.stats.total}`, 'blue');
    this.log(`  ✅ Webhooks added: ${this.stats.added}`, 'green');
    this.log(`  ⏭️  Already existed: ${this.stats.skipped}`, 'yellow');
    this.log(`  ❌ Errors: ${this.stats.errors}`, 'red');
    
    if (this.stats.errors === 0) {
      this.log('\n🎉 All done! Your repositories are now connected to Heimdall.', 'green');
    } else {
      this.log('\n⚠️  Some repositories encountered errors. Check the details above.', 'yellow');
    }
  }
}

// Validation and setup
function validateEnvironment() {
  const token = process.env.GITHUB_TOKEN;
  if (!token) {
    console.error(`${colors.red}❌ Error: GITHUB_TOKEN environment variable is required.${colors.reset}`);
    console.error(`${colors.yellow}
Please create a GitHub Personal Access Token with the following scopes:
  • repo (Full control of private repositories)  
  • admin:repo_hook (Full control of repository hooks)

Then set it as an environment variable:
  export GITHUB_TOKEN="your_token_here"

Or create a .env file in the project root:
  GITHUB_TOKEN=your_token_here
  WEBHOOK_SECRET=your_webhook_secret_here

${colors.bright}Security Note:${colors.reset}${colors.yellow}
Make sure to use the same WEBHOOK_SECRET in your webhook endpoint 
to verify that payloads are actually coming from GitHub.
${colors.reset}`);
    process.exit(1);
  }
  return token;
}

// Main execution
async function main() {
  // Load .env file if it exists
  try {
    const dotenv = require('dotenv');
    const result = dotenv.config();
    
    if (result.parsed) {
      console.log(`${colors.green}✅ Loaded .env file with ${Object.keys(result.parsed).length} variables${colors.reset}`);
    }
  } catch (err) {
    // dotenv not available, continue without it
    console.log(`${colors.yellow}⚠️  .env file support not available: ${err.message}${colors.reset}`);
  }

  const token = validateEnvironment();
  const webhookUrl = process.env.WEBHOOK_URL || DEFAULT_WEBHOOK_URL;
  const webhookSecret = process.env.WEBHOOK_SECRET || DEFAULT_WEBHOOK_SECRET;
  
  if (webhookSecret === DEFAULT_WEBHOOK_SECRET) {
    console.log(`${colors.yellow}⚠️  Using default webhook secret. For production, set a custom WEBHOOK_SECRET environment variable.${colors.reset}`);
  }
  
  const manager = new GitHubWebhookManager(token, webhookUrl, webhookSecret);
  await manager.run();
}

// Handle CLI arguments
if (process.argv.includes('--help') || process.argv.includes('-h')) {
  console.log(`
${colors.bright}Heimdall Webhook Manager${colors.reset}

This script adds the Heimdall webhook to all your GitHub repositories.

${colors.cyan}Setup:${colors.reset}
  1. Create a GitHub Personal Access Token at: https://github.com/settings/tokens
  2. Grant these scopes: 'repo' and 'admin:repo_hook'
  3. Set the token as an environment variable:
     export GITHUB_TOKEN="your_token_here"

${colors.cyan}Usage:${colors.reset}
  node scripts/add-webhooks.js

${colors.cyan}Environment Variables:${colors.reset}
  GITHUB_TOKEN   - Your GitHub Personal Access Token (required)
  WEBHOOK_URL    - Custom webhook URL (optional, defaults to production)
  WEBHOOK_SECRET - Secret for webhook verification (optional, defaults to built-in)

${colors.cyan}Examples:${colors.reset}
  # Basic usage with environment variable
  GITHUB_TOKEN="ghp_..." node scripts/add-webhooks.js
  
  # With custom webhook URL and secret
  GITHUB_TOKEN="ghp_..." WEBHOOK_URL="https://my-domain.com/webhook" WEBHOOK_SECRET="my-secret" node scripts/add-webhooks.js
`);
  process.exit(0);
}

// Run the script
if (require.main === module) {
  main().catch(error => {
    console.error(`${colors.red}💥 Unhandled error: ${error.message}${colors.reset}`);
    process.exit(1);
  });
}