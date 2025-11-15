import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

// POST create or update goal log (with optional exercise tracking)
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { goal_id, date, exercise_id, weight, reps } = body;

    if (!goal_id || !date) {
      return NextResponse.json(
        { error: 'goal_id and date are required' },
        { status: 400 }
      );
    }

    // Start a transaction
    await query('BEGIN');

    try {
      // Check if goal log exists
      const existingGoalLog = await query(
        'SELECT * FROM goal_logs WHERE goal_id = $1 AND date = $2',
        [goal_id, date]
      );

      // Upsert goal log
      let goalLogResult;
      if (existingGoalLog.rows.length > 0) {
        // Update existing goal log
        goalLogResult = await query(
          `UPDATE goal_logs
           SET completed = true,
               exercise_id = $3,
               updated_at = CURRENT_TIMESTAMP
           WHERE goal_id = $1 AND date = $2
           RETURNING *`,
          [goal_id, date, exercise_id || null]
        );
      } else {
        // Create new goal log
        goalLogResult = await query(
          `INSERT INTO goal_logs (goal_id, date, completed, exercise_id)
           VALUES ($1, $2, true, $3)
           RETURNING *`,
          [goal_id, date, exercise_id || null]
        );
      }

      // If exercise_id is provided, also create/update exercise log
      if (exercise_id) {
        const existingExerciseLog = await query(
          'SELECT * FROM exercise_logs WHERE exercise_id = $1 AND date = $2',
          [exercise_id, date]
        );

        if (existingExerciseLog.rows.length > 0) {
          // Update existing exercise log
          await query(
            `UPDATE exercise_logs
             SET weight = $3,
                 reps = $4,
                 updated_at = CURRENT_TIMESTAMP
             WHERE exercise_id = $1 AND date = $2`,
            [exercise_id, date, weight || null, reps || null]
          );
        } else {
          // Create new exercise log
          await query(
            `INSERT INTO exercise_logs (exercise_id, date, weight, reps)
             VALUES ($1, $2, $3, $4)`,
            [exercise_id, date, weight || null, reps || null]
          );
        }
      }

      await query('COMMIT');
      return NextResponse.json(goalLogResult.rows[0]);
    } catch (error) {
      await query('ROLLBACK');
      throw error;
    }
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

    // Start a transaction
    await query('BEGIN');

    try {
      // Get the goal log to check if it has an associated exercise
      const goalLog = await query(
        'SELECT exercise_id FROM goal_logs WHERE goal_id = $1 AND date = $2',
        [goal_id, date]
      );

      if (goalLog.rows.length > 0 && goalLog.rows[0].exercise_id) {
        // Delete associated exercise log
        await query(
          'DELETE FROM exercise_logs WHERE exercise_id = $1 AND date = $2',
          [goalLog.rows[0].exercise_id, date]
        );
      }

      // Delete goal log (this is the main deletion)
      await query(
        'DELETE FROM goal_logs WHERE goal_id = $1 AND date = $2',
        [goal_id, date]
      );

      await query('COMMIT');
      return NextResponse.json({ deleted: true });
    } catch (error) {
      await query('ROLLBACK');
      throw error;
    }
  } catch (error) {
    console.error('Error deleting goal log:', error);
    return NextResponse.json(
      { error: 'Failed to delete goal log' },
      { status: 500 }
    );
  }
}
