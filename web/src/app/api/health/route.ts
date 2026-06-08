import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { kvSet, kvGet } from '@/lib/store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// GET /api/health — quick liveness + dependency check (DB + KV store).
export async function GET() {
  const checks = { db: false, store: false };

  try {
    await prisma.$queryRaw`SELECT 1`;
    checks.db = true;
  } catch {
    /* db down */
  }

  try {
    await kvSet('health:ping', 'pong', 5);
    checks.store = (await kvGet('health:ping')) === 'pong';
  } catch {
    /* store down */
  }

  const ok = checks.db && checks.store;
  return NextResponse.json({ ok, checks }, { status: ok ? 200 : 503 });
}
