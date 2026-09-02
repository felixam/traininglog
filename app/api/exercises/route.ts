import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getCurrentUser, unauthorized } from '@/lib/auth';

// GET all exercises
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return unauthorized();

  try {
    const result = await query(
      'SELECT * FROM exercises WHERE user_id = $1 ORDER BY name ASC',
      [user.userId]
    );

    return NextResponse.json(result.rows);
  } catch (error) {
    console.error('Error fetching exercises:', error);
    return NextResponse.json(
      { error: 'Failed to fetch exercises' },
      { status: 500 }
    );
  }
}

// POST new exercise
export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return unauthorized();

  try {
    const body = await request.json();
    const { name } = body;

    if (!name) {
      return NextResponse.json(
        { error: 'Name is required' },
        { status: 400 }
      );
    }

    const result = await query(
      'INSERT INTO exercises (user_id, name) VALUES ($1, $2) RETURNING *',
      [user.userId, name]
    );

    return NextResponse.json(result.rows[0], { status: 201 });
  } catch (error) {
    console.error('Error creating exercise:', error);
    return NextResponse.json(
      { error: 'Failed to create exercise' },
      { status: 500 }
    );
  }
}
