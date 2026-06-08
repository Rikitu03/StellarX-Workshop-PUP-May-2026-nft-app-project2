import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { verifyAuth } from '@/lib/auth';
import { apiError, readJson } from '@/lib/api';
import { ownerArtwork, publicArtwork, PUBLIC_CACHE_PREFIX } from '@/lib/artwork';
import { invalidateByPrefix } from '@/lib/cache';
import { updateArtworkSchema } from '@/lib/validation';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type Ctx = { params: Promise<{ id: string }> };

// GET /api/artworks/:id — published artworks are public; unpublished ones are
// visible only to their owner.
export async function GET(req: NextRequest, { params }: Ctx) {
  const { id } = await params;
  const art = await prisma.artwork.findUnique({
    where: { id },
    include: { user: { select: { id: true, name: true, walletAddress: true } } },
  });
  if (!art) return apiError('Not found', 404);

  if (art.status === 'published') {
    return NextResponse.json({ artwork: publicArtwork(art) });
  }
  const auth = await verifyAuth(req);
  if (!auth || auth.userId !== art.userId) return apiError('Not found', 404);
  return NextResponse.json({ artwork: publicArtwork(art) });
}

// PUT /api/artworks/:id — update draft metadata (owner only, not once published).
export async function PUT(req: NextRequest, { params }: Ctx) {
  const { id } = await params;
  const auth = await verifyAuth(req);
  if (!auth) return apiError('Unauthorized', 401);

  const art = await prisma.artwork.findUnique({ where: { id } });
  if (!art || art.userId !== auth.userId) return apiError('Not found', 404);
  if (art.status === 'published') return apiError('Cannot edit a published artwork', 409);

  const body = await readJson(req);
  if (body === null) return apiError('Invalid JSON body', 400);
  const parsed = updateArtworkSchema.safeParse(body);
  if (!parsed.success) {
    return apiError('Validation failed', 422, parsed.error.flatten().fieldErrors);
  }

  const updated = await prisma.artwork.update({
    where: { id },
    data: {
      title: parsed.data.title ?? undefined,
      description:
        parsed.data.description === undefined ? undefined : parsed.data.description,
    },
  });
  return NextResponse.json({ artwork: ownerArtwork(updated) });
}

// DELETE /api/artworks/:id — owner removes an artwork.
export async function DELETE(req: NextRequest, { params }: Ctx) {
  const { id } = await params;
  const auth = await verifyAuth(req);
  if (!auth) return apiError('Unauthorized', 401);

  const art = await prisma.artwork.findUnique({ where: { id } });
  if (!art || art.userId !== auth.userId) return apiError('Not found', 404);

  await prisma.artwork.delete({ where: { id } });
  // Prototype: image files are left on disk.
  if (art.status === 'published') await invalidateByPrefix(PUBLIC_CACHE_PREFIX);
  return NextResponse.json({ ok: true });
}
