/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Distributed rate limit.
 *
 * Primary: Upstash Redis (works across all Vercel instances).
 * Fallback: in-process Map when Upstash is not configured (local dev only).
 *
 * In production, missing/failed Upstash fails closed (rejects the request).
 */

import "server-only";

type Bucket = { count: number; resetAt: number };

const localBuckets = new Map<string, Bucket>();

function localRateLimit(
  key: string,
  limit: number,
  windowMs: number
): { ok: boolean; remaining: number; retryAfterSec: number } {
  const now = Date.now();
  let b = localBuckets.get(key);
  if (!b || now >= b.resetAt) {
    b = { count: 0, resetAt: now + windowMs };
    localBuckets.set(key, b);
  }
  b.count += 1;
  const remaining = Math.max(0, limit - b.count);
  if (b.count > limit) {
    return {
      ok: false,
      remaining: 0,
      retryAfterSec: Math.ceil((b.resetAt - now) / 1000),
    };
  }
  return { ok: true, remaining, retryAfterSec: 0 };
}

/** Drop expired local buckets to bound memory in long-lived processes. */
export function pruneRateLimits(): void {
  const now = Date.now();
  for (const [k, b] of localBuckets) {
    if (now >= b.resetAt) localBuckets.delete(k);
  }
}

function upstashConfigured(): boolean {
  return Boolean(
    process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
  );
}

function isProduction(): boolean {
  return process.env.NODE_ENV === "production";
}

/**
 * Sliding fixed-window rate limit.
 * Prefer Upstash when configured; otherwise local (dev only).
 * Production without Upstash → fail closed.
 */
export async function rateLimitAsync(
  key: string,
  limit: number,
  windowMs: number
): Promise<{ ok: boolean; remaining: number; retryAfterSec: number }> {
  if (!upstashConfigured()) {
    if (isProduction()) {
      console.error(
        "[rateLimit] Upstash not configured in production — denying request"
      );
      return { ok: false, remaining: 0, retryAfterSec: 60 };
    }
    return localRateLimit(key, limit, windowMs);
  }

  try {
    const { Ratelimit } = await import("@upstash/ratelimit");
    const { Redis } = await import("@upstash/redis");
    const redis = Redis.fromEnv();
    const rl = new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(limit, `${Math.ceil(windowMs / 1000)} s`),
      prefix: "sisonkhe:rl",
      analytics: false,
    });
    const result = await rl.limit(key);
    return {
      ok: result.success,
      remaining: result.remaining,
      retryAfterSec: result.success
        ? 0
        : Math.max(1, Math.ceil((result.reset - Date.now()) / 1000)),
    };
  } catch (err) {
    console.error("[rateLimit] Upstash failed:", err);
    if (isProduction()) {
      return { ok: false, remaining: 0, retryAfterSec: 60 };
    }
    return localRateLimit(key, limit, windowMs);
  }
}

/**
 * Sync wrapper for routes that have not yet migrated to async.
 * Uses local only — prefer rateLimitAsync in new code.
 * @deprecated Prefer rateLimitAsync so production gets distributed limits.
 */
export function rateLimit(
  key: string,
  limit: number,
  windowMs: number
): { ok: boolean; remaining: number; retryAfterSec: number } {
  if (isProduction() && !upstashConfigured()) {
    return { ok: false, remaining: 0, retryAfterSec: 60 };
  }
  return localRateLimit(key, limit, windowMs);
}
