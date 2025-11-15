// Script to purge all exercise logs from the database
const { Pool } = require('pg');

async function purgeLogs() {
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

    // Count existing logs
    const countResult = await pool.query('SELECT COUNT(*) FROM exercise_logs');
    const totalLogs = parseInt(countResult.rows[0].count);

    console.log(`📊 Found ${totalLogs} exercise logs in database`);

    if (totalLogs === 0) {
      console.log('✅ No logs to purge. Database is already clean.');
      return;
    }

    // Delete all logs
    console.log('🗑️  Purging all exercise logs...');
    const result = await pool.query('DELETE FROM exercise_logs');

    console.log(`✅ Successfully purged ${result.rowCount} exercise logs!`);
    console.log('🎉 Database is now clean.');

  } catch (error) {
    console.error('❌ Error purging logs:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

purgeLogs();
