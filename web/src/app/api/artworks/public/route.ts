import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { cached } from '@/lib/cache';
import { publicArtwork, PUBLIC_CACHE_PREFIX } from '@/lib/artwork';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// GET /api/artworks/public?page=1&limit=12 — paginated published artworks for
// the marketplace / featured grid. Cached for 5 min (invalidated on publish).
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const page = Math.max(1, Number(searchParams.get('page') ?? '1') || 1);
  const limit = Math.min(50, Math.max(1, Number(searchParams.get('limit') ?? '12') || 12));

  const key = `${PUBLIC_CACHE_PREFIX}:p${page}:l${limit}`;
  const data = await cached(key, 300, async () => {
    const [items, total] = await Promise.all([
      prisma.artwork.findMany({
        where: { status: 'published' },
        orderBy: { updatedAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: { user: { select: { id: true, name: true, walletAddress: true } } },
      }),
      prisma.artwork.count({ where: { status: 'published' } }),
    ]);
    return { artworks: items.map(publicArtwork), page, limit, total };
  });

  return NextResponse.json(data);
}
