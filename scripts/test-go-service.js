#!/usr/bin/env node

/**
 * Test script to verify Go service webhook endpoint directly
 */

const https = require('https');

const GO_SERVICE_URL = process.env.GO_SERVICE_URL || 'https://heimdall-backend-prod.up.railway.app';

// Sample QStash payload as sent by our Vercel webhook
const testPayload = {
  type: 'github.push',
  event: {
    ref: 'refs/heads/main',
    before: '0000000000000000000000000000000000000000',
    after: '1234567890abcdef1234567890abcdef12345678',
    repository: {
      id: 123456789,
      name: 'test-go-service',
      full_name: 'roeintheglasses/test-go-service',
      html_url: 'https://github.com/roeintheglasses/test-go-service',
    },
    commits: [
      {
        id: '1234567890abcdef1234567890abcdef12345678',
        message: 'Test Go service direct webhook',
        timestamp: new Date().toISOString(),
        author: {
          name: 'Test User',
          email: 'test@example.com',
        },
      },
    ],
    head_commit: {
      id: '1234567890abcdef1234567890abcdef12345678',
      message: 'Test Go service direct webhook',
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
  },
};

async function testGoService() {
  console.log('🧪 Testing Go service webhook endpoint directly...');
  console.log('📡 URL:', `${GO_SERVICE_URL}/api/webhook`);

  const payloadString = JSON.stringify(testPayload);

  return new Promise((resolve, reject) => {
    const url = new URL(`${GO_SERVICE_URL}/api/webhook`);
    const options = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payloadString),
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
          console.log('✅ Go service webhook test successful!');
          resolve({ status: res.statusCode, body });
        } else {
          console.log('❌ Go service webhook test failed!');
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

// Test the events endpoint too
async function testEventsEndpoint() {
  console.log('\n🔍 Testing events endpoint...');

  return new Promise((resolve, reject) => {
    const url = new URL(`${GO_SERVICE_URL}/api/events`);
    const options = {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    };

    const req = https.request(url, options, (res) => {
      let body = '';
      res.on('data', (chunk) => (body += chunk));
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          const events = JSON.parse(body);
          console.log('✅ Events endpoint working!');
          console.log(`📊 Found ${events.length} events in database`);
          console.log('📋 Latest events:');
          events.slice(0, 3).forEach((event) => {
            console.log(`  - ${event.title} (${event.created_at})`);
          });
          resolve(events);
        } else {
          console.log('❌ Events endpoint failed!');
          reject(new Error(`HTTP ${res.statusCode}: ${body}`));
        }
      });
    });

    req.on('error', (err) => {
      console.error('❌ Request error:', err);
      reject(err);
    });

    req.end();
  });
}

// Main execution
async function main() {
  try {
    // Test events endpoint first
    await testEventsEndpoint();

    // Test webhook endpoint
    await testGoService();

    // Check events again to see if new event was added
    console.log('\n🔄 Checking for new events...');
    await testEventsEndpoint();

    console.log('\n🎉 Go service is working correctly!');
  } catch (error) {
    console.error('\n💥 Go service test failed:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}
