import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

// GET list of usernames for the login dropdown. Public (pre-auth).
// Also reports whether any user exists so the login page can switch to the
// "create first user" bootstrap flow.
export async function GET() {
  try {
    const result = await query('SELECT username FROM users ORDER BY username ASC');
    const usernames = result.rows.map((row) => row.username as string);
    return NextResponse.json({ usernames, needsBootstrap: usernames.length === 0 });
  } catch (error) {
    console.error('Error fetching users:', error);
    return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 });
  }
}
