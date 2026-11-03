#!/usr/bin/env node

/**
 * Test script to verify webhook endpoint is working.
 * Sends a signed GitHub push. Requires WEBHOOK_SECRET (and optionally WEBHOOK_URL).
 * Loads .env if dotenv is available.
 */
try {
  require('dotenv').config();
} catch {
  // dotenv not available, rely on the shell environment
}

const http = require('http');
const https = require('https');
const crypto = require('crypto');

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
  const secret = process.env.WEBHOOK_SECRET;
  if (!secret) {
    throw new Error('WEBHOOK_SECRET is required (same value as on the Vercel deployment)');
  }

  console.log('🧪 Testing webhook endpoint...');
  console.log('📡 URL:', WEBHOOK_URL);

  const payloadString = JSON.stringify(testPayload);

  const signature =
    'sha256=' + crypto.createHmac('sha256', secret).update(payloadString).digest('hex');

  return new Promise((resolve, reject) => {
    const url = new URL(WEBHOOK_URL);
    const options = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payloadString),
        'X-GitHub-Event': 'push',
        'X-GitHub-Delivery': crypto.randomUUID(),
        'X-Hub-Signature-256': signature,
        'User-Agent': 'GitHub-Hookshot/webhook-test',
      },
    };

    const req = (url.protocol === 'http:' ? http : https).request(url, options, (res) => {
      let body = '';
      res.on('data', (chunk) => (body += chunk));
      res.on('end', () => {
        console.log('📊 Response:', {
          status: res.statusCode,
          statusMessage: res.statusMessage,
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
