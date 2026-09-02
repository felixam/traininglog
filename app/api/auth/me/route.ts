import { NextResponse } from 'next/server';
import { getCurrentUser, unauthorized } from '@/lib/auth';

// GET -> current authenticated user
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return unauthorized();
  return NextResponse.json({ userId: user.userId, username: user.username });
}
