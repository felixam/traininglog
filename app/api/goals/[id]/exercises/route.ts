import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getCurrentUser, unauthorized } from '@/lib/auth';

// GET exercises linked to a goal
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) return unauthorized();

  try {
    const { id } = await params;

    const result = await query(
      `SELECT e.*
       FROM exercises e
       INNER JOIN goal_exercises ge ON e.id = ge.exercise_id
       WHERE ge.goal_id = $1 AND ge.user_id = $2
       ORDER BY e.name ASC`,
      [id, user.userId]
    );

    return NextResponse.json(result.rows);
  } catch (error) {
    console.error('Error fetching linked exercises:', error);
    return NextResponse.json(
      { error: 'Failed to fetch linked exercises' },
      { status: 500 }
    );
  }
}

// POST link an exercise to a goal
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) return unauthorized();

  try {
    const { id } = await params;
    const body = await request.json();
    const { exercise_id } = body;

    if (!exercise_id) {
      return NextResponse.json(
        { error: 'exercise_id is required' },
        { status: 400 }
      );
    }

    const goalCheck = await query('SELECT id FROM goals WHERE id = $1 AND user_id = $2', [id, user.userId]);
    if (goalCheck.rows.length === 0) {
      return NextResponse.json({ error: 'Goal not found' }, { status: 404 });
    }

    const exerciseCheck = await query('SELECT id FROM exercises WHERE id = $1 AND user_id = $2', [exercise_id, user.userId]);
    if (exerciseCheck.rows.length === 0) {
      return NextResponse.json({ error: 'Exercise not found' }, { status: 404 });
    }

    // ON CONFLICT DO NOTHING ... RETURNING returns no row when the link already exists.
    const result = await query(
      `INSERT INTO goal_exercises (user_id, goal_id, exercise_id)
       VALUES ($1, $2, $3)
       ON CONFLICT(goal_id, exercise_id) DO NOTHING
       RETURNING *`,
      [user.userId, id, exercise_id]
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: 'Exercise already linked to this goal' },
        { status: 409 }
      );
    }

    return NextResponse.json(result.rows[0], { status: 201 });
  } catch (error) {
    console.error('Error linking exercise to goal:', error);
    return NextResponse.json(
      { error: 'Failed to link exercise to goal' },
      { status: 500 }
    );
  }
}
