import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

// GET all goals
export async function GET() {
  try {
    const result = await query(
      'SELECT * FROM goals ORDER BY display_order ASC'
    );

    return NextResponse.json(result.rows);
  } catch (error) {
    console.error('Error fetching goals:', error);
    return NextResponse.json(
      { error: 'Failed to fetch goals' },
      { status: 500 }
    );
  }
}

// POST new goal
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
      'SELECT COALESCE(MAX(display_order), 0) + 1 as next_order FROM goals'
    );
    const nextOrder = maxOrderResult.rows[0].next_order;

    const result = await query(
      'INSERT INTO goals (name, color, display_order) VALUES ($1, $2, $3) RETURNING *',
      [name, color, nextOrder]
    );

    return NextResponse.json(result.rows[0], { status: 201 });
  } catch (error) {
    console.error('Error creating goal:', error);
    return NextResponse.json(
      { error: 'Failed to create goal' },
      { status: 500 }
    );
  }
}
