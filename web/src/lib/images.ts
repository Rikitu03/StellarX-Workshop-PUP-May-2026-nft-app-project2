// Image storage + processing (Phase 2.1 / 2.3).
//
// PROTOTYPE NOTE: files are written to `public/uploads/` and served statically
// at `/uploads/...` (no S3/R2 signed URLs). Resizing uses `sharp`; if sharp is
// unavailable for any reason it gracefully falls back to the original image for
// every size, so uploads never hard-fail.
import { mkdir, writeFile } from 'fs/promises';
import path from 'path';

const UPLOAD_DIR = path.join(process.cwd(), 'public', 'uploads');
const PUBLIC_PREFIX = '/uploads';

export type ArtworkImages = { original: string; display: string; thumb: string };

const ALLOWED: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
  'image/gif': 'gif',
};

export const MAX_UPLOAD_BYTES = 8 * 1024 * 1024; // 8 MB

export function isAllowedImage(type: string): boolean {
  return type in ALLOWED;
}

/**
 * Persist the original upload and generate display (1200px) + thumbnail (500px)
 * variants. Returns the public URLs for each size.
 */
export async function saveAndProcess(
  artworkId: string,
  buffer: Buffer,
  contentType: string,
): Promise<ArtworkImages> {
  await mkdir(UPLOAD_DIR, { recursive: true });

  const ext = ALLOWED[contentType] ?? 'bin';
  const originalName = `${artworkId}-original.${ext}`;
  await writeFile(path.join(UPLOAD_DIR, originalName), buffer);

  // Default: original stands in for every size (fallback).
  const images: ArtworkImages = {
    original: `${PUBLIC_PREFIX}/${originalName}`,
    display: `${PUBLIC_PREFIX}/${originalName}`,
    thumb: `${PUBLIC_PREFIX}/${originalName}`,
  };

  try {
    const sharp = (await import('sharp')).default;
    const displayName = `${artworkId}-display.webp`;
    const thumbName = `${artworkId}-thumb.webp`;

    await sharp(buffer)
      .resize(1200, 1200, { fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 82 })
      .toFile(path.join(UPLOAD_DIR, displayName));

    await sharp(buffer)
      .resize(500, 500, { fit: 'cover' })
      .webp({ quality: 80 })
      .toFile(path.join(UPLOAD_DIR, thumbName));

    images.display = `${PUBLIC_PREFIX}/${displayName}`;
    images.thumb = `${PUBLIC_PREFIX}/${thumbName}`;
  } catch (err) {
    console.warn('[images] sharp processing failed — falling back to original.', err);
  }

  return images;
}
