import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export const AUTH_COOKIE = 'auth_token';
// 30 days, in seconds. Matches the JWT exp below.
export const SESSION_MAX_AGE = 60 * 60 * 24 * 30;

export interface AuthUser {
  userId: number;
  username: string;
}

interface TokenPayload {
  sub: number;
  username: string;
  iat: number;
  exp: number;
}

async function getJwtSecret(): Promise<string> {
  const { getCloudflareContext } = await import('@opennextjs/cloudflare');
  const { env } = await getCloudflareContext({ async: true });
  const secret = (env as Record<string, unknown>).JWT_SECRET as string | undefined;
  if (!secret) {
    throw new Error('JWT_SECRET is not configured. Add it to wrangler.jsonc `vars`.');
  }
  return secret;
}

// --- base64url helpers (btoa/atob exist in both workerd and Node 18+) ---

function bytesToB64url(bytes: Uint8Array): string {
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function strToB64url(s: string): string {
  return bytesToB64url(new TextEncoder().encode(s));
}

function b64urlToBytes(s: string): Uint8Array {
  let t = s.replace(/-/g, '+').replace(/_/g, '/');
  const pad = t.length % 4;
  if (pad) t += '='.repeat(4 - pad);
  const bin = atob(t);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

function b64urlToStr(s: string): string {
  return new TextDecoder().decode(b64urlToBytes(s));
}

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(hex.substr(i * 2, 2), 16);
  }
  return bytes;
}

// --- JWT (HS256 via Web Crypto) ---

async function hmacSign(secret: string, data: string): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(data));
  return new Uint8Array(sig);
}

function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export async function signToken(user: AuthUser): Promise<string> {
  const secret = await getJwtSecret();
  const now = Math.floor(Date.now() / 1000);
  const payload: TokenPayload = {
    sub: user.userId,
    username: user.username,
    iat: now,
    exp: now + SESSION_MAX_AGE,
  };
  const header = strToB64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const body = strToB64url(JSON.stringify(payload));
  const data = `${header}.${body}`;
  const sig = bytesToB64url(await hmacSign(secret, data));
  return `${data}.${sig}`;
}

export async function verifyToken(token: string): Promise<AuthUser | null> {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const [header, body, sig] = parts;

    const secret = await getJwtSecret();
    const expected = bytesToB64url(await hmacSign(secret, `${header}.${body}`));
    if (!constantTimeEqual(sig, expected)) return null;

    const payload = JSON.parse(b64urlToStr(body)) as TokenPayload;
    const now = Math.floor(Date.now() / 1000);
    if (typeof payload.exp !== 'number' || payload.exp < now) return null;

    return { userId: payload.sub, username: payload.username };
  } catch {
    return null;
  }
}

// --- Password hashing (PBKDF2 via Web Crypto) ---

const PBKDF2_ITERATIONS = 100_000;

export function generateSalt(): string {
  return bytesToHex(crypto.getRandomValues(new Uint8Array(16)));
}

export async function hashPassword(password: string, saltHex: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(password),
    'PBKDF2',
    false,
    ['deriveBits']
  );
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt: hexToBytes(saltHex) as BufferSource, iterations: PBKDF2_ITERATIONS, hash: 'SHA-256' },
    key,
    256
  );
  return bytesToHex(new Uint8Array(bits));
}

export async function verifyPassword(password: string, saltHex: string, expectedHash: string): Promise<boolean> {
  const hash = await hashPassword(password, saltHex);
  return constantTimeEqual(hash, expectedHash);
}

export function isValidPin(pin: unknown): pin is string {
  return typeof pin === 'string' && /^\d{4}$/.test(pin);
}

export function isValidUsername(name: unknown): name is string {
  return typeof name === 'string' && /^[a-zA-Z0-9_-]{1,32}$/.test(name);
}

// --- Session helpers for route handlers ---

export async function getCurrentUser(): Promise<AuthUser | null> {
  const store = await cookies();
  const token = store.get(AUTH_COOKIE)?.value;
  if (!token) return null;
  return verifyToken(token);
}

export function unauthorized(): NextResponse {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}

export function setSessionCookie(response: NextResponse, token: string): void {
  response.cookies.set(AUTH_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: SESSION_MAX_AGE,
  });
}

export function clearSessionCookie(response: NextResponse): void {
  response.cookies.set(AUTH_COOKIE, '', {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 0,
  });
}
