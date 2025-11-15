import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

// GET exercises linked to a goal
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const result = await query(
      `SELECT e.*
       FROM exercises e
       INNER JOIN goal_exercises ge ON e.id = ge.exercise_id
       WHERE ge.goal_id = $1
       ORDER BY e.name ASC`,
      [id]
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

    // Check if goal exists
    const goalCheck = await query('SELECT id FROM goals WHERE id = $1', [id]);
    if (goalCheck.rows.length === 0) {
      return NextResponse.json(
        { error: 'Goal not found' },
        { status: 404 }
      );
    }

    // Check if exercise exists
    const exerciseCheck = await query('SELECT id FROM exercises WHERE id = $1', [exercise_id]);
    if (exerciseCheck.rows.length === 0) {
      return NextResponse.json(
        { error: 'Exercise not found' },
        { status: 404 }
      );
    }

    // Link exercise to goal (UNIQUE constraint will prevent duplicates)
    const result = await query(
      'INSERT INTO goal_exercises (goal_id, exercise_id) VALUES ($1, $2) RETURNING *',
      [id, exercise_id]
    );

    return NextResponse.json(result.rows[0], { status: 201 });
  } catch (error: unknown) {
    // Check for unique constraint violation (duplicate link)
    if (error && typeof error === 'object' && 'code' in error && error.code === '23505') {
      return NextResponse.json(
        { error: 'Exercise already linked to this goal' },
        { status: 409 }
      );
    }
    console.error('Error linking exercise to goal:', error);
    return NextResponse.json(
      { error: 'Failed to link exercise to goal' },
      { status: 500 }
    );
  }
}
