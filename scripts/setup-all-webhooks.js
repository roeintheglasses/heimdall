#!/usr/bin/env node

/**
 * Universal Webhook Setup Script
 * 
 * This script sets up webhooks for all supported platforms:
 * - GitHub repositories (pushes, releases)
 * - Vercel projects (deployments)
 * - Railway services (deployments)
 * 
 * Usage:
 *   node scripts/setup-all-webhooks.js [--platform=github,vercel,railway]
 *   node scripts/setup-all-webhooks.js --help
 */

const { execSync } = require('child_process');
const path = require('path');

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

class UniversalWebhookManager {
  constructor(platforms = ['github', 'vercel']) {
    this.platforms = platforms;
    this.results = {};
  }

  log(message, color = 'reset') {
    console.log(`${colors[color]}${message}${colors.reset}`);
  }

  async runScript(scriptName, platform) {
    const scriptPath = path.join(__dirname, scriptName);
    this.log(`\n🚀 Running ${platform} webhook setup...`, 'cyan');
    
    try {
      const output = execSync(`node "${scriptPath}"`, { 
        encoding: 'utf8',
        stdio: 'pipe'
      });
      
      console.log(output);
      this.results[platform] = { status: 'success', output };
      this.log(`✅ ${platform} webhook setup completed successfully!`, 'green');
      
    } catch (error) {
      const errorOutput = error.stdout || error.stderr || error.message;
      console.error(errorOutput);
      this.results[platform] = { status: 'error', error: errorOutput };
      this.log(`❌ ${platform} webhook setup failed!`, 'red');
    }
  }

  async checkPrerequisites() {
    this.log('\n🔍 Checking prerequisites...', 'cyan');
    const issues = [];

    // Check for required environment variables
    if (this.platforms.includes('github') && !process.env.GITHUB_TOKEN) {
      issues.push('GitHub: GITHUB_TOKEN environment variable is required');
    }

    // Check for Vercel token
    if (this.platforms.includes('vercel') && !process.env.VERCEL_TOKEN) {
      issues.push('Vercel: VERCEL_TOKEN environment variable is required');
    }

    if (issues.length > 0) {
      this.log('\n❌ Prerequisites not met:', 'red');
      issues.forEach(issue => this.log(`  • ${issue}`, 'red'));
      this.log('\nPlease resolve these issues and try again.', 'yellow');
      this.log('Run with --help for setup instructions.', 'blue');
      return false;
    }

    this.log('✅ All prerequisites met!', 'green');
    return true;
  }


  async run() {
    this.log(`${colors.bright}🌐 Universal Webhook Manager${colors.reset}`, 'magenta');
    this.log(`🎯 Platforms: ${this.platforms.join(', ')}`, 'blue');

    // Check prerequisites
    const prereqsMet = await this.checkPrerequisites();
    if (!prereqsMet) {
      process.exit(1);
    }

    // Run platform-specific scripts
    if (this.platforms.includes('github')) {
      await this.runScript('add-webhooks.js', 'GitHub');
    }

    if (this.platforms.includes('vercel')) {
      await this.runScript('add-vercel-webhooks.js', 'Vercel');
    }

    if (this.platforms.includes('railway')) {
      this.log('\n🚂 Railway webhook setup...', 'cyan');
      this.log('ℹ️  Railway webhooks need to be configured manually in the Railway dashboard.', 'yellow');
      this.log('📖 See RAILWAY_WEBHOOK_SETUP.md for detailed instructions.', 'blue');
    }

    // Print final summary
    this.printFinalSummary();
  }

