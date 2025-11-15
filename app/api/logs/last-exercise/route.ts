import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const goalId = searchParams.get('goal_id');

  if (!goalId) {
    return NextResponse.json({ error: 'goal_id is required' }, { status: 400 });
  }

  try {
    // Get the most recent goal_log entry for this goal that has an exercise_id
    const result = await query(
      `SELECT exercise_id
       FROM goal_logs
       WHERE goal_id = $1 AND exercise_id IS NOT NULL
       ORDER BY date DESC
       LIMIT 1`,
      [goalId]
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ exercise_id: null });
    }

    return NextResponse.json({ exercise_id: result.rows[0].exercise_id });
  } catch (error) {
    console.error('Error fetching last exercise:', error);
    return NextResponse.json({ error: 'Failed to fetch last exercise' }, { status: 500 });
  }
}
