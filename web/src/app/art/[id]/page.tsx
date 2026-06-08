'use client';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { fetchArtwork, type Artwork } from '@/lib/artworkClient';
import BuyArtwork from '@/components/BuyArtwork';

export default function ArtworkDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [art, setArt] = useState<Artwork | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchArtwork(id)
      .then(setArt)
      .catch((e) => setError(e instanceof Error ? e.message : 'Not found'));
  }, [id]);

  if (error) {
    return (
      <Shell>
        <div className="glass-card rounded-2xl px-6 py-16 text-center text-white/60">
          {error}
          <div className="mt-4">
            <Link href="/" className="text-accent hover:underline">
              ← Back to marketplace
            </Link>
          </div>
        </div>
      </Shell>
    );
  }

  if (!art) {
    return (
      <Shell>
        <div className="py-20 text-center text-white/50">Loading…</div>
      </Shell>
    );
  }

  const img = art.images?.display ?? art.images?.original ?? art.images?.thumb;

  return (
    <Shell>
      <div className="grid gap-8 md:grid-cols-2">
        <div className="glass-card overflow-hidden rounded-2xl">
          <div className="aspect-square w-full bg-white/5">
            {img ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={img} alt={art.title} className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full items-center justify-center text-white/30">
                No image
              </div>
            )}
          </div>
        </div>

        <div>
          <h1 className="text-3xl font-bold text-white">{art.title}</h1>
          <p className="mt-1 text-sm text-white/55">
            by {art.creator?.name ?? 'Anonymous'}
          </p>

          {art.description && (
            <p className="mt-5 whitespace-pre-wrap text-sm leading-relaxed text-white/70">
              {art.description}
            </p>
          )}

          <div className="mt-6 glass-card rounded-2xl p-5">
            <div className="mb-4 flex items-baseline justify-between">
              <span className="text-sm text-white/55">Price</span>
              <span className="text-2xl font-bold text-white">
                {art.isFree ? 'Free' : `${art.price} XLM`}
              </span>
            </div>
            <BuyArtwork art={art} />
          </div>

          {art.creator?.walletAddress && !art.isFree && (
            <p className="mt-3 break-all text-xs text-white/35">
              Paid to creator wallet {art.creator.walletAddress}
            </p>
          )}
        </div>
      </div>
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main className="app-gradient min-h-screen px-4 py-10">
      <div className="mx-auto max-w-4xl">
        <nav className="mb-6 text-sm">
          <Link href="/" className="text-white/60 hover:text-white">
            ← Marketplace
          </Link>
        </nav>
        {children}
      </div>
    </main>
  );
}
