#!/usr/bin/env node

/**
 * Railway Webhook Test Script
 *
 * This script sends a test Railway webhook payload to your Heimdall webhook endpoint
 * to verify that Railway deployment events are properly processed and displayed.
 *
 * Usage: node scripts/test-railway-webhook.js
 */

const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function question(query) {
  return new Promise((resolve) => rl.question(query, resolve));
}

async function main() {
  console.log('\n🚂 Testing Railway Webhook Integration\n');

  // Get webhook URL from user
  const webhookUrl =
    (await question('Enter your webhook URL (default: http://localhost:3000/api/webhook): ')) ||
    'http://localhost:3000/api/webhook';

  console.log(`\nTesting webhook: ${webhookUrl}\n`);

  // Test Railway deployment webhook payload
  const railwayPayload = {
    event: 'deployment.completed',
    data: {
      deployment: {
        id: 'dep_123456789',
        status: 'DEPLOYED',
        createdAt: new Date().toISOString(),
        url: 'https://heimdall-backend-production.up.railway.app',
        meta: {
          branch: 'main',
          commitSha: '7f343de0a1b2c3d4e5f6789012345678901234ab',
          commitMessage:
            'Add Railway webhook support to Heimdall\n\nThis deployment includes:\n- Railway event processing in Go backend\n- Enhanced Railway event display components\n- Webhook configuration scripts',
          author: 'Roe Choi',
        },
      },
      service: {
        id: 'svc_987654321',
        name: 'heimdall-backend',
        url: 'https://heimdall-backend-production.up.railway.app',
      },
      project: {
        id: 'prj_123456789',
        name: 'heimdall',
      },
      environment: {
        name: 'production',
      },
    },
  };

  console.log('📤 Sending Railway webhook payload...');
  console.log('Payload:', JSON.stringify(railwayPayload, null, 2));

  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Railway-Event': 'deployment.completed',
        'X-Railway-Project': railwayPayload.data.project.id,
        'X-Railway-Service': railwayPayload.data.service.id,
        'User-Agent': 'Railway-Webhook/1.0',
      },
      body: JSON.stringify(railwayPayload),
    });

    console.log(`\n📨 Response: ${response.status} ${response.statusText}`);

    if (response.ok) {
      const responseData = await response.text();
      console.log('✅ Railway webhook test successful!');
      console.log('Response:', responseData);
      console.log('\n🎯 Check your Heimdall dashboard to see the Railway deployment event.');
      console.log('Expected display:');
      console.log('- Service: heimdall-backend');
      console.log('- Status: SUCCESS (green badge)');
      console.log('- Environment: production');
      console.log('- Branch: main');
      console.log('- Commit: 7f343de0');
      console.log('- Author: Roe Choi');
      console.log('- Deployment URL with clickable link');
    } else {
      const errorText = await response.text();
      console.error('❌ Railway webhook test failed');
      console.error('Error:', errorText);

      // Provide troubleshooting tips
      console.log('\n🔧 Troubleshooting:');
      console.log('1. Make sure your Heimdall app is running (npm run dev)');
      console.log('2. Check that the webhook URL is correct');
      console.log('3. Verify the Railway webhook headers are accepted');
      console.log('4. Check the backend Go service is running and accessible');
      console.log('5. Look at the application logs for detailed error information');
    }
  } catch (error) {
    console.error('❌ Network error sending Railway webhook:', error.message);
    console.log('\n🔧 Troubleshooting:');
    console.log('1. Check if the webhook URL is accessible');
    console.log('2. Verify network connectivity');
    console.log('3. Make sure your Heimdall application is running');
  }

  // Test additional Railway event types
  const testAdditionalEvents = await question('\nTest additional Railway event types? (y/N): ');

  if (testAdditionalEvents.toLowerCase() === 'y') {
    console.log('\n🧪 Testing deployment.failed event...');

    const failedPayload = {
      ...railwayPayload,
      event: 'deployment.failed',
      data: {
        ...railwayPayload.data,
        deployment: {
          ...railwayPayload.data.deployment,
          status: 'DEPLOY_FAILED',
          meta: {
            ...railwayPayload.data.deployment.meta,
            commitMessage: 'Fix Railway deployment configuration',
            error: 'Build failed: missing environment variable',
          },
        },
      },
    };

    try {
      const failedResponse = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Railway-Event': 'deployment.failed',
          'X-Railway-Project': failedPayload.data.project.id,
          'X-Railway-Service': failedPayload.data.service.id,
        },
        body: JSON.stringify(failedPayload),
      });

      if (failedResponse.ok) {
        console.log('✅ Failed deployment webhook test successful!');
        console.log('Check dashboard for failed deployment (red status badge)');
      } else {
        console.log('❌ Failed deployment webhook test failed');
      }
    } catch (error) {
      console.log('❌ Error testing failed deployment webhook:', error.message);
    }
  }

  console.log('\n🎉 Railway webhook testing complete!');
  console.log('If tests passed, your Railway webhooks should work correctly.');
  console.log('\nNext steps:');
  console.log('1. Configure actual Railway webhooks in your Railway project dashboard');
  console.log('2. Deploy your Railway service to trigger real webhook events');
  console.log('3. Monitor your Heimdall dashboard for Railway deployment notifications');

  rl.close();
}

// Handle fetch polyfill for older Node.js versions
if (typeof fetch === 'undefined') {
  console.log('Installing fetch polyfill...');
  const { default: fetch } = await import('node-fetch');
  global.fetch = fetch;
}

main().catch(console.error);
