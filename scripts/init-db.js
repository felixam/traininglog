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
