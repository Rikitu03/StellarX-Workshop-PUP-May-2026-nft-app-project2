'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  fetchMe,
  logout,
  linkWallet,
  unlinkWallet,
  type PublicUser,
} from '@/lib/authClient';

const shortAddr = (a: string) => `${a.slice(0, 6)}…${a.slice(-6)}`;
// Stellar public key: 'G' + 55 base32 chars (A–Z, 2–7).
const STELLAR_RE = /^G[A-Z2-7]{55}$/;

export default function ProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState<PublicUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [walletError, setWalletError] = useState<string | null>(null);
  const [addressInput, setAddressInput] = useState('');

  useEffect(() => {
    fetchMe()
      .then((u) => {
        if (!u) {
          router.replace('/login');
          return;
        }
        setUser(u);
        setLoading(false);
      })
      .catch(() => router.replace('/login'));
  }, [router]);

  async function onLogout() {
    await logout();
    router.replace('/login');
    router.refresh();
  }

  async function onLink(e: React.FormEvent) {
    e.preventDefault();
    const address = addressInput.trim();
    if (!STELLAR_RE.test(address)) {
      setWalletError('That doesn’t look like a Stellar address (starts with G, 56 chars).');
      return;
    }
    setBusy(true);
    setWalletError(null);
    try {
      const updated = await linkWallet(address);
      setUser(updated);
      setAddressInput('');
    } catch (e) {
      setWalletError(e instanceof Error ? e.message : 'Could not link wallet');
    } finally {
      setBusy(false);
    }
  }

  async function onUnlink() {
    setBusy(true);
    setWalletError(null);
    try {
      setUser(await unlinkWallet());
    } catch (e) {
      setWalletError(e instanceof Error ? e.message : 'Could not unlink wallet');
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <main className="app-gradient flex min-h-screen items-center justify-center text-white/60">
        Loading…
      </main>
    );
  }
  if (!user) return null;

  const initial = (user.name ?? user.email).charAt(0).toUpperCase();
  const linked = user.walletAddress;

  return (
    <main className="app-gradient min-h-screen px-4 py-12">
      <div className="mx-auto max-w-xl space-y-5">
        {/* Identity */}
        <div className="glass-card rounded-2xl p-7">
          <div className="flex items-center justify-between gap-4">
            <div className="flex min-w-0 items-center gap-4">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand to-accent text-xl font-bold text-white">
                {initial}
              </div>
              <div className="min-w-0">
                <h1 className="truncate text-lg font-semibold text-white">
                  {user.name ?? 'Unnamed artist'}
                </h1>
                <p className="truncate text-sm text-white/60">{user.email}</p>
              </div>
            </div>
            <button
              onClick={onLogout}
              className="shrink-0 rounded-lg border border-white/15 bg-white/5 px-3 py-1.5 text-sm text-white hover:bg-white/10"
            >
              Log out
            </button>
          </div>

          <dl className="mt-6 space-y-3 text-sm">
            <Row label="User ID" value={user.id} mono />
            <Row label="Joined" value={new Date(user.createdAt).toLocaleString()} />
          </dl>
        </div>

        {/* Wallet */}
        <div className="glass-card rounded-2xl p-7">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-white">Stellar wallet</h2>
            <span
              className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                linked ? 'bg-emerald-400/15 text-emerald-300' : 'bg-white/10 text-white/60'
              }`}
            >
              {linked ? 'Linked' : 'Not linked'}
            </span>
          </div>
          <p className="mt-1 text-sm text-white/55">
            Enter the Stellar address that will receive payments for your NFTs.
          </p>

          <div className="mt-5">
            {linked ? (
              <div className="flex flex-wrap items-center justify-between gap-3">
                <a
                  href={`https://stellar.expert/explorer/testnet/account/${linked}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-mono text-sm text-white/90 hover:text-accent"
                  title={linked}
                >
                  {shortAddr(linked)} ↗
                </a>
                <button
                  onClick={onUnlink}
                  disabled={busy}
                  className="rounded-lg border border-white/15 bg-white/5 px-3 py-1.5 text-sm text-red-300 hover:bg-white/10 disabled:opacity-50"
                >
                  {busy ? 'Working…' : 'Unlink'}
                </button>
              </div>
            ) : (
              <form onSubmit={onLink} className="space-y-3">
                <input
                  value={addressInput}
                  onChange={(e) => setAddressInput(e.target.value)}
                  spellCheck={false}
                  autoComplete="off"
                  placeholder="G… (your Stellar public key)"
                  className="glass-input w-full rounded-lg px-3 py-2.5 font-mono text-sm"
                />
                <button
                  type="submit"
                  disabled={busy || addressInput.trim().length === 0}
                  className="btn-brand w-full rounded-lg py-2.5 text-sm font-semibold"
                >
                  {busy ? 'Linking…' : 'Link wallet'}
                </button>
                <p className="text-center text-xs text-white/40">
                  Paste your public key from Freighter (or any Stellar wallet) on Test Net.
                </p>
              </form>
            )}

            {walletError && <p className="mt-3 text-sm text-red-300">{walletError}</p>}
          </div>
        </div>

        {/* Next steps */}
        <div className="grid gap-4 sm:grid-cols-2">
          <ActionTile
            href="/studio"
            title="Upload & sell art"
            body="Create a draft, upload an image, publish for XLM or free."
            cta="Open Studio"
          />
          <ActionTile
            href="/#featured"
            title="Browse marketplace"
            body="Discover published drops and free claims."
            cta="Explore"
          />
        </div>

        <p className="text-center text-xs text-white/40">
          Phase 1 prototype · profile served from /api/users/me (Redis-cached) ·{' '}
          <Link href="/wallet" className="hover:text-white/70">
            full wallet demo
          </Link>
        </p>
      </div>
    </main>
  );
}

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-white/10 pb-2">
      <dt className="text-white/50">{label}</dt>
      <dd className={`truncate text-right text-white/90 ${mono ? 'font-mono text-xs' : ''}`}>
        {value}
      </dd>
    </div>
  );
}

function ActionTile({
  href,
  title,
  body,
  cta,
}: {
  href: string;
  title: string;
  body: string;
  cta: string;
}) {
  return (
    <Link
      href={href}
      className="glass-card rounded-2xl p-5 transition-transform hover:-translate-y-1"
    >
      <h3 className="font-semibold text-white">{title}</h3>
      <p className="mt-1 text-sm text-white/55">{body}</p>
      <p className="mt-3 text-xs font-medium text-accent">{cta} →</p>
    </Link>
  );
}
