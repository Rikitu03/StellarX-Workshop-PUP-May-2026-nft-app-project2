# StellarX NFT Marketplace

A digital-art marketplace where Filipino artists publish their work for a fixed
**XLM** price or a free claim, and buyers pay creators **directly with Freighter**
on Stellar testnet — no middleman, near-zero fees.

## Problem

Filipino digital artists and freelancers have few low-friction ways to get paid for
their work. Mainstream art/print platforms take large cuts, settle slowly, and often
require a credit card or bank account many creators don't have. NFT platforms on
Ethereum price small artists out with volatile, high gas fees. The result: a huge,
talented PH creative economy that struggles to monetize directly and globally.

Stellar fixes the economics — sub-cent fees and ~5-second settlement make it viable
to sell art for a few XLM and have the money land in the creator's wallet
immediately. This is a financial-inclusion story: a creator only needs a free
Stellar wallet to start earning, from anywhere.

## How It Works

1. **Sign up** and land on your dashboard.
2. **Link your Stellar wallet** — paste your public key (`G…`); this is where sales
   are paid out.
3. **Upload art** in the Studio — the image is processed into display/thumbnail
   sizes and marked ready.
4. **Publish** it for a fixed **XLM price** or as a **free claim**.
5. It appears in the public **marketplace** for anyone to browse.
6. A buyer opens the piece and clicks **Buy** — Freighter signs an XLM payment to
   the creator, confirmed on-chain with a link to Stellar Expert.

## How It Uses Stellar

Stellar is the payment rail, not decoration:

- **Buying = a real classic XLM payment** from buyer → creator, built, signed
  (Freighter), submitted, and polled to finality via `@stellar/stellar-sdk`
  (`web/src/lib/payment.ts`, `web/src/components/BuyArtwork.tsx`).
- **Creator payouts** are plain Stellar addresses linked to each account — no
  custodial wallet, artists hold their own keys.
- A **Soroban smart contract** (a Savings-Goal tracker) and the full wallet demo
  ship at `/wallet`, and are the foundation for planned on-chain NFT minting.

**Why Stellar:** fees are a fraction of a cent (vs. Ethereum gas that can exceed an
artwork's price), finality is seconds not minutes, and a free non-custodial wallet
is the only onboarding requirement — ideal for micro-priced art and PH creators.

## Track

**Open** — creator economy / financial inclusion for digital artists.

## Tech Stack

- **Framework:** Next.js 16 (App Router) + TypeScript + Tailwind CSS v4
- **Stellar SDK:** `@stellar/stellar-sdk` v15 · `@stellar/freighter-api` v6
- **Smart contract:** `soroban-sdk` 22 (Rust) — `contracts/savings-goal`
- **Network:** Stellar **testnet**
- **Backend:** Next.js API routes · Prisma ORM (SQLite) · JWT auth (`jose` + `bcryptjs`)
- **Media:** `sharp` image processing · local `public/uploads` storage
- **Caching/sessions:** in-memory KV store (swaps to Redis via `ioredis` if `REDIS_URL` is set)
- **Validation:** `zod`

> Prototype note: SQLite, the in-memory store, local uploads, and "buy = XLM
> payment" are deliberate prototype choices — each swaps cleanly to
> Postgres / Redis / S3 / on-chain minting later.

## Setup & Run

```bash
git clone <your-repo-url>
cd StellarX-Workshop-PUP-May-2026-nft-app-project2/web

npm install          # installs deps + generates the Prisma client
npm run db:push      # creates the SQLite database (web/dev.db)
npm run dev          # http://localhost:3000
```

`web/.env` ships with working defaults (template in `web/.env.example`):

```bash
# Database (SQLite for the prototype)
DATABASE_URL="file:./dev.db"

# Auth
JWT_ACCESS_SECRET="change-me"
JWT_REFRESH_SECRET="change-me"
ACCESS_TOKEN_TTL_SECONDS=900       # 15 min
REFRESH_TOKEN_TTL_SECONDS=604800   # 7 days

# Optional: set to use real Redis instead of the in-memory store
REDIS_URL=""

# Stellar (optional — sensible testnet defaults are built in)
NEXT_PUBLIC_SOROBAN_RPC="https://soroban-testnet.stellar.org"
NEXT_PUBLIC_HORIZON_URL="https://horizon-testnet.stellar.org"
NEXT_PUBLIC_CONTRACT_ID=""         # set after deploying the /wallet contract
```

**To buy or sell**, install **Freighter**, switch it to **Test Net**, and fund your
account with Friendbot (`https://friendbot.stellar.org?addr=YOUR_KEY`).

*(Optional)* deploy the Soroban contract behind `/wallet`:

```bash
cargo test            # contract unit tests
./scripts/deploy.sh   # Windows: .\scripts\deploy.ps1  → writes NEXT_PUBLIC_CONTRACT_ID
```

## Network Details

- **Network:** Stellar testnet
- **Network passphrase:** `Test SDF Network ; September 2015` (`Networks.TESTNET`)
- **Soroban RPC:** `https://soroban-testnet.stellar.org`
- **Horizon:** `https://horizon-testnet.stellar.org`
- **Explorer:** `https://stellar.expert/explorer/testnet`
- **Assets:** native **XLM** for payments (USDC testnet issuer
  `GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5` is available in the `/wallet` demo)
- **Contract IDs:** none by default — set `NEXT_PUBLIC_CONTRACT_ID` after deploying the Savings-Goal contract

## Team

- Jason Recto — @your-github-handle

## License

MIT — see [LICENSE](./LICENSE).
