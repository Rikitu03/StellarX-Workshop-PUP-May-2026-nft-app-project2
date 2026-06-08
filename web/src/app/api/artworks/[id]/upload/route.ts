import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { verifyAuth } from '@/lib/auth';
import { apiError } from '@/lib/api';
import { ownerArtwork } from '@/lib/artwork';
import { saveAndProcess, isAllowedImage, MAX_UPLOAD_BYTES } from '@/lib/images';

export const runtime = 'nodejs';

type Ctx = { params: Promise<{ id: string }> };

// POST /api/artworks/:id/upload — multipart image upload (field name "file").
// Stores the original + generates resized variants, then marks the artwork
// 'ready'. (In production a BullMQ worker would do the processing async; here
// it runs inline so there's no Redis/worker to run.)
export async function POST(req: NextRequest, { params }: Ctx) {
  const { id } = await params;
  const auth = await verifyAuth(req);
  if (!auth) return apiError('Unauthorized', 401);

  const art = await prisma.artwork.findUnique({ where: { id } });
  if (!art || art.userId !== auth.userId) return apiError('Not found', 404);
  if (art.status === 'published') {
    return apiError('Cannot replace the image on a published artwork', 409);
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return apiError('Expected multipart form data', 400);
  }

  const file = form.get('file');
  if (!(file instanceof File)) return apiError('Missing "file" field', 400);
  if (!isAllowedImage(file.type)) {
    return apiError('Unsupported image type (png, jpeg, webp, gif)', 415);
  }
  if (file.size > MAX_UPLOAD_BYTES) return apiError('Image too large (max 8MB)', 413);

  const buffer = Buffer.from(await file.arrayBuffer());
  const images = await saveAndProcess(id, buffer, file.type);

  const updated = await prisma.artwork.update({
    where: { id },
    data: { status: 'ready', imageKeys: JSON.stringify(images) },
  });
  return NextResponse.json({ artwork: ownerArtwork(updated) });
}
