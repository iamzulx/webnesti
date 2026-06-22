/**
 * Simple in-memory response cache with TTL and tag-based invalidation.
 * Used for caching expensive DB queries like model lists.
 */
import { logger } from "./logger.js";

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
  tags: string[];
}

const cache = new Map<string, CacheEntry<unknown>>();

// Sweep interval
let sweepTimer: ReturnType<typeof setTimeout> | null = null;
function startSweep() {
  if (sweepTimer) return;
  sweepTimer = setInterval(() => {
    const now = Date.now();
    let swept = 0;
    for (const [key, entry] of cache.entries()) {
      if (entry.expiresAt < now) { cache.delete(key); swept++; }
    }
    if (swept > 0) {
      logger.debug("cache swept expired entries", { count: swept });
    }
  }, 60_000).unref();
}

export function getCache<T>(key: string): T | undefined {
  const entry = cache.get(key) as CacheEntry<T> | undefined;
  if (!entry) return undefined;
  if (entry.expiresAt < Date.now()) { cache.delete(key); return undefined; }
  return entry.value;
}

export function setCache<T>(key: string, value: T, ttlMs: number, tags: string[] = []): void {
  cache.set(key, { value, expiresAt: Date.now() + ttlMs, tags });
  startSweep();
}

export function invalidateByTag(tag: string): number {
  let count = 0;
  for (const [key, entry] of cache.entries()) {
    if (entry.tags.includes(tag)) { cache.delete(key); count++; }
  }
  return count;
}

export function cacheStats(): { size: number; keys: string[] } {
  return { size: cache.size, keys: [...cache.keys()] };
}

export function clearCache(): void {
  cache.clear();
}
