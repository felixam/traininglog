import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getCurrentUser, unauthorized } from '@/lib/auth';

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return unauthorized();

  try {
    // Query the current user's data across all tables
    const [goals, exercises, goalExercises, goalLogs, exerciseLogs] = await Promise.all([
      query('SELECT * FROM goals WHERE user_id = $1 ORDER BY id', [user.userId]),
      query('SELECT * FROM exercises WHERE user_id = $1 ORDER BY id', [user.userId]),
      query('SELECT * FROM goal_exercises WHERE user_id = $1 ORDER BY id', [user.userId]),
      query('SELECT * FROM goal_logs WHERE user_id = $1 ORDER BY id', [user.userId]),
      query('SELECT * FROM exercise_logs WHERE user_id = $1 ORDER BY id', [user.userId]),
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
