// Client-side helpers for the auth API. Same-origin requests, so the httpOnly
// cookies set by the API are sent automatically — we never touch tokens in JS.

export type PublicUser = {
  id: string;
  email: string;
  name: string | null;
  avatarUrl: string | null;
  walletAddress: string | null;
  createdAt: string;
};

async function parseError(res: Response): Promise<string> {
  try {
    const data = await res.json();
    return data.error ?? `Request failed (${res.status})`;
  } catch {
    return `Request failed (${res.status})`;
  }
}

export async function register(input: {
  email: string;
  password: string;
  name?: string;
}): Promise<void> {
  const res = await fetch('/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new Error(await parseError(res));
}

export async function login(input: {
  email: string;
  password: string;
}): Promise<PublicUser> {
  const res = await fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new Error(await parseError(res));
  return (await res.json()).user as PublicUser;
}

export async function logout(): Promise<void> {
  await fetch('/api/auth/logout', { method: 'POST' });
}

export async function fetchMe(): Promise<PublicUser | null> {
  const res = await fetch('/api/users/me', { cache: 'no-store' });
  if (res.status === 401) return null;
  if (!res.ok) throw new Error(await parseError(res));
  return (await res.json()).user as PublicUser;
}

async function updateProfile(body: {
  walletAddress: string | null;
}): Promise<PublicUser> {
  const res = await fetch('/api/users/me', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(await parseError(res));
  return (await res.json()).user as PublicUser;
}

/** Link a Stellar wallet address to the current account. */
export const linkWallet = (walletAddress: string) =>
  updateProfile({ walletAddress });

/** Remove the linked wallet from the current account. */
export const unlinkWallet = () => updateProfile({ walletAddress: null });
