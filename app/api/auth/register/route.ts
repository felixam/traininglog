import { NextResponse } from 'next/server';
import { query, batch } from '@/lib/db';
import {
  getCurrentUser,
  unauthorized,
  isValidPin,
  isValidUsername,
  generateSalt,
  hashPassword,
  signToken,
  setSessionCookie,
} from '@/lib/auth';
import { DEFAULT_GOALS } from '@/lib/defaultGoals';

// Tables that gain ownership when the very first user claims pre-existing data.
const OWNED_TABLES = ['goals', 'exercises', 'goal_exercises', 'goal_logs', 'exercise_logs'];

// POST { username, password } -> creates a user.
// First user: anyone may bootstrap. Afterwards: only a logged-in user may add another.
export async function POST(request: Request) {
  try {
    const countResult = await query('SELECT COUNT(*) AS c FROM users');
    const isBootstrap = Number(countResult.rows[0].c) === 0;

    if (!isBootstrap) {
      const current = await getCurrentUser();
      if (!current) return unauthorized();
    }

    const { username, password } = await request.json();

    if (!isValidUsername(username)) {
      return NextResponse.json(
        { error: 'Username must be 1-32 characters (letters, numbers, _ or -)' },
        { status: 400 }
      );
    }
    if (!isValidPin(password)) {
      return NextResponse.json({ error: 'Password must be exactly 4 digits' }, { status: 400 });
    }

    const existing = await query('SELECT id FROM users WHERE username = $1', [username]);
    if (existing.rows.length > 0) {
      return NextResponse.json({ error: 'Username already taken' }, { status: 409 });
    }

    const salt = generateSalt();
    const hash = await hashPassword(password, salt);

    const inserted = await query(
      'INSERT INTO users (username, password_hash, password_salt) VALUES ($1, $2, $3) RETURNING id',
      [username, hash, salt]
    );
    const userId = Number(inserted.rows[0].id);

    if (isBootstrap) {
      // Adopt any pre-existing (un-owned) data from the single-user era.
      await batch(
        OWNED_TABLES.map((table) => ({
          sql: `UPDATE ${table} SET user_id = $1 WHERE user_id IS NULL`,
          params: [userId],
        }))
      );
    }

    // Seed default goals unless the user already owns goals (e.g. just-claimed data).
    const goalCount = await query('SELECT COUNT(*) AS c FROM goals WHERE user_id = $1', [userId]);
    if (Number(goalCount.rows[0].c) === 0) {
      await batch(
        DEFAULT_GOALS.map((g) => ({
          sql: 'INSERT INTO goals (user_id, name, color, display_order) VALUES ($1, $2, $3, $4)',
          params: [userId, g.name, g.color, g.display_order],
        }))
      );
    }

    const response = NextResponse.json({ username }, { status: 201 });
    // Auto-login only the bootstrap user; an existing admin adding a teammate
    // keeps their own session.
    if (isBootstrap) {
      const token = await signToken({ userId, username });
      setSessionCookie(response, token);
    }
    return response;
  } catch (error) {
    console.error('Error registering user:', error);
    return NextResponse.json({ error: 'Failed to register user' }, { status: 500 });
  }
}
