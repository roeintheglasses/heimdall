#!/usr/bin/env node

/**
 * Script to check what webhook URLs are configured in GitHub repositories
 */

require('dotenv').config();

const https = require('https');

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;

if (!GITHUB_TOKEN) {
  console.error('❌ Error: GITHUB_TOKEN environment variable is required');
  process.exit(1);
}

async function checkWebhooks(repoFullName) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'api.github.com',
      path: `/repos/${repoFullName}/hooks`,
      method: 'GET',
      headers: {
        Authorization: `token ${GITHUB_TOKEN}`,
        'User-Agent': 'Heimdall-Webhook-Checker',
        Accept: 'application/vnd.github.v3+json',
      },
    };

    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => (body += chunk));
      res.on('end', () => {
        if (res.statusCode === 200) {
          const webhooks = JSON.parse(body);
          resolve(webhooks);
        } else {
          reject(new Error(`HTTP ${res.statusCode}: ${body}`));
        }
      });
    });

    req.on('error', (err) => reject(err));
    req.end();
  });
}

async function getUserRepos() {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'api.github.com',
      path: '/user/repos?per_page=100&sort=updated',
      method: 'GET',
      headers: {
        Authorization: `token ${GITHUB_TOKEN}`,
        'User-Agent': 'Heimdall-Webhook-Checker',
        Accept: 'application/vnd.github.v3+json',
      },
    };

    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => (body += chunk));
      res.on('end', () => {
        if (res.statusCode === 200) {
          const repos = JSON.parse(body);
          resolve(repos);
        } else {
          reject(new Error(`HTTP ${res.statusCode}: ${body}`));
        }
      });
    });

    req.on('error', (err) => reject(err));
    req.end();
  });
}

async function main() {
  try {
    console.log('🔍 Fetching your repositories...');
    const repos = await getUserRepos();

    console.log(`📊 Found ${repos.length} repositories`);
    console.log('\n🔗 Checking webhook configurations...\n');

    let reposWithWebhooks = 0;
    let totalWebhooks = 0;

    for (const repo of repos.slice(0, 10)) {
      // Check first 10 repos to avoid rate limits
      try {
        const webhooks = await checkWebhooks(repo.full_name);

        if (webhooks.length > 0) {
          reposWithWebhooks++;
          totalWebhooks += webhooks.length;

          console.log(`📋 ${repo.full_name}:`);
          webhooks.forEach((webhook) => {
            console.log(`  ├─ URL: ${webhook.config.url}`);
            console.log(`  ├─ Events: ${webhook.events.join(', ')}`);
            console.log(`  ├─ Active: ${webhook.active}`);
            console.log(`  └─ Created: ${webhook.created_at}`);
          });
          console.log('');
        } else {
          console.log(`📋 ${repo.full_name}: No webhooks configured`);
        }

        // Rate limiting
        await new Promise((resolve) => setTimeout(resolve, 100));
      } catch (error) {
        console.log(`❌ ${repo.full_name}: Error checking webhooks - ${error.message}`);
      }
    }

    console.log(`\n📊 Summary:`);
    console.log(`   Repositories with webhooks: ${reposWithWebhooks}`);
    console.log(`   Total webhooks found: ${totalWebhooks}`);

    if (reposWithWebhooks === 0) {
      console.log('\n❗ No webhooks found in your repositories!');
      console.log('   This explains why GitHub pushes are not showing up in the dashboard.');
      console.log('   Run "npm run add-webhooks" to configure webhooks for all your repositories.');
    }
  } catch (error) {
    console.error('💥 Error:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}
