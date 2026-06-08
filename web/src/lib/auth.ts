// Auth core (Phase 1.3): bcrypt password hashing, short-lived JWT access tokens
// (jose), opaque refresh tokens stored in the KV store, and request verification.
import { randomBytes } from 'crypto';
import bcrypt from 'bcryptjs';
import { SignJWT, jwtVerify } from 'jose';
import type { NextRequest, NextResponse } from 'next/server';
import { kvGet, kvSet, kvDel } from './store';

export const ACCESS_COOKIE = 'access_token';
export const REFRESH_COOKIE = 'refresh_token';

const ACCESS_TTL = Number(process.env.ACCESS_TOKEN_TTL_SECONDS ?? 900); // 15m
const REFRESH_TTL = Number(process.env.REFRESH_TOKEN_TTL_SECONDS ?? 604800); // 7d

const accessSecret = new TextEncoder().encode(
  process.env.JWT_ACCESS_SECRET ?? 'dev-access-secret-change-me',
);

export type AuthUser = { userId: string; email: string };

// --- Passwords ---
export function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, 10);
}
export function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

// --- Access tokens (JWT) ---
export async function signAccessToken(user: AuthUser): Promise<string> {
  return new SignJWT({ email: user.email })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(user.userId)
    .setIssuedAt()
    .setExpirationTime(`${ACCESS_TTL}s`)
    .sign(accessSecret);
}

export async function verifyAccessToken(token: string): Promise<AuthUser | null> {
  try {
    const { payload } = await jwtVerify(token, accessSecret);
    if (!payload.sub || typeof payload.email !== 'string') return null;
    return { userId: payload.sub, email: payload.email };
  } catch {
    return null;
  }
}

// --- Refresh tokens (opaque, stored in KV with the user id) ---
const refreshKey = (token: string) => `refresh:${token}`;

export async function createRefreshToken(userId: string): Promise<string> {
  const token = randomBytes(32).toString('hex');
  await kvSet(refreshKey(token), userId, REFRESH_TTL);
  return token;
}

export async function getRefreshTokenUser(token: string): Promise<string | null> {
  if (!token) return null;
  return kvGet(refreshKey(token));
}

export async function revokeRefreshToken(token: string): Promise<void> {
  if (token) await kvDel(refreshKey(token));
}

// --- Cookies ---
const isProd = process.env.NODE_ENV === 'production';

function baseCookie(maxAge: number) {
  return {
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: isProd,
    path: '/',
    maxAge,
  };
}

/** Set the access cookie, and (when provided) the refresh cookie, on a response. */
export function setAuthCookies(
  res: NextResponse,
  accessToken: string,
  refreshToken?: string,
): void {
  res.cookies.set(ACCESS_COOKIE, accessToken, baseCookie(ACCESS_TTL));
  if (refreshToken) {
    res.cookies.set(REFRESH_COOKIE, refreshToken, baseCookie(REFRESH_TTL));
  }
}

/** Clear both auth cookies (logout). */
export function clearAuthCookies(res: NextResponse): void {
  res.cookies.set(ACCESS_COOKIE, '', baseCookie(0));
  res.cookies.set(REFRESH_COOKIE, '', baseCookie(0));
}

// --- Request verification (the `verifyAuth` middleware-style helper) ---
function readAccessToken(req: NextRequest): string | null {
  const cookie = req.cookies.get(ACCESS_COOKIE)?.value;
  if (cookie) return cookie;
  const header = req.headers.get('authorization');
  if (header?.startsWith('Bearer ')) return header.slice(7);
  return null;
}

/**
 * Verify the request's access token. Returns the authenticated user, or null
 * if missing/invalid/expired. Protected route handlers call this and return 401
 * when it's null.
 */
export async function verifyAuth(req: NextRequest): Promise<AuthUser | null> {
  const token = readAccessToken(req);
  if (!token) return null;
  return verifyAccessToken(token);
}

export const tokenTtls = { access: ACCESS_TTL, refresh: REFRESH_TTL };
