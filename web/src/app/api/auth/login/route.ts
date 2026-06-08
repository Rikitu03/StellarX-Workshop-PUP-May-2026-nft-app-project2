import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import {
  verifyPassword,
  signAccessToken,
  createRefreshToken,
  setAuthCookies,
} from '@/lib/auth';
import { loginSchema } from '@/lib/validation';
import { apiError, publicUser, readJson } from '@/lib/api';

export const runtime = 'nodejs';

// POST /api/auth/login — verify credentials, issue an access token (cookie +
// body) and a refresh token (httpOnly cookie, stored in Redis/KV with the uid).
export async function POST(req: Request) {
  const body = await readJson(req);
  if (body === null) return apiError('Invalid JSON body', 400);

  const parsed = loginSchema.safeParse(body);
  if (!parsed.success) return apiError('Validation failed', 422, parsed.error.flatten().fieldErrors);
  const { email, password } = parsed.data;

  const user = await prisma.user.findUnique({ where: { email } });
  // Same response whether the email is unknown or the password is wrong.
  if (!user || !(await verifyPassword(password, user.passwordHash))) {
    return apiError('Invalid email or password', 401);
  }

  const accessToken = await signAccessToken({ userId: user.id, email: user.email });
  const refreshToken = await createRefreshToken(user.id);

  const res = NextResponse.json({ user: publicUser(user), accessToken });
  setAuthCookies(res, accessToken, refreshToken);
  return res;
}
