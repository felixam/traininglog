import { NextResponse } from 'next/server';
import { batch, query } from '@/lib/db';
import { getCurrentUser, unauthorized } from '@/lib/auth';

// POST create or update goal log (with optional exercise tracking)
export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return unauthorized();

  try {
    const body = await request.json();
    const { goal_id, date, exercise_id, weight, reps } = body;

    if (!goal_id || !date) {
      return NextResponse.json(
        { error: 'goal_id and date are required' },
        { status: 400 }
      );
    }

    // Verify the goal belongs to the current user (goal_id is globally unique).
    const goalCheck = await query(
      'SELECT id FROM goals WHERE id = $1 AND user_id = $2',
      [goal_id, user.userId]
    );
    if (goalCheck.rows.length === 0) {
      return NextResponse.json({ error: 'Goal not found' }, { status: 404 });
    }

    const exId = exercise_id ?? null;

    if (exId !== null) {
      const exerciseCheck = await query(
        'SELECT id FROM exercises WHERE id = $1 AND user_id = $2',
        [exId, user.userId]
      );
      if (exerciseCheck.rows.length === 0) {
        return NextResponse.json({ error: 'Exercise not found' }, { status: 404 });
      }
    }

    // strftime('%f') gives millisecond precision so multiple toggles in the same
    // second keep a stable order (CURRENT_TIMESTAMP is only whole-second).
    const NOW_MS = `strftime('%Y-%m-%d %H:%M:%f', 'now')`;

    const statements = [
      {
        sql: `INSERT INTO goal_logs (user_id, goal_id, date, completed, exercise_id, updated_at)
              VALUES ($1, $2, $3, 1, $4, ${NOW_MS})
              ON CONFLICT(goal_id, date) DO UPDATE
              SET completed = 1,
                  exercise_id = excluded.exercise_id,
                  updated_at = ${NOW_MS}
              RETURNING *`,
        params: [user.userId, goal_id, date, exId],
      },
    ];

    if (exId !== null) {
      statements.push({
        sql: `INSERT INTO exercise_logs (user_id, exercise_id, date, weight, reps, updated_at)
              VALUES ($1, $2, $3, $4, $5, ${NOW_MS})
              ON CONFLICT(exercise_id, date) DO UPDATE
              SET weight = excluded.weight,
                  reps = excluded.reps,
                  updated_at = ${NOW_MS}`,
        params: [user.userId, exId, date, weight ?? null, reps ?? null],
      });
    }

    const results = await batch(statements);
    const goalLog = results[0].rows[0];
    return NextResponse.json({
      ...goalLog,
      completed: Boolean(goalLog?.completed),
    });
  } catch (error) {
    console.error('Error saving goal log:', error);
    return NextResponse.json(
      { error: 'Failed to save goal log' },
      { status: 500 }
    );
  }
}

// DELETE remove goal log (and associated exercise log if exists)
export async function DELETE(request: Request) {
  const user = await getCurrentUser();
  if (!user) return unauthorized();

  try {
    const { searchParams } = new URL(request.url);
    const goal_id = searchParams.get('goal_id');
    const date = searchParams.get('date');

    if (!goal_id || !date) {
      return NextResponse.json(
        { error: 'goal_id and date are required' },
        { status: 400 }
      );
    }

    const existing = await query(
      'SELECT exercise_id FROM goal_logs WHERE goal_id = $1 AND date = $2 AND user_id = $3',
      [goal_id, date, user.userId]
    );

    const linkedExerciseId = existing.rows[0]?.exercise_id ?? null;

    const statements = [];
    if (linkedExerciseId !== null) {
      statements.push({
        sql: 'DELETE FROM exercise_logs WHERE exercise_id = $1 AND date = $2 AND user_id = $3',
        params: [linkedExerciseId, date, user.userId],
      });
    }
    statements.push({
      sql: 'DELETE FROM goal_logs WHERE goal_id = $1 AND date = $2 AND user_id = $3',
      params: [goal_id, date, user.userId],
    });

    await batch(statements);
    return NextResponse.json({ deleted: true });
  } catch (error) {
    console.error('Error deleting goal log:', error);
    return NextResponse.json(
      { error: 'Failed to delete goal log' },
      { status: 500 }
    );
  }
}
