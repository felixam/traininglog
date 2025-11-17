import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET() {
  try {
    // Query all tables
    const [goals, exercises, goalExercises, goalLogs, exerciseLogs] = await Promise.all([
      query('SELECT * FROM goals ORDER BY id'),
      query('SELECT * FROM exercises ORDER BY id'),
      query('SELECT * FROM goal_exercises ORDER BY id'),
      query('SELECT * FROM goal_logs ORDER BY id'),
      query('SELECT * FROM exercise_logs ORDER BY id'),
    ]);

    // Create backup object
    const backup = {
      version: '1.0',
      timestamp: new Date().toISOString(),
      data: {
        goals: goals.rows,
        exercises: exercises.rows,
        goal_exercises: goalExercises.rows,
        goal_logs: goalLogs.rows,
        exercise_logs: exerciseLogs.rows,
      },
    };

    // Generate filename with current date
    const date = new Date().toISOString().split('T')[0];
    const filename = `trainingslog-backup-${date}.json`;

    // Return as downloadable JSON file
    return new NextResponse(JSON.stringify(backup, null, 2), {
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error('Backup error:', error);
    return NextResponse.json(
      { error: 'Failed to create backup' },
      { status: 500 }
    );
  }
}
