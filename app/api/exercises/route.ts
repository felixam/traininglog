import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

// GET all exercises
export async function GET() {
  try {
    const result = await query(
      'SELECT * FROM exercises ORDER BY display_order ASC'
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
  try {
    const body = await request.json();
    const { name, color = 'red' } = body;

    if (!name) {
      return NextResponse.json(
        { error: 'Name is required' },
        { status: 400 }
      );
    }

    // Get the next display_order
    const maxOrderResult = await query(
      'SELECT COALESCE(MAX(display_order), 0) + 1 as next_order FROM exercises'
    );
    const nextOrder = maxOrderResult.rows[0].next_order;

    const result = await query(
      'INSERT INTO exercises (name, color, display_order) VALUES ($1, $2, $3) RETURNING *',
      [name, color, nextOrder]
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
