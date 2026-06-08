import { NextRequest, NextResponse } from 'next/server';
import { REFRESH_COOKIE, revokeRefreshToken, clearAuthCookies } from '@/lib/auth';

export const runtime = 'nodejs';

// POST /api/auth/logout — delete the refresh token from the KV store and clear
// the auth cookies.
export async function POST(req: NextRequest) {
  const refreshToken = req.cookies.get(REFRESH_COOKIE)?.value;
  if (refreshToken) await revokeRefreshToken(refreshToken);

  const res = NextResponse.json({ ok: true });
  clearAuthCookies(res);
  return res;
}