  printFinalSummary() {
    this.log('\n' + '='.repeat(60), 'cyan');
    this.log('📊 Final Summary', 'cyan');
    this.log('='.repeat(60), 'cyan');

    for (const [platform, result] of Object.entries(this.results)) {
      const status = result.status === 'success' ? '✅' : '❌';
      const color = result.status === 'success' ? 'green' : 'red';
      this.log(`${status} ${platform}: ${result.status}`, color);
    }

    const successCount = Object.values(this.results).filter(r => r.status === 'success').length;
    const totalCount = Object.keys(this.results).length;

    this.log('\n🎯 Next Steps:', 'cyan');
    
    if (successCount === totalCount && totalCount > 0) {
      this.log('✅ All webhook setups completed successfully!', 'green');
      this.log('🔥 Your projects will now send deployment events to Heimdall.', 'green');
      this.log('📱 Check your dashboard to see events flowing in.', 'blue');
    } else if (successCount > 0) {
      this.log(`⚠️  ${successCount}/${totalCount} platforms configured successfully.`, 'yellow');
      this.log('🔧 Review the errors above and re-run for failed platforms.', 'yellow');
    } else {
      this.log('❌ No platforms were configured successfully.', 'red');
      this.log('🔧 Check the error messages above and resolve issues.', 'red');
    }

    this.log('\n🧪 Test your setup:', 'cyan');
    this.log('• Make a commit and push to GitHub', 'blue');
    this.log('• Deploy a Vercel project', 'blue');
    this.log('• Check your Heimdall dashboard for events', 'blue');
  }
}

// Parse command line arguments
function parseArgs() {
  const args = process.argv.slice(2);
  let platforms = ['github', 'vercel']; // Default platforms

  for (const arg of args) {
    if (arg.startsWith('--platform=')) {
      platforms = arg.split('=')[1].split(',').map(p => p.trim().toLowerCase());
    }
  }

  // Validate platforms
  const validPlatforms = ['github', 'vercel', 'railway'];
  const invalidPlatforms = platforms.filter(p => !validPlatforms.includes(p));
  
  if (invalidPlatforms.length > 0) {
    console.error(`${colors.red}❌ Invalid platforms: ${invalidPlatforms.join(', ')}${colors.reset}`);
    console.error(`${colors.yellow}Valid platforms: ${validPlatforms.join(', ')}${colors.reset}`);
    process.exit(1);
  }

  return { platforms };
}

// Show help
function showHelp() {
  console.log(`
${colors.bright}Universal Webhook Manager${colors.reset}

Sets up webhooks for all your projects across multiple platforms.

${colors.cyan}Usage:${colors.reset}
  node scripts/setup-all-webhooks.js [options]

${colors.cyan}Options:${colors.reset}
  --platform=PLATFORMS  Comma-separated list of platforms (default: github,vercel)
  --help, -h            Show this help message

${colors.cyan}Supported Platforms:${colors.reset}
  github   - GitHub repository webhooks (pushes, releases)
  vercel   - Vercel project webhooks (deployments)
  railway  - Railway service webhooks (manual setup required)

${colors.cyan}Prerequisites:${colors.reset}

${colors.bright}GitHub:${colors.reset}
  • GITHUB_TOKEN environment variable
  • Token scopes: 'repo', 'admin:repo_hook'
  • Get token at: https://github.com/settings/tokens

${colors.bright}Vercel:${colors.reset}
  • VERCEL_TOKEN environment variable
  • Get token at: https://vercel.com/account/tokens

${colors.bright}Railway:${colors.reset}
  • Manual configuration in Railway dashboard
  • See RAILWAY_WEBHOOK_SETUP.md for instructions

${colors.cyan}Examples:${colors.reset}
  # Setup all default platforms (GitHub + Vercel)
  node scripts/setup-all-webhooks.js

  # Setup only GitHub
  node scripts/setup-all-webhooks.js --platform=github

  # Setup GitHub and Vercel
  node scripts/setup-all-webhooks.js --platform=github,vercel

  # Setup all platforms including Railway
  node scripts/setup-all-webhooks.js --platform=github,vercel,railway

${colors.cyan}Environment Variables:${colors.reset}
  GITHUB_TOKEN   - GitHub Personal Access Token
  VERCEL_TOKEN   - Vercel API Token (optional if using CLI)
  WEBHOOK_URL    - Custom webhook URL (optional)
  WEBHOOK_SECRET - Custom webhook secret (optional)
`);
}

// Main execution
async function main() {
  const { platforms } = parseArgs();
  
  const manager = new UniversalWebhookManager(platforms);
  await manager.run();
}

// Handle CLI arguments
if (process.argv.includes('--help') || process.argv.includes('-h')) {
  showHelp();
  process.exit(0);
}

// Run the script
if (require.main === module) {
  main().catch(error => {
    console.error(`${colors.red}💥 Unhandled error: ${error.message}${colors.reset}`);
    process.exit(1);
  });
}