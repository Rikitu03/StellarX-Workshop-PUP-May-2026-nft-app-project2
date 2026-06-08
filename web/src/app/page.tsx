'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { fetchMe, type PublicUser } from '@/lib/authClient';
import { fetchPublic, type Artwork } from '@/lib/artworkClient';
import ArtworkCard from '@/components/ArtworkCard';

// NFT app landing page (Phase 3.1/3.3). The Stellar wallet/Soroban demo lives at
// /wallet; the featured grid below is the live marketplace of published works.
export default function Home() {
  const [user, setUser] = useState<PublicUser | null>(null);
  const [featured, setFeatured] = useState<Artwork[]>([]);
  const [loadingArt, setLoadingArt] = useState(true);

  useEffect(() => {
    fetchMe()
      .then(setUser)
      .catch(() => {});
    fetchPublic(8)
      .then((r) => setFeatured(r.artworks))
      .catch(() => {})
      .finally(() => setLoadingArt(false));
  }, []);

  return (
    <main className="app-gradient relative min-h-screen overflow-hidden">
      {/* Floating blurred orbs for depth */}
      <div className="pointer-events-none absolute inset-0 -z-0">
        <div className="animate-float absolute left-[10%] top-[15%] h-64 w-64 rounded-full bg-brand/30 blur-3xl" />
        <div
          className="animate-float absolute right-[12%] top-[30%] h-72 w-72 rounded-full bg-accent/25 blur-3xl"
          style={{ animationDelay: '1.5s' }}
        />
      </div>

      <div className="relative z-10 mx-auto max-w-5xl px-6">
        {/* Nav */}
        <nav className="flex items-center justify-between py-6">
          <span className="text-lg font-bold tracking-tight text-white">
            StellarX<span className="text-accent"> NFT</span>
          </span>
          <div className="flex items-center gap-5 text-sm">
            <Link href="/wallet" className="text-white/70 hover:text-white">
              Wallet
            </Link>
            {user ? (
              <Link
                href="/profile"
                className="rounded-lg bg-white/10 px-4 py-1.5 font-medium text-white hover:bg-white/15"
              >
                {user.name ?? 'Profile'}
              </Link>
            ) : (
              <>
                <Link href="/login" className="text-white/70 hover:text-white">
                  Log in
                </Link>
                <Link
                  href="/signup"
                  className="btn-brand rounded-lg px-4 py-1.5 font-medium"
                >
                  Sign up
                </Link>
              </>
            )}
          </div>
        </nav>

        {/* Hero */}
        <section className="flex flex-col items-center pt-20 pb-16 text-center sm:pt-28">
          <span className="animate-fade-up mb-5 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs font-medium text-white/70">
            <span className="h-1.5 w-1.5 rounded-full bg-accent" />
            Powered by Stellar · testnet
          </span>
          <h1
            className="animate-fade-up max-w-3xl text-balance text-4xl font-bold leading-tight tracking-tight text-white sm:text-6xl"
            style={{ animationDelay: '0.05s' }}
          >
            Mint &amp; Share Your Digital Art,{' '}
            <span className="bg-gradient-to-r from-brand to-accent bg-clip-text text-transparent">
              Free or Priced
            </span>
          </h1>
          <p
            className="animate-fade-up mt-5 max-w-xl text-pretty text-base text-white/60 sm:text-lg"
            style={{ animationDelay: '0.1s' }}
          >
            Upload your work, let it process in the background, and publish it to
            the marketplace — as a fixed-price drop or a free claim, minted on
            Stellar.
          </p>
          <div
            className="animate-fade-up mt-9 flex flex-wrap items-center justify-center gap-3"
            style={{ animationDelay: '0.15s' }}
          >
            <Link
              href={user ? '/studio' : '/signup'}
              className="btn-brand rounded-xl px-6 py-3 text-sm font-semibold"
            >
              {user ? 'Open Studio' : 'Get Started'}
            </Link>
            <a
              href="#featured"
              className="rounded-xl border border-white/15 bg-white/5 px-6 py-3 text-sm font-semibold text-white hover:bg-white/10"
            >
              Browse Collection
            </a>
          </div>
        </section>

        {/* How it works */}
        <section className="grid gap-4 pb-16 sm:grid-cols-3">
          {[
            {
              step: '01',
              title: 'Upload',
              body: 'Drop in your artwork and add a title, description, and tags.',
            },
            {
              step: '02',
              title: 'Process',
              body: 'We resize and prep your image in the background, then mark it ready.',
            },
            {
              step: '03',
              title: 'Publish',
              body: 'List it for a fixed price or as a free claim — minted on Stellar.',
            },
          ].map((c, i) => (
            <div
              key={c.step}
              className="animate-fade-up glass-card rounded-2xl p-6"
              style={{ animationDelay: `${0.2 + i * 0.07}s` }}
            >
              <div className="mb-3 font-mono text-sm text-accent">{c.step}</div>
              <h3 className="text-lg font-semibold text-white">{c.title}</h3>
              <p className="mt-1.5 text-sm text-white/60">{c.body}</p>
            </div>
          ))}
        </section>

        {/* Featured — live marketplace of published artworks */}
        <section id="featured" className="scroll-mt-8 pb-20">
          <div className="mb-5 flex items-end justify-between">
            <h2 className="text-xl font-semibold text-white">Featured artworks</h2>
            {featured.length > 0 && (
              <Link href={user ? '/studio' : '/signup'} className="text-sm text-accent hover:underline">
                {user ? 'Add yours →' : 'Start selling →'}
              </Link>
            )}
          </div>

          {loadingArt ? (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="glass-card aspect-[3/4] animate-pulse rounded-2xl" />
              ))}
            </div>
          ) : featured.length === 0 ? (
            <div className="glass-card rounded-2xl px-6 py-12 text-center">
              <p className="text-sm text-white/55">
                No artworks published yet.{' '}
                <Link href={user ? '/studio' : '/signup'} className="text-accent hover:underline">
                  {user ? 'Be the first to publish →' : 'Create an account to publish →'}
                </Link>
              </p>
            </div>
          ) : (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {featured.map((art) => (
                <ArtworkCard key={art.id} art={art} />
              ))}
            </div>
          )}
        </section>

        <footer className="border-t border-white/10 py-8 text-center text-xs text-white/40">
          Built for the StellarX PH workshop @ PUP QC · prototype
        </footer>
      </div>
    </main>
  );
}
