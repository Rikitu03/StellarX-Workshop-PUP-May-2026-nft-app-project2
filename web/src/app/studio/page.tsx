'use client';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { fetchMe } from '@/lib/authClient';
import {
  createDraft,
  uploadImage,
  listMine,
  publishArtwork,
  deleteArtwork,
  type Artwork,
} from '@/lib/artworkClient';

const STATUS_STYLE: Record<string, string> = {
  draft: 'bg-white/10 text-white/60',
  processing: 'bg-amber-400/15 text-amber-300',
  ready: 'bg-sky-400/15 text-sky-300',
  published: 'bg-emerald-400/15 text-emerald-300',
};

export default function StudioPage() {
  const router = useRouter();
  const [walletLinked, setWalletLinked] = useState(false);
  const [artworks, setArtworks] = useState<Artwork[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const me = await fetchMe();
      if (!me) {
        router.replace('/login');
        return;
      }
      setWalletLinked(!!me.walletAddress);
      setArtworks(await listMine());
      setLoading(false);
    })().catch(() => router.replace('/login'));
  }, [router]);

  function upsert(updated: Artwork) {
    setArtworks((list) => list.map((a) => (a.id === updated.id ? updated : a)));
  }
  function remove(id: string) {
    setArtworks((list) => list.filter((a) => a.id !== id));
  }

  if (loading) {
    return (
      <main className="app-gradient flex min-h-screen items-center justify-center text-white/60">
        Loading…
      </main>
    );
  }

  return (
    <main className="app-gradient min-h-screen px-4 py-12">
      <div className="mx-auto max-w-3xl">
        <nav className="mb-6 flex items-center justify-between text-sm">
          <Link href="/profile" className="text-white/60 hover:text-white">
            ← Dashboard
          </Link>
          <Link href="/" className="text-white/60 hover:text-white">
            View marketplace
          </Link>
        </nav>

        <h1 className="text-2xl font-bold text-white">Studio</h1>
        <p className="mt-1 text-sm text-white/55">
          Upload your art, then publish it for a fixed XLM price or as a free claim.
        </p>

        {!walletLinked && (
          <div className="mt-5 rounded-xl border border-amber-300/20 bg-amber-300/10 px-4 py-3 text-sm text-amber-200">
            You can publish free claims now, but to sell for XLM you need to{' '}
            <Link href="/profile" className="font-semibold underline">
              link a Stellar wallet
            </Link>{' '}
            first.
          </div>
        )}

        <CreateForm onCreated={(a) => setArtworks((list) => [a, ...list])} />

        <h2 className="mt-10 mb-3 text-lg font-semibold text-white">
          Your artworks {artworks.length > 0 && `(${artworks.length})`}
        </h2>
        {artworks.length === 0 ? (
          <p className="rounded-xl border border-white/10 bg-white/5 px-4 py-10 text-center text-sm text-white/50">
            Nothing yet — upload your first piece above.
          </p>
        ) : (
          <div className="space-y-4">
            {artworks.map((art) => (
              <ArtworkRow
                key={art.id}
                art={art}
                walletLinked={walletLinked}
                onChange={upsert}
                onDelete={() => remove(art.id)}
              />
            ))}
          </div>
        )}
      </div>
    </main>
  );
}

function CreateForm({ onCreated }: { onCreated: (a: Artwork) => void }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  function pickFile(f: File | null) {
    setFile(f);
    setPreview(f ? URL.createObjectURL(f) : null);
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!file) return setError('Choose an image to upload.');
    setBusy(true);
    setError(null);
    try {
      const draft = await createDraft({ title, description: description || undefined });
      const ready = await uploadImage(draft.id, file);
      onCreated(ready);
      setTitle('');
      setDescription('');
      pickFile(null);
      if (fileRef.current) fileRef.current.value = '';
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="glass-card mt-6 rounded-2xl p-6">
      <h2 className="text-base font-semibold text-white">New artwork</h2>
      <div className="mt-4 grid gap-4 sm:grid-cols-[160px_1fr]">
        <label className="block cursor-pointer">
          <div className="flex aspect-square items-center justify-center overflow-hidden rounded-xl border border-dashed border-white/20 bg-white/5 text-center text-xs text-white/40">
            {preview ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={preview} alt="preview" className="h-full w-full object-cover" />
            ) : (
              <span className="px-2">Click to choose an image</span>
            )}
          </div>
          <input
            ref={fileRef}
            type="file"
            accept="image/png,image/jpeg,image/webp,image/gif"
            className="hidden"
            onChange={(e) => pickFile(e.target.files?.[0] ?? null)}
          />
        </label>

        <div className="space-y-3">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            maxLength={120}
            placeholder="Title"
            className="glass-input w-full rounded-lg px-3 py-2.5 text-sm"
          />
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            maxLength={2000}
            rows={3}
            placeholder="Description (optional)"
            className="glass-input w-full resize-none rounded-lg px-3 py-2.5 text-sm"
          />
          <button
            type="submit"
            disabled={busy || !title || !file}
            className="btn-brand w-full rounded-lg py-2.5 text-sm font-semibold"
          >
            {busy ? 'Uploading & processing…' : 'Create & upload'}
          </button>
        </div>
      </div>
      {error && <p className="mt-3 text-sm text-red-300">{error}</p>}
    </form>
  );
}

