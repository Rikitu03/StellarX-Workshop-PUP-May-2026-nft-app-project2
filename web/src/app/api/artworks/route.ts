import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { verifyAuth } from '@/lib/auth';
import { apiError, readJson } from '@/lib/api';
import { ownerArtwork } from '@/lib/artwork';
import { createArtworkSchema } from '@/lib/validation';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// GET /api/artworks — list the current user's artworks (all statuses).
export async function GET(req: NextRequest) {
  const auth = await verifyAuth(req);
  if (!auth) return apiError('Unauthorized', 401);

  const artworks = await prisma.artwork.findMany({
    where: { userId: auth.userId },
    orderBy: { updatedAt: 'desc' },
  });
  return NextResponse.json({ artworks: artworks.map(ownerArtwork) });
}

// POST /api/artworks — create a new draft (title + description). Image comes
// later via POST /api/artworks/:id/upload.
export async function POST(req: NextRequest) {
  const auth = await verifyAuth(req);
  if (!auth) return apiError('Unauthorized', 401);

  const body = await readJson(req);
  if (body === null) return apiError('Invalid JSON body', 400);

  const parsed = createArtworkSchema.safeParse(body);
  if (!parsed.success) {
    return apiError('Validation failed', 422, parsed.error.flatten().fieldErrors);
  }

  const artwork = await prisma.artwork.create({
    data: {
      userId: auth.userId,
      title: parsed.data.title,
      description: parsed.data.description ?? null,
      status: 'draft',
    },
  });
  return NextResponse.json({ artwork: ownerArtwork(artwork) }, { status: 201 });
}
