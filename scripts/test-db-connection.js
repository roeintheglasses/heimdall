#!/usr/bin/env node

/**
 * Test database connection and run migration
 * This script will attempt to connect to the database used by your Go service
 */

const https = require('https');

async function testGoServiceConnection() {
  console.log('🔍 Testing Go service database connection...');
  
  try {
    // Test if Go service can access the database
    const response = await fetch('https://heimdall-backend-prod.up.railway.app/api/events');
    
    if (response.ok) {
      const events = await response.json();
      console.log(`✅ Go service is working - found ${events.length} events`);
      
      // Check current event structure
      if (events.length > 0) {
        const sampleEvent = events[0];
        console.log('\n📊 Current event structure:');
        console.log('Keys:', Object.keys(sampleEvent));
        
        if (sampleEvent.category) {
          console.log('✅ Category field already exists!');
        } else {
          console.log('⚠️  Category field missing - migration needed');
        }
      }
      
      return true;
    } else {
      console.log('❌ Go service not responding properly');
      return false;
    }
  } catch (error) {
    console.error('❌ Failed to test Go service:', error.message);
    return false;
  }
}

async function testMigrationEndpoint() {
  console.log('\n🔄 Testing if we can trigger migration via Go service...');
  
  // We'll need to add a migration endpoint to the Go service
  // For now, let's see what endpoints are available
  try {
    const response = await fetch('https://heimdall-backend-prod.up.railway.app/api/health');
    console.log('Health check response:', response.status);
  } catch (error) {
    console.log('No health endpoint available');
  }
}

async function main() {
  console.log('🧪 Database Migration Test\n');
  
  const goServiceWorking = await testGoServiceConnection();
  
  if (goServiceWorking) {
    await testMigrationEndpoint();
    
    console.log('\n📝 Next steps:');
    console.log('1. Add migration endpoint to Go service');
    console.log('2. Deploy Go service with migration capability');
    console.log('3. Trigger migration via API call');
  } else {
    console.log('\n❌ Cannot proceed - Go service not accessible');
  }
}

if (require.main === module) {
  main().catch(console.error);
}