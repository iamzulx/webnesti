import { Context, Next } from "hono";
import { RateLimitError } from "../errors.js";

// Sliding window rate limiter using token bucket algorithm
interface Bucket {
  tokens: number;
  lastRefill: number;
  limit: number;      // max tokens (requests per window)
  refillRate: number;  // tokens per ms
}

const buckets = new Map<string, Bucket>();

function getBucket(keyId: string, limit: number): Bucket {
  let b = buckets.get(keyId);
  if (!b) {
    b = { tokens: limit, lastRefill: Date.now(), limit, refillRate: limit / 60_000 }; // per minute
    buckets.set(keyId, b);
  }
  return b;
}

function consumeToken(b: Bucket): boolean {
  const now = Date.now();
  // Refill tokens based on elapsed time
  const elapsed = now - b.lastRefill;
  b.tokens = Math.min(b.limit, b.tokens + elapsed * b.refillRate);
  b.lastRefill = now;

  if (b.tokens >= 1) {
    b.tokens -= 1;
    return true;
  }
  return false;
}

function getTimeUntilReset(b: Bucket): number {
  if (b.tokens >= 1) return 0;
  return Math.ceil((1 - b.tokens) / b.refillRate); // ms until 1 token available
}

export async function rateLimitMiddleware(c: Context, next: Next) {
  const apiKey = c.get("apiKey");
  if (!apiKey) return next();

  const key = apiKey.id;
  const limit = apiKey.rate_limit || 60;
  const bucket = getBucket(key, limit);

  const allowed = consumeToken(bucket);

  c.header("X-RateLimit-Limit", String(limit));
  c.header("X-RateLimit-Remaining", String(Math.floor(bucket.tokens)));
  c.header("X-RateLimit-Reset", String(Math.ceil(getTimeUntilReset(bucket) / 1000)));
  c.header("X-RateLimit-Policy", "sliding-window");

  if (!allowed) {
    c.header("Retry-After", String(Math.ceil(getTimeUntilReset(bucket) / 1000)));
    throw new RateLimitError();
  }

  await next();
}

// Cleanup old buckets (call periodically)
export function cleanupBuckets(maxAgeMs: number = 300_000) { // 5 minutes
  const now = Date.now();
  for (const [key, b] of Array.from(buckets.entries())) {
    if (now - b.lastRefill > maxAgeMs) buckets.delete(key);
  }
}
