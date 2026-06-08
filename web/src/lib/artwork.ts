// Artwork serialization helpers — shape DB rows for the API, parsing the
// JSON-encoded imageKeys column into a typed images object.
import type { Artwork, User } from '@prisma/client';
import type { ArtworkImages } from './images';

export const PUBLIC_CACHE_PREFIX = 'artworks:public';

export function parseImages(imageKeys: string | null): ArtworkImages | null {
  if (!imageKeys) return null;
  try {
    return JSON.parse(imageKeys) as ArtworkImages;
  } catch {
    return null;
  }
}

type Creator = Pick<User, 'id' | 'name' | 'walletAddress'>;
type ArtworkWithCreator = Artwork & { user: Creator };

/** Public-facing shape (marketplace / detail). Includes the creator's payout wallet. */
export function publicArtwork(a: ArtworkWithCreator) {
  return {
    id: a.id,
    title: a.title,
    description: a.description,
    status: a.status,
    price: a.price,
    isFree: a.isFree,
    images: parseImages(a.imageKeys),
    createdAt: a.createdAt,
    creator: {
      id: a.user.id,
      name: a.user.name,
      walletAddress: a.user.walletAddress,
    },
  };
}

/** Owner-facing shape (studio) — no creator block needed. */
export function ownerArtwork(a: Artwork) {
  return {
    id: a.id,
    title: a.title,
    description: a.description,
    status: a.status,
    price: a.price,
    isFree: a.isFree,
    images: parseImages(a.imageKeys),
    createdAt: a.createdAt,
    updatedAt: a.updatedAt,
  };
}

export type PublicArtwork = ReturnType<typeof publicArtwork>;
export type OwnerArtwork = ReturnType<typeof ownerArtwork>;
