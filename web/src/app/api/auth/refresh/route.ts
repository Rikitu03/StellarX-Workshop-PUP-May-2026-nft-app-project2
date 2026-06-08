import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import {
  REFRESH_COOKIE,
  getRefreshTokenUser,
  signAccessToken,
  setAuthCookies,
} from '@/lib/auth';
import { apiError } from '@/lib/api';

export const runtime = 'nodejs';

// POST /api/auth/refresh — read the refresh token cookie, validate it against
// the KV store, and issue a fresh access token.
export async function POST(req: NextRequest) {
  const refreshToken = req.cookies.get(REFRESH_COOKIE)?.value;
  if (!refreshToken) return apiError('Missing refresh token', 401);

  const userId = await getRefreshTokenUser(refreshToken);
  if (!userId) return apiError('Invalid or expired refresh token', 401);

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return apiError('User no longer exists', 401);

  const accessToken = await signAccessToken({ userId: user.id, email: user.email });

  const res = NextResponse.json({ accessToken });
  setAuthCookies(res, accessToken); // refresh cookie left as-is
  return res;
}