function ArtworkRow({
  art,
  walletLinked,
  onChange,
  onDelete,
}: {
  art: Artwork;
  walletLinked: boolean;
  onChange: (a: Artwork) => void;
  onDelete: () => void;
}) {
  const [isFree, setIsFree] = useState(art.isFree);
  const [price, setPrice] = useState(art.price ? String(art.price) : '');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const img = art.images?.thumb ?? art.images?.display ?? art.images?.original;

  async function publish() {
    setBusy(true);
    setErr(null);
    try {
      const updated = await publishArtwork(art.id, {
        isFree,
        price: isFree ? undefined : Number(price),
      });
      onChange(updated);
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Publish failed');
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!confirm('Delete this artwork?')) return;
    setBusy(true);
    try {
      await deleteArtwork(art.id);
      onDelete();
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Delete failed');
      setBusy(false);
    }
  }

  const canPublish = art.status === 'ready' || art.status === 'published';
  const priceInvalid = !isFree && (!price || Number(price) <= 0);

  return (
    <div className="glass-card rounded-2xl p-4">
      <div className="flex gap-4">
        <div className="h-20 w-20 shrink-0 overflow-hidden rounded-lg bg-white/5">
          {img ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={img} alt={art.title} className="h-full w-full object-cover" />
          ) : null}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <h3 className="truncate font-semibold text-white">{art.title}</h3>
            <span
              className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide ${
                STATUS_STYLE[art.status] ?? STATUS_STYLE.draft
              }`}
            >
              {art.status}
            </span>
          </div>
          {art.description && (
            <p className="mt-0.5 line-clamp-2 text-sm text-white/55">{art.description}</p>
          )}
          {art.status === 'published' && (
            <Link
              href={`/art/${art.id}`}
              className="mt-1 inline-block text-xs text-accent hover:underline"
            >
              View public page →
            </Link>
          )}
        </div>
      </div>

      {canPublish && (
        <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-white/10 pt-4">
          <label className="flex items-center gap-2 text-sm text-white/80">
            <input
              type="checkbox"
              checked={isFree}
              onChange={(e) => setIsFree(e.target.checked)}
              className="h-4 w-4 accent-[var(--color-brand)]"
            />
            Free claim
          </label>

          {!isFree && (
            <div className="flex items-center gap-1.5">
              <input
                type="number"
                min="0"
                step="0.0000001"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="Price"
                disabled={!walletLinked}
                className="glass-input w-28 rounded-lg px-3 py-1.5 text-sm disabled:opacity-50"
              />
              <span className="text-sm text-white/60">XLM</span>
            </div>
          )}

          <div className="ml-auto flex items-center gap-2">
            <button
              onClick={remove}
              disabled={busy}
              className="rounded-lg border border-white/15 bg-white/5 px-3 py-1.5 text-sm text-red-300 hover:bg-white/10 disabled:opacity-50"
            >
              Delete
            </button>
            <button
              onClick={publish}
              disabled={busy || (!isFree && (priceInvalid || !walletLinked))}
              className="btn-brand rounded-lg px-4 py-1.5 text-sm font-semibold"
            >
              {busy
                ? 'Working…'
                : art.status === 'published'
                  ? 'Update listing'
                  : 'Publish'}
            </button>
          </div>
        </div>
      )}

      {!isFree && !walletLinked && canPublish && (
        <p className="mt-2 text-xs text-amber-200/80">
          Link a wallet on your{' '}
          <Link href="/profile" className="underline">
            dashboard
          </Link>{' '}
          to sell for XLM (free claims are fine).
        </p>
      )}
      {err && <p className="mt-2 text-sm text-red-300">{err}</p>}
    </div>
  );
}
