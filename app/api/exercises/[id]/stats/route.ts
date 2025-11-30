import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const exerciseId = parseInt(id);

    if (isNaN(exerciseId)) {
      return NextResponse.json({ error: 'Invalid exercise ID' }, { status: 400 });
    }

    // Fetch all logs for this exercise, ordered by date
    const result = await query(
      `SELECT date, weight, reps
       FROM exercise_logs
       WHERE exercise_id = $1 AND weight IS NOT NULL
       ORDER BY date ASC`,
      [exerciseId]
    );

    return NextResponse.json({
      logs: result.rows,
    });
  } catch (error) {
    console.error('Error fetching exercise stats:', error);
    return NextResponse.json(
      { error: 'Failed to fetch exercise stats' },
      { status: 500 }
    );
  }
}
