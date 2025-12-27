#!/usr/bin/env node

/**
 * Local migration script to test database changes
 * This connects to the Railway PostgreSQL database and runs the migration
 */

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Database connection string (this should match your Railway database)
const DATABASE_URL =
  process.env.DATABASE_URL || 'postgresql://postgres:your-password@hostname:port/database';

async function runMigration() {
  console.log('🔄 Starting database migration...');

  // Create database connection
  const pool = new Pool({
    connectionString: DATABASE_URL,
    ssl: {
      rejectUnauthorized: false, // Required for Railway/Neon connections
    },
  });

  try {
    // Test connection
    const client = await pool.connect();
    console.log('✅ Connected to database successfully');

    // Read migration file
    const migrationPath = path.join(__dirname, '..', 'migrations', '001_add_categories.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

    console.log('📄 Executing migration...');

    // Execute migration
    await client.query(migrationSQL);

    console.log('✅ Migration executed successfully!');

    // Verify categories were created
    const categoriesResult = await client.query(
      'SELECT id, name FROM event_categories ORDER BY priority'
    );

    console.log('\n📊 Categories created:');
    categoriesResult.rows.forEach((row) => {
      console.log(`  • ${row.id}: ${row.name}`);
    });

    // Show event distribution
    const statsResult = await client.query(
      'SELECT category, COUNT(*) as count FROM events GROUP BY category ORDER BY count DESC'
    );

    console.log('\n📈 Event distribution by category:');
    statsResult.rows.forEach((row) => {
      console.log(`  • ${row.category}: ${row.count} events`);
    });

    client.release();
    console.log('\n🎉 Migration completed successfully!');
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    throw error;
  } finally {
    await pool.end();
  }
}

if (require.main === module) {
  runMigration().catch((error) => {
    console.error('💥 Fatal error:', error);
    process.exit(1);
  });
}

module.exports = { runMigration };
