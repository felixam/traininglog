import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

// POST toggle exercise completion for a specific date
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { exercise_id, date } = body;

    if (!exercise_id || !date) {
      return NextResponse.json(
        { error: 'exercise_id and date are required' },
        { status: 400 }
      );
    }

    // Check if log exists
    const existingLog = await query(
      'SELECT * FROM exercise_logs WHERE exercise_id = $1 AND date = $2',
      [exercise_id, date]
    );

    let result;

    if (existingLog.rows.length > 0) {
      // If log exists and is completed, delete it (deactivate = remove entry)
      // If log exists and is not completed, set it to true
      const currentCompleted = existingLog.rows[0].completed;

      if (currentCompleted) {
        // Delete the entry instead of setting to false
        await query(
          'DELETE FROM exercise_logs WHERE exercise_id = $1 AND date = $2',
          [exercise_id, date]
        );
        return NextResponse.json({ deleted: true });
      } else {
        // If somehow a false entry exists, set it to true
        result = await query(
          `UPDATE exercise_logs
           SET completed = true, updated_at = CURRENT_TIMESTAMP
           WHERE exercise_id = $1 AND date = $2
           RETURNING *`,
          [exercise_id, date]
        );
      }
    } else {
      // Create new log with completed = true
      result = await query(
        `INSERT INTO exercise_logs (exercise_id, date, completed)
         VALUES ($1, $2, $3)
         RETURNING *`,
        [exercise_id, date, true]
      );
    }

    return NextResponse.json(result.rows[0]);
  } catch (error) {
    console.error('Error toggling exercise log:', error);
    return NextResponse.json(
      { error: 'Failed to toggle exercise log' },
      { status: 500 }
    );
  }
}
