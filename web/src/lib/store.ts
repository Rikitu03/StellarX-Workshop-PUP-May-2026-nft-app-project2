// A tiny Redis-shaped key/value store.
//
// PROTOTYPE NOTE: by default this is an in-memory Map so the app runs with no
// Redis server. If REDIS_URL is set, it transparently uses real Redis (ioredis)
// instead — same async API either way. The refresh-token store and the cache
// layer both sit on top of this, so swapping to real Redis is a config change,
// not a code change.

type Entry = { value: string; expiresAt: number | null };

interface KvBackend {
  get(key: string): Promise<string | null>;
  set(key: string, value: string, ttlSeconds?: number): Promise<void>;
  del(key: string): Promise<void>;
  keys(prefix: string): Promise<string[]>;
}

// --- In-memory backend (default) ---
class MemoryBackend implements KvBackend {
  private map = new Map<string, Entry>();

  private alive(key: string): Entry | null {
    const e = this.map.get(key);
    if (!e) return null;
    if (e.expiresAt !== null && e.expiresAt <= Date.now()) {
      this.map.delete(key);
      return null;
    }
    return e;
  }

  async get(key: string) {
    return this.alive(key)?.value ?? null;
  }

  async set(key: string, value: string, ttlSeconds?: number) {
    this.map.set(key, {
      value,
      expiresAt: ttlSeconds ? Date.now() + ttlSeconds * 1000 : null,
    });
  }

  async del(key: string) {
    this.map.delete(key);
  }

  async keys(prefix: string) {
    const out: string[] = [];
    for (const key of this.map.keys()) {
      if (key.startsWith(prefix) && this.alive(key)) out.push(key);
    }
    return out;
  }
}

// --- ioredis backend (when REDIS_URL is set) ---
class RedisBackend implements KvBackend {
  // `client` is an ioredis instance; typed loosely to avoid importing ioredis
  // types at module scope (it's only loaded when REDIS_URL is present).
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  constructor(private client: any) {}

  async get(key: string) {
    return this.client.get(key);
  }

  async set(key: string, value: string, ttlSeconds?: number) {
    if (ttlSeconds) await this.client.set(key, value, 'EX', ttlSeconds);
    else await this.client.set(key, value);
  }

  async del(key: string) {
    await this.client.del(key);
  }

  async keys(prefix: string) {
    return this.client.keys(`${prefix}*`);
  }
}

// Cache the backend on globalThis so Next.js hot reload doesn't create a new
// Map (and lose all sessions) on every edit.
const globalForStore = globalThis as unknown as { kvBackend?: KvBackend };

function createBackend(): KvBackend {
  const url = process.env.REDIS_URL;
  if (url && url.trim().length > 0) {
    try {
      // Lazy require so the prototype doesn't need ioredis loaded unless used.
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const Redis = require('ioredis');
      console.log('[store] Using Redis backend');
      return new RedisBackend(new Redis(url));
    } catch (err) {
      console.warn('[store] REDIS_URL set but ioredis failed to load — falling back to in-memory.', err);
    }
  }
  console.log('[store] Using in-memory backend');
  return new MemoryBackend();
}

const backend: KvBackend = globalForStore.kvBackend ?? createBackend();
if (process.env.NODE_ENV !== 'production') globalForStore.kvBackend = backend;

export const kvGet = (key: string) => backend.get(key);
export const kvSet = (key: string, value: string, ttlSeconds?: number) =>
  backend.set(key, value, ttlSeconds);
export const kvDel = (key: string) => backend.del(key);
export const kvKeys = (prefix: string) => backend.keys(prefix);
