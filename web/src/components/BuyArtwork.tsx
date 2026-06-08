'use client';
import { useState } from 'react';
import { useWallet } from '@/hooks/useWallet';
import { buildPaymentXDR, submitSignedXDR, pollTransaction } from '@/lib/payment';
import { NETWORK_PASSPHRASE } from '@/lib/stellar';
import type { Artwork } from '@/lib/artworkClient';

type Status =
  | 'idle'
  | 'building'
  | 'signing'
  | 'submitting'
  | 'polling'
  | 'success'
  | 'error';

const BUSY: Status[] = ['building', 'signing', 'submitting', 'polling'];
const LABEL: Record<Status, string> = {
  idle: 'building',
  building: 'Building transaction…',
  signing: 'Confirm in Freighter…',
  submitting: 'Submitting…',
  polling: 'Confirming on-chain…',
  success: 'done',
  error: 'retry',
};

/** Buy-with-XLM (or free claim) for a published artwork, paid to the creator. */
export default function BuyArtwork({ art }: { art: Artwork }) {
  const wallet = useWallet();
  const [status, setStatus] = useState<Status>('idle');
  const [txHash, setTxHash] = useState('');
  const [error, setError] = useState('');

  const seller = art.creator?.walletAddress ?? null;
  const buyer = wallet.publicKey;
  const busy = BUSY.includes(status);

  // --- Free claim (prototype: no on-chain mint yet — that's Phase 4) ---
  if (art.isFree) {
    if (status === 'success') {
      return <Done>🎉 Claimed! This free piece is yours.</Done>;
    }
    return (
      <button
        onClick={() => setStatus('success')}
        className="btn-brand w-full rounded-xl py-3 text-sm font-semibold"
      >
        Claim for free
      </button>
    );
  }

  // --- Priced: pay the creator in XLM via Freighter ---
  if (!seller) {
    return <Note>The seller hasn’t linked a payout wallet yet.</Note>;
  }

  if (status === 'success') {
    return (
      <Done>
        ✅ Paid {art.price} XLM.{' '}
        <a
          href={`https://stellar.expert/explorer/testnet/tx/${txHash}`}
          target="_blank"
          rel="noopener noreferrer"
          className="underline hover:text-white"
        >
          View transaction →
        </a>
      </Done>
    );
  }

  if (!buyer) {
    return (
      <div>
        <button
          onClick={() => wallet.connect()}
          disabled={wallet.connecting}
          className="btn-brand w-full rounded-xl py-3 text-sm font-semibold"
        >
          {wallet.connecting ? 'Connecting…' : `Connect Freighter to buy`}
        </button>
        {wallet.error && <p className="mt-2 text-sm text-red-300">{wallet.error}</p>}
        <p className="mt-2 text-center text-xs text-white/40">
          Freighter must be on <strong>Test Net</strong>.
        </p>
      </div>
    );
  }

  if (buyer === seller) {
    return <Note>This is your own artwork — you can’t buy it.</Note>;
  }

  async function buy() {
    setStatus('building');
    setError('');
    setTxHash('');
    try {
      const xdr = await buildPaymentXDR(buyer!, seller!, String(art.price), 'XLM');

      setStatus('signing');
      const freighter = await import('@stellar/freighter-api');
      const signed = await freighter.signTransaction(xdr, {
        networkPassphrase: NETWORK_PASSPHRASE,
        address: buyer!,
      });
      if (signed.error) {
        throw new Error(
          typeof signed.error === 'string' ? signed.error : 'Signing was rejected',
        );
      }

      setStatus('submitting');
      const hash = await submitSignedXDR(signed.signedTxXdr);
      setTxHash(hash);

      setStatus('polling');
      await pollTransaction(hash);
      setStatus('success');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Payment failed');
      setStatus('error');
    }
  }

  return (
    <div>
      <button
        onClick={buy}
        disabled={busy}
        className="btn-brand w-full rounded-xl py-3 text-sm font-semibold"
      >
        {busy ? LABEL[status] : `Buy for ${art.price} XLM`}
      </button>
      <p className="mt-2 text-center text-xs text-white/40">
        Paying from {buyer.slice(0, 6)}…{buyer.slice(-6)}
      </p>
      {error && <p className="mt-2 text-sm text-red-300">{error}</p>}
    </div>
  );
}

function Done({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-emerald-400/20 bg-emerald-400/10 px-4 py-3 text-sm text-emerald-200">
      {children}
    </div>
  );
}
function Note({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-center text-sm text-white/60">
      {children}
    </div>
  );
}
