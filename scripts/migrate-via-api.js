#!/usr/bin/env node

/**
 * Database migration via API calls
 * Since we can't directly access the Go service database, we'll create a migration
 * endpoint and trigger it remotely
 */

const https = require('https');

const MIGRATION_SQL = `
-- Add category column to existing events table
ALTER TABLE events ADD COLUMN IF NOT EXISTS category VARCHAR(50) DEFAULT 'development';
ALTER TABLE events ADD COLUMN IF NOT EXISTS subcategory VARCHAR(50) DEFAULT NULL;

-- Create categories lookup table
CREATE TABLE IF NOT EXISTS event_categories (
  id VARCHAR(50) PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  icon VARCHAR(50),
  color VARCHAR(50),
  priority INTEGER DEFAULT 3,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert default categories
INSERT INTO event_categories (id, name, description, icon, color, priority) VALUES
('development', 'Development', 'Code commits, pushes, and repository changes', 'GitBranch', 'blue', 1),
('deployments', 'Deployments', 'Application deployments and builds', 'Rocket', 'green', 2),
('infrastructure', 'Infrastructure', 'Server and system monitoring', 'Server', 'purple', 3),
('issues', 'Issues & Bugs', 'Error notifications and system issues', 'AlertCircle', 'red', 4),
('security', 'Security', 'Security alerts and vulnerability reports', 'Shield', 'orange', 5)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  icon = EXCLUDED.icon,
  color = EXCLUDED.color,
  priority = EXCLUDED.priority;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_events_category ON events(category);
CREATE INDEX IF NOT EXISTS idx_events_category_created_at ON events(category, created_at DESC);

-- Update existing events with categories based on event_type
UPDATE events SET category = 'deployments' WHERE event_type LIKE 'vercel.%';
UPDATE events SET category = 'deployments' WHERE event_type LIKE 'railway.%';
UPDATE events SET category = 'issues' WHERE event_type LIKE 'error.%';
UPDATE events SET category = 'security' WHERE event_type LIKE 'security.%';
UPDATE events SET category = 'development' WHERE event_type LIKE 'github.%';
`;

async function createMigrationEvent() {
  console.log('🔄 Creating migration via webhook event...');
  
  // We'll send a special webhook event that triggers migration
  const migrationPayload = {
    type: 'system.migration',
    event: {
      migration_id: '001_add_categories',
      sql: MIGRATION_SQL,
      description: 'Add event categorization support',
      timestamp: new Date().toISOString()
    }
  };

  return new Promise((resolve, reject) => {
    const payloadString = JSON.stringify(migrationPayload);
    
    const options = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payloadString),
        'X-Migration-Key': 'heimdall-migration-2024' // Security key
      }
    };

    const req = https.request('https://heimdall-backend-prod.up.railway.app/api/migrate', options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        console.log('Migration response:', {
          status: res.statusCode,
          body: body
        });
        
        if (res.statusCode >= 200 && res.statusCode < 300) {
          console.log('✅ Migration triggered successfully!');
          resolve({ status: res.statusCode, body });
        } else {
          console.log('❌ Migration failed!');
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

async function verifyMigration() {
  console.log('\n🔍 Verifying migration results...');
  
  try {
    // Check if events now have category field
    const response = await fetch('https://heimdall-backend-prod.up.railway.app/api/events');
    
    if (response.ok) {
      const events = await response.json();
      
      if (events.length > 0) {
        const sampleEvent = events[0];
        console.log('Event structure after migration:');
        console.log('Keys:', Object.keys(sampleEvent));
        
        if (sampleEvent.category) {
          console.log('✅ Category field added successfully!');
          
          // Count events by category
          const categoryCount = {};
          events.forEach(event => {
            categoryCount[event.category] = (categoryCount[event.category] || 0) + 1;
          });
          
          console.log('\n📊 Event distribution:');
          Object.entries(categoryCount).forEach(([category, count]) => {
            console.log(`  • ${category}: ${count} events`);
          });
          
        } else {
          console.log('❌ Category field still missing');
        }
      }
    }
    
  } catch (error) {
    console.error('Failed to verify migration:', error.message);
  }
}

async function testCategoryEndpoints() {
  console.log('\n🧪 Testing new category endpoints...');
  
  try {
    // Test categories endpoint
    const categoriesResponse = await fetch('https://heimdall-backend-prod.up.railway.app/api/categories');
    
    if (categoriesResponse.ok) {
      const categories = await categoriesResponse.json();
      console.log('✅ Categories endpoint working!');
      console.log(`Found ${categories.length} categories:`, categories.map(c => c.name));
    } else {
      console.log('❌ Categories endpoint not available yet');
    }
    
    // Test filtered events endpoint
    const filteredResponse = await fetch('https://heimdall-backend-prod.up.railway.app/api/events?category=development');
    
    if (filteredResponse.ok) {
      const filteredEvents = await filteredResponse.json();
      console.log(`✅ Filtered events endpoint working! Found ${filteredEvents.length} development events`);
    } else {
      console.log('❌ Filtered events endpoint not available yet');
    }
    
  } catch (error) {
    console.error('Error testing endpoints:', error.message);
  }
}

async function main() {
  console.log('🚀 Database Migration via API\n');
  
  try {
    // For now, let's skip the migration API and proceed with frontend implementation
    // The Go service would need to be updated to support migration endpoints
    
    console.log('⚠️  Migration via API requires Go service updates.');
    console.log('Proceeding with frontend implementation that will work with existing data.\n');
    
    // Verify current state
    await verifyMigration();
    
    console.log('\n📝 Migration Status:');
    console.log('✅ Can proceed with frontend category implementation');
    console.log('✅ Will map existing event_type to categories in frontend');
    console.log('⏳ Backend migration can be done later when Go service is updated');
    
  } catch (error) {
    console.error('💥 Error:', error.message);
  }
}

if (require.main === module) {
  main().catch(console.error);
}