import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { verifyAuth } from '@/lib/auth';
import { cached, invalidate } from '@/lib/cache';
import { apiError, publicUser, readJson } from '@/lib/api';
import { updateProfileSchema } from '@/lib/validation';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const profileCacheKey = (userId: string) => `user:profile:${userId}`;

// GET /api/users/me — current user's profile. Demonstrates the Redis caching
// layer: the profile is cached briefly per user. A future profile-update
// endpoint should call invalidate(`user:profile:${userId}`).
export async function GET(req: NextRequest) {
  const auth = await verifyAuth(req);
  if (!auth) return apiError('Unauthorized', 401);

  const profile = await cached(profileCacheKey(auth.userId), 15, async () => {
    const user = await prisma.user.findUnique({ where: { id: auth.userId } });
    return user ? publicUser(user) : null;
  });

  if (!profile) return apiError('User not found', 404);
  return NextResponse.json({ user: profile });
}

// PATCH /api/users/me — update the current user's profile. Currently used to
// link/unlink a Stellar wallet address (walletAddress: "G..." to link, null to
// unlink). Invalidates the cached profile so the next GET is fresh.
export async function PATCH(req: NextRequest) {
  const auth = await verifyAuth(req);
  if (!auth) return apiError('Unauthorized', 401);

  const body = await readJson(req);
  if (body === null) return apiError('Invalid JSON body', 400);

  const parsed = updateProfileSchema.safeParse(body);
  if (!parsed.success) {
    return apiError('Validation failed', 422, parsed.error.flatten().fieldErrors);
  }
  const { walletAddress } = parsed.data;

  // Don't let two accounts claim the same wallet.
  if (walletAddress) {
    const taken = await prisma.user.findFirst({
      where: { walletAddress, NOT: { id: auth.userId } },
      select: { id: true },
    });
    if (taken) return apiError('That wallet is already linked to another account', 409);
  }

  const user = await prisma.user.update({
    where: { id: auth.userId },
    data: { walletAddress },
  });

  await invalidate(profileCacheKey(auth.userId));
  return NextResponse.json({ user: publicUser(user) });
}
