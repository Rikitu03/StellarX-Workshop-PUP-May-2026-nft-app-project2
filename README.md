# StellarX NFT Marketplace

A digital-art **NFT marketplace prototype** built for the **StellarX PH workshop
@ PUP QC**, running on Stellar **testnet**. Artists sign up, upload their work,
and publish it as a **fixed XLM price** or a **free claim**; everyone else browses
the marketplace and **buys with Freighter** — a real XLM payment to the creator,
confirmed on-chain.

It's built on the StellarX workshop scaffold, so the original **Stellar payments +
Soroban** demo still ships alongside it (at `/wallet`).

It covers an end-to-end product flow:

- **Accounts & auth** — register / login with JWT (httpOnly cookies), profiles, and
  a manually-linked Stellar payout wallet.
- **Create & process** — upload art, auto-resized into display/thumbnail variants.
- **Marketplace** — publish for XLM or free, browse a cached featured grid, view a
  detail page, and **buy with XLM via Freighter**.

```
.
├── web/                       # Next.js 16 + TypeScript + Tailwind — the app
│   ├── prisma/schema.prisma   # User + Artwork models (SQLite for the prototype)
│   ├── public/uploads/        # uploaded art (local storage, git-ignored)
│   └── src/
│       ├── app/               # pages + /api routes (auth, users, artworks)
│       ├── components/        # ArtworkCard, BuyArtwork, AuthShell, wallet UI…
│       └── lib/               # auth, db, store/cache, images, payment, stellar
├── contracts/savings-goal/    # Rust Soroban contract (powers the /wallet demo)
├── scripts/                   # deploy.ps1 (Windows) / deploy.sh
└── CLAUDE.md                  # stack notes + Stellar gotchas (read this!)
```

## What's built

| Area | Status |
|---|---|
| **Phase 1** — auth (register/login/refresh/logout), profiles, wallet linking, Redis-style cache | ✅ Done |
| **Phase 2** — artwork drafts, image upload + processing (resize), draft management | ✅ Done |
| **Phase 3** — publish (price/free), cached marketplace API, landing + detail, **buy with XLM** | ✅ Done |
| **Phase 4** — mint real NFTs on a Soroban contract (token ownership, not just payment) | 🚧 Planned |
| **Phase 5** — rate limiting, monitoring, tests, production hardening | 🚧 Planned |

