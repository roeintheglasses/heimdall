#!/usr/bin/env node

/**
 * Vercel Webhook Automation Script
 * 
 * This script automatically adds the Heimdall webhook to all your Vercel projects.
 * It uses the Vercel API to list your projects and configure deployment webhooks for each one.
 * 
 * Prerequisites:
 * - Vercel CLI installed: npm i -g vercel
 * - Vercel authentication: vercel login
 * - Or Vercel API token with appropriate scopes
 * 
 * Usage:
 *   node scripts/add-vercel-webhooks.js
 * 
 * Environment Variables:
 *   VERCEL_TOKEN - Your Vercel API Token (optional if using vercel CLI)
 *   WEBHOOK_URL - Your Heimdall webhook URL (optional, defaults to production)
 */

const https = require('https');
const { execSync } = require('child_process');

// Configuration
const VERCEL_API_BASE = 'https://api.vercel.com';
const DEFAULT_WEBHOOK_URL = 'https://heimdall-ashen.vercel.app/api/webhook';
const WEBHOOK_EVENTS = ['deployment.created', 'deployment.succeeded', 'deployment.error'];

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

class VercelWebhookManager {
  constructor(token, webhookUrl) {
    this.token = token;
    this.webhookUrl = webhookUrl;
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
      const url = new URL(path, VERCEL_API_BASE);
      const options = {
        method,
        headers: {
          'Authorization': `Bearer ${this.token}`,
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
              reject(new Error(`HTTP ${res.statusCode}: ${parsed.error?.message || body}`));
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

  async getProjects() {
    this.log('\n🔍 Fetching your Vercel projects...', 'cyan');
    
    try {
      const response = await this.makeRequest('GET', '/v9/projects?limit=100');
      const projects = response.data.projects || [];
      
      this.log(`📚 Found ${projects.length} Vercel projects`, 'green');
      return projects;
    } catch (error) {
      throw new Error(`Failed to fetch projects: ${error.message}`);
    }
  }

  async getExistingWebhooks() {
    try {
      const response = await this.makeRequest('GET', '/v1/webhooks');
      return response.data || [];
    } catch (error) {
      if (error.message.includes('403')) {
        throw new Error(`No access to webhooks`);
      }
      throw error;
    }
  }

  async addWebhook(project) {
    const webhookPayload = {
      url: this.webhookUrl,
      events: WEBHOOK_EVENTS,
      projectIds: [project.id]
    };

    try {
      const response = await this.makeRequest('POST', '/v1/webhooks', webhookPayload);
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  async processProject(project) {
    this.stats.total++;
    
    try {
      // Check if webhook already exists for this project
      const existingHooks = await this.getExistingWebhooks();
      const heimdallHook = existingHooks.find(hook => 
        hook.url === this.webhookUrl && 
        hook.projectIds && 
        hook.projectIds.includes(project.id)
      );

      if (heimdallHook) {
        this.log(`  ⏭️  Webhook already exists for ${project.name}`, 'yellow');
        this.stats.skipped++;
        return { project: project.name, status: 'skipped', reason: 'already exists' };
      }

      // Add the webhook
      await this.addWebhook(project);
      this.log(`  ✅ Added webhook to ${project.name}`, 'green');
      this.stats.added++;
      return { project: project.name, status: 'added' };

    } catch (error) {
      this.log(`  ❌ Failed to add webhook to ${project.name}: ${error.message}`, 'red');
      this.stats.errors++;
      return { project: project.name, status: 'error', error: error.message };
    }
  }

  async run() {
    try {
      this.log(`${colors.bright}🚀 Vercel Webhook Manager${colors.reset}`, 'cyan');
      this.log(`📡 Webhook URL: ${this.webhookUrl}`, 'blue');
      this.log(`🎯 Events: ${WEBHOOK_EVENTS.join(', ')}`, 'blue');

      // Get all projects
      const projects = await this.getProjects();
      
      if (projects.length === 0) {
        this.log('📭 No Vercel projects found to process.', 'yellow');
        return;
      }

      // Check for existing webhook that covers all projects
      this.log('\n🔍 Checking for existing webhook...', 'cyan');
      const existingHooks = await this.getExistingWebhooks();
      const existingHook = existingHooks.find(hook => hook.url === this.webhookUrl);
      
      if (existingHook) {
        this.log(`✅ Found existing webhook (ID: ${existingHook.id})`, 'green');
        
        // Check which projects are already covered
        const coveredProjects = projects.filter(project => 
          existingHook.projectIds && existingHook.projectIds.includes(project.id)
        );
        const uncoveredProjects = projects.filter(project => 
          !existingHook.projectIds || !existingHook.projectIds.includes(project.id)
        );
        
        this.log(`📊 Projects already covered: ${coveredProjects.length}/${projects.length}`, 'blue');
        
        if (uncoveredProjects.length === 0) {
          this.log('🎉 All projects are already covered by the existing webhook!', 'green');
          this.stats.skipped = projects.length;
          this.stats.total = projects.length;
          this.printSummary();
          return;
        }
        
        this.log(`🔧 Need to add ${uncoveredProjects.length} projects to existing webhook`, 'yellow');
        // For now, we'll create a new webhook. In the future, we could update the existing one.
      }

      // Create webhook for all projects
      this.log('\n🔧 Creating webhook for all projects...', 'cyan');
      const projectIds = projects.map(project => project.id);
      
      const webhookPayload = {
        url: this.webhookUrl,
        events: WEBHOOK_EVENTS,
        projectIds: projectIds
      };

      try {
        const webhook = await this.makeRequest('POST', '/v1/webhooks', webhookPayload);
        this.log(`✅ Created webhook for all ${projects.length} projects!`, 'green');
        this.log(`🆔 Webhook ID: ${webhook.data.id}`, 'blue');
        
        this.stats.added = projects.length;
        this.stats.total = projects.length;
        
      } catch (error) {
        this.log(`❌ Failed to create webhook: ${error.message}`, 'red');
        this.stats.errors = projects.length;
        this.stats.total = projects.length;
      }

      // Print summary
      this.printSummary();

    } catch (error) {
      this.log(`\n💥 Fatal error: ${error.message}`, 'red');
      process.exit(1);
    }
  }

  printSummary() {
    this.log('\n📊 Summary:', 'cyan');
    this.log(`  Total projects: ${this.stats.total}`, 'blue');
    this.log(`  ✅ Webhooks added: ${this.stats.added}`, 'green');
    this.log(`  ⏭️  Already existed: ${this.stats.skipped}`, 'yellow');
    this.log(`  ❌ Errors: ${this.stats.errors}`, 'red');
    
    if (this.stats.errors === 0) {
      this.log('\n🎉 All done! Your Vercel projects are now connected to Heimdall.', 'green');
    } else {
      this.log('\n⚠️  Some projects encountered errors. Check the details above.', 'yellow');
    }
  }
}

// Get Vercel token from environment
function getVercelToken() {
  const token = process.env.VERCEL_TOKEN;
  
  if (!token) {
    console.error(`${colors.red}❌ Error: VERCEL_TOKEN environment variable is required.${colors.reset}`);
    console.error(`${colors.yellow}
Please create a Vercel API token and set it as an environment variable:

1. Go to https://vercel.com/account/tokens
2. Create a new token
3. Set it as an environment variable:
   export VERCEL_TOKEN="your_token_here"

Or add it to your .env file:
   VERCEL_TOKEN=your_token_here
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
  }

  const token = getVercelToken();
  const webhookUrl = process.env.WEBHOOK_URL || DEFAULT_WEBHOOK_URL;
  
  const manager = new VercelWebhookManager(token, webhookUrl);
  await manager.run();
}

// Handle CLI arguments
if (process.argv.includes('--help') || process.argv.includes('-h')) {
  console.log(`
${colors.bright}Vercel Webhook Manager${colors.reset}

This script adds the Heimdall webhook to all your Vercel projects.

${colors.cyan}Setup:${colors.reset}
  1. Create a token at: https://vercel.com/account/tokens
  2. Set it as an environment variable:
     export VERCEL_TOKEN="your_token_here"

${colors.cyan}Usage:${colors.reset}
  node scripts/add-vercel-webhooks.js

${colors.cyan}Environment Variables:${colors.reset}
  VERCEL_TOKEN - Your Vercel API Token (required)
  WEBHOOK_URL  - Custom webhook URL (optional, defaults to production)

${colors.cyan}Examples:${colors.reset}
  # Basic usage
  VERCEL_TOKEN="your_token" node scripts/add-vercel-webhooks.js
  
  # With custom webhook URL
  VERCEL_TOKEN="your_token" WEBHOOK_URL="https://my-domain.com/api/webhook" node scripts/add-vercel-webhooks.js
  
  # Using .env file
  echo "VERCEL_TOKEN=your_token" >> .env
  node scripts/add-vercel-webhooks.js
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