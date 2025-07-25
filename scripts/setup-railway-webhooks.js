#!/usr/bin/env node

/**
 * Railway Webhook Setup Script
 * 
 * This script sets up webhooks for Railway deployment events.
 * Railway doesn't have a direct webhook API like GitHub, so this script
 * provides instructions and utilities for manual setup.
 * 
 * Usage: node scripts/setup-railway-webhooks.js
 */

const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(query) {
  return new Promise(resolve => rl.question(query, resolve));
}

async function main() {
  console.log('\n🚂 Railway Webhook Setup for Heimdall\n');
  console.log('Railway currently requires manual webhook configuration through their dashboard.');
  console.log('This script will guide you through the setup process.\n');

  // Get configuration
  const projectName = await question('Enter your Railway project name: ');
  const serviceName = await question('Enter your Railway service name (e.g., heimdall-backend): ');
  const webhookUrl = await question('Enter your webhook URL (e.g., https://your-app.vercel.app/api/webhook): ');
  
  console.log('\n📋 Railway Webhook Configuration Instructions:\n');
  
  console.log('1. Go to your Railway dashboard:');
  console.log(`   https://railway.app/project/${projectName || 'your-project'}\n`);
  
  console.log('2. Navigate to your service settings:');
  console.log(`   → Select "${serviceName || 'your-service'}" service`);
  console.log('   → Go to "Settings" tab\n');
  
  console.log('3. Configure Webhooks:');
  console.log('   → Scroll to "Webhooks" section');
  console.log('   → Click "Add Webhook"');
  console.log(`   → Enter URL: ${webhookUrl}`);
  console.log('   → Select events:');
  console.log('     ✓ deployment.created');
  console.log('     ✓ deployment.completed');
  console.log('     ✓ deployment.failed');
  console.log('     ✓ service.updated\n');
  
  console.log('4. Test Configuration:');
  console.log('   → Deploy your service to trigger a webhook');
  console.log('   → Check Heimdall dashboard for Railway events\n');
  
  console.log('5. Environment Variables (if needed):');
  console.log('   Set these in your Railway service:');
  console.log('   → WEBHOOK_URL=' + webhookUrl);
  console.log('   → HEIMDALL_WEBHOOK_SECRET=your-secret-key\n');

  // Generate sample Railway webhook payload for testing
  const samplePayload = {
    event: 'deployment.completed',
    data: {
      deployment: {
        id: 'dep_123456789',
        status: 'SUCCESS',
        createdAt: new Date().toISOString(),
        url: `https://${serviceName}-production.up.railway.app`,
        meta: {
          branch: 'main',
          commitSha: '7f343de0a1b2c3d4e5f6789012345678901234ab',
          commitMessage: 'Update backend service configuration'
        }
      },
      service: {
        id: 'svc_987654321',
        name: serviceName,
        url: `https://${serviceName}-production.up.railway.app`
      },
      project: {
        id: 'prj_123456789',
        name: projectName
      },
      environment: {
        name: 'production'
      }
    }
  };

  // Write sample payload for testing
  const fs = require('fs');
  const testPayloadPath = './scripts/railway-test-payload.json';
  
  fs.writeFileSync(testPayloadPath, JSON.stringify(samplePayload, null, 2));
  console.log(`📝 Sample Railway webhook payload saved to: ${testPayloadPath}`);
  console.log('   Use this for testing your webhook endpoint\n');

  // Generate test script
  const testScript = `#!/usr/bin/env node

// Test Railway webhook payload
const payload = ${JSON.stringify(samplePayload, null, 2)};

console.log('Testing Railway webhook...');
console.log('Payload:', JSON.stringify(payload, null, 2));

// Send test webhook
fetch('${webhookUrl}', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-Railway-Event': payload.event,
    'X-Railway-Project': payload.data.project.id,
    'X-Railway-Service': payload.data.service.id
  },
  body: JSON.stringify(payload)
})
.then(response => response.json())
.then(data => {
  console.log('✅ Webhook test successful:', data);
})
.catch(error => {
  console.error('❌ Webhook test failed:', error);
});
`;

  fs.writeFileSync('./scripts/test-railway-webhook.js', testScript);
  console.log('🧪 Test script created: ./scripts/test-railway-webhook.js');
  console.log('   Run: node scripts/test-railway-webhook.js\n');

  console.log('🎉 Setup guide complete!');
  console.log('After configuring webhooks in Railway, your deployment events will appear in Heimdall.\n');

  rl.close();
}

main().catch(console.error);