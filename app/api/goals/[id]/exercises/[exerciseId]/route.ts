import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

// DELETE unlink an exercise from a goal
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string; exerciseId: string }> }
) {
  try {
    const { id, exerciseId } = await params;

    const result = await query(
      'DELETE FROM goal_exercises WHERE goal_id = $1 AND exercise_id = $2 RETURNING *',
      [id, exerciseId]
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: 'Link not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error unlinking exercise from goal:', error);
    return NextResponse.json(
      { error: 'Failed to unlink exercise from goal' },
      { status: 500 }
    );
  }
}
