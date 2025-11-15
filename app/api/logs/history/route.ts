import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

// GET history for an exercise (max weight and last log)
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const exerciseId = searchParams.get('exercise_id');

    if (!exerciseId) {
      return NextResponse.json(
        { error: 'exercise_id is required' },
        { status: 400 }
      );
    }

    // Fetch log with highest weight for this exercise
    const maxWeightResult = await query(
      `SELECT weight, reps, date
       FROM exercise_logs
       WHERE exercise_id = $1 AND weight IS NOT NULL
       ORDER BY weight DESC, date DESC
       LIMIT 1`,
      [exerciseId]
    );

    // Fetch most recent log for this exercise
    const lastLogResult = await query(
      `SELECT weight, reps, date
       FROM exercise_logs
       WHERE exercise_id = $1
       ORDER BY date DESC
       LIMIT 1`,
      [exerciseId]
    );

    return NextResponse.json({
      maxWeight: maxWeightResult.rows[0] || null,
      lastLog: lastLogResult.rows[0] || null,
    });
  } catch (error) {
    console.error('Error fetching exercise history:', error);
    return NextResponse.json(
      { error: 'Failed to fetch exercise history' },
      { status: 500 }
    );
  }
}
