import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

// POST create or update exercise log with weight and reps
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { exercise_id, date, weight, reps } = body;

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
      // Update existing log with new weight/reps values
      result = await query(
        `UPDATE exercise_logs
         SET completed = true,
             weight = $3,
             reps = $4,
             updated_at = CURRENT_TIMESTAMP
         WHERE exercise_id = $1 AND date = $2
         RETURNING *`,
        [exercise_id, date, weight || null, reps || null]
      );
    } else {
      // Create new log with weight and reps
      result = await query(
        `INSERT INTO exercise_logs (exercise_id, date, completed, weight, reps)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING *`,
        [exercise_id, date, true, weight || null, reps || null]
      );
    }

    return NextResponse.json(result.rows[0]);
  } catch (error) {
    console.error('Error saving exercise log:', error);
    return NextResponse.json(
      { error: 'Failed to save exercise log' },
      { status: 500 }
    );
  }
}

// DELETE remove exercise log (uncheck)
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const exercise_id = searchParams.get('exercise_id');
    const date = searchParams.get('date');

    if (!exercise_id || !date) {
      return NextResponse.json(
        { error: 'exercise_id and date are required' },
        { status: 400 }
      );
    }

    await query(
      'DELETE FROM exercise_logs WHERE exercise_id = $1 AND date = $2',
      [exercise_id, date]
    );

    return NextResponse.json({ deleted: true });
  } catch (error) {
    console.error('Error deleting exercise log:', error);
    return NextResponse.json(
      { error: 'Failed to delete exercise log' },
      { status: 500 }
    );
  }
}
