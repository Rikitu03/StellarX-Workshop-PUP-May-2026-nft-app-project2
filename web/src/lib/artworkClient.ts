// Client-side helpers for the artwork API.

export type ArtImages = { original: string; display: string; thumb: string } | null;

export type Artwork = {
  id: string;
  title: string;
  description: string | null;
  status: 'draft' | 'processing' | 'ready' | 'published';
  price: number | null;
  isFree: boolean;
  images: ArtImages;
  createdAt: string;
  updatedAt?: string;
  creator?: { id: string; name: string | null; walletAddress: string | null };
};

export type PublicList = {
  artworks: Artwork[];
  page: number;
  limit: number;
  total: number;
};

async function parseError(res: Response): Promise<string> {
  try {
    return (await res.json()).error ?? `Request failed (${res.status})`;
  } catch {
    return `Request failed (${res.status})`;
  }
}

async function json<T>(res: Response): Promise<T> {
  if (!res.ok) throw new Error(await parseError(res));
  return res.json() as Promise<T>;
}

// --- Owner (studio) ---
export async function createDraft(input: {
  title: string;
  description?: string;
}): Promise<Artwork> {
  const res = await fetch('/api/artworks', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  return (await json<{ artwork: Artwork }>(res)).artwork;
}

export async function uploadImage(id: string, file: File): Promise<Artwork> {
  const form = new FormData();
  form.append('file', file);
  const res = await fetch(`/api/artworks/${id}/upload`, { method: 'POST', body: form });
  return (await json<{ artwork: Artwork }>(res)).artwork;
}

export async function listMine(): Promise<Artwork[]> {
  const res = await fetch('/api/artworks', { cache: 'no-store' });
  return (await json<{ artworks: Artwork[] }>(res)).artworks;
}

export async function publishArtwork(
  id: string,
  input: { isFree: boolean; price?: number },
): Promise<Artwork> {
  const res = await fetch(`/api/artworks/${id}/publish`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  return (await json<{ artwork: Artwork }>(res)).artwork;
}

export async function deleteArtwork(id: string): Promise<void> {
  const res = await fetch(`/api/artworks/${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error(await parseError(res));
}

// --- Public ---
export async function fetchPublic(limit = 12, page = 1): Promise<PublicList> {
  const res = await fetch(`/api/artworks/public?page=${page}&limit=${limit}`, {
    cache: 'no-store',
  });
  return json<PublicList>(res);
}

export async function fetchArtwork(id: string): Promise<Artwork> {
  const res = await fetch(`/api/artworks/${id}`, { cache: 'no-store' });
  return (await json<{ artwork: Artwork }>(res)).artwork;
}
