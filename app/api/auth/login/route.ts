import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { isValidPin, signToken, verifyPassword, setSessionCookie } from '@/lib/auth';

// POST { username, password } -> sets auth cookie
export async function POST(request: Request) {
  try {
    const { username, password } = await request.json();

    if (typeof username !== 'string' || !isValidPin(password)) {
      return NextResponse.json({ error: 'Invalid username or password' }, { status: 400 });
    }

    const result = await query(
      'SELECT id, username, password_hash, password_salt FROM users WHERE username = $1',
      [username]
    );
    const user = result.rows[0];

    if (!user || !(await verifyPassword(password, user.password_salt, user.password_hash))) {
      return NextResponse.json({ error: 'Invalid username or password' }, { status: 401 });
    }

    const token = await signToken({ userId: Number(user.id), username: user.username });
    const response = NextResponse.json({ username: user.username });
    setSessionCookie(response, token);
    return response;
  } catch (error) {
    console.error('Error logging in:', error);
    return NextResponse.json({ error: 'Failed to log in' }, { status: 500 });
  }
}
