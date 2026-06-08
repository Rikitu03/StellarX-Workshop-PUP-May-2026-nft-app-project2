import { NextResponse } from 'next/server';

/** Consistent JSON error response. */
export function apiError(message: string, status: number, extra?: unknown) {
  return NextResponse.json({ error: message, ...(extra ? { details: extra } : {}) }, { status });
}

/** Parse a JSON request body, returning null if it isn't valid JSON. */
export async function readJson(req: Request): Promise<unknown | null> {
  try {
    return await req.json();
  } catch {
    return null;
  }
}

/** Strip sensitive fields before sending a user to the client. */
export function publicUser(user: {
  id: string;
  email: string;
  name: string | null;
  avatarUrl: string | null;
  walletAddress: string | null;
  createdAt: Date;
}) {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    avatarUrl: user.avatarUrl,
    walletAddress: user.walletAddress,
    createdAt: user.createdAt,
  };
}
