// Script to initialize the database schema
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

async function initDatabase() {
  // Check if DATABASE_URL is set
  if (!process.env.DATABASE_URL) {
    console.error('❌ ERROR: DATABASE_URL environment variable is not set');
    console.error('Please set the DATABASE_URL environment variable');
    process.exit(1);
  }

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    console.log('🔌 Connecting to database...');

    // Read schema.sql
    const schemaPath = path.join(__dirname, '..', 'schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');

    // Execute schema
    console.log('📝 Running schema...');
    await pool.query(schema);

    // Run migrations for existing databases
    console.log('🔄 Running migrations...');

    // Migration: Add weight and reps columns if they don't exist
    try {
      await pool.query(`
        ALTER TABLE exercise_logs
        ADD COLUMN IF NOT EXISTS weight DECIMAL(6, 2),
        ADD COLUMN IF NOT EXISTS reps INTEGER;
      `);
      console.log('✅ Migration: Added weight and reps columns');
    } catch (migrationError) {
      console.log('ℹ️  Migration note:', migrationError.message);
    }

    console.log('✅ Database initialized successfully!');
    console.log('🎉 Your training log is ready to use!');
  } catch (error) {
    console.error('❌ Error initializing database:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

initDatabase();