> **Prototype, by design.** To stay zero-setup it uses **SQLite** (not Postgres),
> an **in-memory KV store** (not Redis), and **local disk** uploads (not S3/IPFS).
> Each is a drop-in swap — see [Prototype substitutions](#prototype-substitutions).
> Buying currently sends **XLM to the creator**; on-chain NFT minting is Phase 4.

## How it uses Stellar

Stellar is the payment rail, not decoration:

- **Buying art = a real testnet XLM payment** from the buyer to the creator's linked
  wallet, built/signed/submitted/polled via Freighter + `@stellar/stellar-sdk`
  (`web/src/lib/payment.ts`, `web/src/components/BuyArtwork.tsx`).
- **Creator payout wallets** are Stellar addresses linked to each account.
- The original **Soroban Savings-Goal** contract + full wallet demo live at `/wallet`,
  and are the foundation for Phase 4 minting.

## Prerequisites

From the [workshop setup checklist](https://stellar-pup-qc-may-2026-checklist.vercel.app/):

- **Node.js 20+** and **npm** — for the app.
- **Freighter** browser extension — create a wallet, switch it to **Test Net**.
  Fund it via Friendbot to buy/sell (you get ~10,000 test XLM).
- *(Optional)* **Rust** + `wasm32v1-none` + the **Stellar CLI** — only to deploy the
  Soroban contract behind the `/wallet` demo. The marketplace runs without them.

## 1. Run the app

```powershell
cd web
npm install          # installs deps + generates the Prisma client
npm run db:push      # creates the SQLite database (web/dev.db)
npm run dev
```

`web/.env` ships with working defaults (see `web/.env.example`). Open
<http://localhost:3000>.

### Try the full flow

1. **Sign up** (`/signup`) → you land on your **dashboard** (`/profile`).
2. **Link a wallet** — paste your Stellar **public key** (`G…`) on the dashboard.
   Needed to *sell* for XLM (free claims don't require it).
3. **Open Studio** (`/studio`) → add a title + image → **Create & upload**
   (the image is resized to display/thumbnail variants).
4. **Publish** — set a **price in XLM** or tick **Free claim**.
5. **Browse** — your piece appears in **Featured artworks** on the landing page,
   visible to everyone.
6. **Buy** — open a piece (`/art/[id]`) → **Buy for X XLM** → confirm in Freighter →
   the creator is paid on testnet, with a Stellar Expert link to the transaction.

## 2. Routes & API

**Pages**

| Route | Purpose |
|---|---|
| `/` | Landing + live featured marketplace grid |
| `/signup`, `/login` | Auth |
| `/profile` | Dashboard — identity + link/unlink Stellar wallet |
| `/studio` | Create, upload, manage, and publish your artworks |
| `/art/[id]` | Public artwork detail + buy/claim |
| `/wallet` | Original Stellar payments + Soroban demo |

**API** (`web/src/app/api/`)

| Endpoint | Purpose |
|---|---|
| `POST /api/auth/{register,login,refresh,logout}` | JWT auth |
| `GET·PATCH /api/users/me` | Profile + link/unlink wallet |
| `GET·POST /api/artworks` | List own / create draft |
| `POST /api/artworks/:id/upload` | Multipart image upload + processing |
| `GET·PUT·DELETE /api/artworks/:id` | Read / update / delete |
| `PUT /api/artworks/:id/publish` | Publish for XLM or free |
| `GET /api/artworks/public` | Paginated marketplace list (cached 5 min) |
| `GET /api/health` | DB + store liveness check |

## 3. The Soroban contract (optional, for `/wallet`)

```powershell
# from the repo root
cargo test                 # contract unit tests (no network needed)
.\scripts\deploy.ps1       # deploy to testnet + wire NEXT_PUBLIC_CONTRACT_ID
```

The deploy script creates+funds a testnet identity, builds, deploys, runs `init`,
and writes `NEXT_PUBLIC_CONTRACT_ID` into `web/.env.local`. Restart the dev server
and the **Savings Goal** panel at `/wallet` goes live. See **CLAUDE.md** for the
contract API and Stellar gotchas.

## Prototype substitutions

Everything below is a one-step swap to "real" infra later:

| Prototype | Production swap |
|---|---|
| **SQLite** (`provider = "sqlite"`) | Change provider + `DATABASE_URL` to PostgreSQL |
| **In-memory KV** store | Set `REDIS_URL` → it uses ioredis automatically |
| **Local `public/uploads/`** + inline resize | S3/R2 signed URLs + a BullMQ worker |
| **Buy = XLM payment** | Mint/transfer a real NFT via a Soroban contract (Phase 4) |

Config lives in `web/.env` (`DATABASE_URL`, `JWT_*_SECRET`, token TTLs, `REDIS_URL`).

## Troubleshooting

- **Freighter "not detected"** — install it, reload, confirm it's unlocked and on **Test Net**.
- **Buy fails `op_no_destination`** — the creator's wallet isn't a funded testnet account; fund it via Friendbot.
- **Can't set a price when publishing** — link a wallet on your dashboard first (free claims work without one).
- **`tx_bad_auth`** — wrong network passphrase; the app uses `Networks.TESTNET`.
- **Logged out after restarting `npm run dev`** — refresh tokens live in the in-memory store; set `REDIS_URL` to persist sessions.
- **Images not showing** — uploads are written to `web/public/uploads/`; they persist across restarts but are git-ignored.

See **CLAUDE.md** for the full list of Stellar gotchas.
