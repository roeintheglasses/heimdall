#!/usr/bin/env node

/**
 * Test script to verify webhook endpoint is working
 */

const https = require('https');

const WEBHOOK_URL = process.env.WEBHOOK_URL || 'https://heimdall-ashen.vercel.app/api/webhook';

// Sample GitHub push payload
const testPayload = {
  ref: 'refs/heads/main',
  before: '0000000000000000000000000000000000000000',
  after: '1234567890abcdef1234567890abcdef12345678',
  repository: {
    id: 123456789,
    name: 'test-repo',
    full_name: 'roeintheglasses/test-repo',
    html_url: 'https://github.com/roeintheglasses/test-repo',
  },
  commits: [
    {
      id: '1234567890abcdef1234567890abcdef12345678',
      message: 'Test webhook commit',
      timestamp: new Date().toISOString(),
      author: {
        name: 'Test User',
        email: 'test@example.com',
      },
    },
  ],
  head_commit: {
    id: '1234567890abcdef1234567890abcdef12345678',
    message: 'Test webhook commit',
    timestamp: new Date().toISOString(),
    author: {
      name: 'Test User',
      email: 'test@example.com',
    },
  },
  pusher: {
    name: 'Test User',
    email: 'test@example.com',
  },
};

async function testWebhook() {
  console.log('🧪 Testing webhook endpoint...');
  console.log('📡 URL:', WEBHOOK_URL);

  const payloadString = JSON.stringify(testPayload);

  return new Promise((resolve, reject) => {
    const url = new URL(WEBHOOK_URL);
    const options = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payloadString),
        'X-GitHub-Event': 'push',
        'User-Agent': 'GitHub-Hookshot/webhook-test',
      },
    };

    const req = https.request(url, options, (res) => {
      let body = '';
      res.on('data', (chunk) => (body += chunk));
      res.on('end', () => {
        console.log('📊 Response:', {
          status: res.statusCode,
          statusMessage: res.statusMessage,
          headers: res.headers,
          body: body,
        });

        if (res.statusCode >= 200 && res.statusCode < 300) {
          console.log('✅ Webhook test successful!');
          resolve({ status: res.statusCode, body });
        } else {
          console.log('❌ Webhook test failed!');
          reject(new Error(`HTTP ${res.statusCode}: ${body}`));
        }
      });
    });

    req.on('error', (err) => {
      console.error('❌ Request error:', err);
      reject(err);
    });

    req.write(payloadString);
    req.end();
  });
}

// Main execution
async function main() {
  try {
    await testWebhook();
    console.log('\n🎉 Webhook endpoint is working correctly!');
  } catch (error) {
    console.error('\n💥 Webhook test failed:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}
