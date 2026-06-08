// Redis caching layer (Phase 1.4). Serializes API responses as JSON in the KV
// store with a TTL, plus invalidation helpers. Phases 2/3 (marketplace lists,
// etc.) build on these.
import { kvGet, kvSet, kvDel, kvKeys } from './store';

/** Cache a serializable value under `key` for `ttlSeconds`. */
export async function cacheResponse(
  key: string,
  data: unknown,
  ttlSeconds: number,
): Promise<void> {
  await kvSet(key, JSON.stringify(data), ttlSeconds);
}

/** Read a cached value, or null if absent/expired. */
export async function getCached<T>(key: string): Promise<T | null> {
  const raw = await kvGet(key);
  if (raw === null) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    // Corrupt entry — drop it so the next read repopulates.
    await kvDel(key);
    return null;
  }
}

/**
 * Get from cache, or run `loader`, cache its result, and return it.
 * The convenient one-call pattern for read endpoints.
 */
export async function cached<T>(
  key: string,
  ttlSeconds: number,
  loader: () => Promise<T>,
): Promise<T> {
  const hit = await getCached<T>(key);
  if (hit !== null) return hit;
  const value = await loader();
  await cacheResponse(key, value, ttlSeconds);
  return value;
}

/** Invalidate a single cache key. */
export async function invalidate(key: string): Promise<void> {
  await kvDel(key);
}

/** Invalidate every key starting with `prefix` (e.g. "artworks:public:"). */
export async function invalidateByPrefix(prefix: string): Promise<void> {
  const keys = await kvKeys(prefix);
  await Promise.all(keys.map((k) => kvDel(k)));
}
