import Link from 'next/link';
import type { Artwork } from '@/lib/artworkClient';

export function PriceTag({ art }: { art: Artwork }) {
  if (art.isFree) {
    return (
      <span className="shrink-0 rounded-full bg-emerald-400/15 px-2.5 py-1 text-xs font-semibold text-emerald-300">
        Free
      </span>
    );
  }
  return (
    <span className="shrink-0 rounded-full bg-white/10 px-2.5 py-1 text-xs font-semibold text-white">
      {art.price} XLM
    </span>
  );
}

/** Marketplace/featured card — links to the public detail page. */
export default function ArtworkCard({ art }: { art: Artwork }) {
  const img = art.images?.thumb ?? art.images?.display ?? art.images?.original;
  return (
    <Link
      href={`/art/${art.id}`}
      className="group glass-card block overflow-hidden rounded-2xl transition-transform hover:-translate-y-1"
    >
      <div className="aspect-square w-full overflow-hidden bg-white/5">
        {img ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={img}
            alt={art.title}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-white/30">
            No image
          </div>
        )}
      </div>
      <div className="flex items-center justify-between gap-3 p-4">
        <div className="min-w-0">
          <h3 className="truncate font-semibold text-white">{art.title}</h3>
          <p className="truncate text-xs text-white/50">
            by {art.creator?.name ?? 'Anonymous'}
          </p>
        </div>
        <PriceTag art={art} />
      </div>
    </Link>
  );
}
