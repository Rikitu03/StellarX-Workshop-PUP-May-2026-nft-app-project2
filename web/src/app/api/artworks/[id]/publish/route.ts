import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { verifyAuth } from '@/lib/auth';
import { apiError, readJson } from '@/lib/api';
import { ownerArtwork, PUBLIC_CACHE_PREFIX } from '@/lib/artwork';
import { invalidateByPrefix } from '@/lib/cache';
import { publishSchema } from '@/lib/validation';

export const runtime = 'nodejs';

type Ctx = { params: Promise<{ id: string }> };

// PUT /api/artworks/:id/publish — list a 'ready' artwork for a fixed XLM price
// or as a free claim. Priced listings require a linked wallet to receive funds.
export async function PUT(req: NextRequest, { params }: Ctx) {
  const { id } = await params;
  const auth = await verifyAuth(req);
  if (!auth) return apiError('Unauthorized', 401);

  const art = await prisma.artwork.findUnique({
    where: { id },
    include: { user: { select: { walletAddress: true } } },
  });
  if (!art || art.userId !== auth.userId) return apiError('Not found', 404);
  if (art.status !== 'ready' && art.status !== 'published') {
    return apiError('Upload an image first — the artwork must be "ready"', 409);
  }

  const body = await readJson(req);
  if (body === null) return apiError('Invalid JSON body', 400);
  const parsed = publishSchema.safeParse(body);
  if (!parsed.success) {
    return apiError('Validation failed', 422, parsed.error.flatten().fieldErrors);
  }
  const { isFree, price } = parsed.data;

  if (!isFree && !art.user.walletAddress) {
    return apiError('Link a Stellar wallet before selling for XLM', 400);
  }

  const updated = await prisma.artwork.update({
    where: { id },
    data: { status: 'published', isFree, price: isFree ? null : price },
  });

  await invalidateByPrefix(PUBLIC_CACHE_PREFIX);
  return NextResponse.json({ artwork: ownerArtwork(updated) });
}
