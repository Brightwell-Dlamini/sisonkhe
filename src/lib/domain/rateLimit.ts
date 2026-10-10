/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Rate limiting for sensitive mutation paths (auth, payments).
 *
 * Behaviour:
 * - Disabled unless RATE_LIMIT_ENABLED=1|true|yes (keeps staging open).
 * - Prefer Upstash Redis when UPSTASH_REDIS_REST_URL + TOKEN are set.
 * - Fall back to process-local sliding window (single-instance only).
 * - Fail-open on Redis errors so a Redis outage does not lock out ops;
 *   set RATE_LIMIT_FAIL_CLOSED=1 to reject when the backend is unavailable.
 */

import "server-only";

export type RateLimitResult = {
  ok: boolean;
  remaining: number;
  retryAfterSec: number;
  backend: "disabled" | "upstash" | "memory" | "error";
};

function envFlag(name: string): boolean {
  const v = (process.env[name] ?? "").trim().toLowerCase();
  return v === "1" || v === "true" || v === "yes" || v === "on";
}

function isEnabled(): boolean {
  return envFlag("RATE_LIMIT_ENABLED");
}

function failClosed(): boolean {
  return envFlag("RATE_LIMIT_FAIL_CLOSED");
}

// ── In-memory fallback (per serverless instance) ─────────────────────────────

type Bucket = { timestamps: number[] };
const memoryStore = new Map<string, Bucket>();

function memoryLimit(
  key: string,
  limit: number,
  windowMs: number
): RateLimitResult {
  const now = Date.now();
  const cutoff = now - windowMs;
  let bucket = memoryStore.get(key);
  if (!bucket) {
    bucket = { timestamps: [] };
    memoryStore.set(key, bucket);
  }
  bucket.timestamps = bucket.timestamps.filter((t) => t > cutoff);
  if (bucket.timestamps.length >= limit) {
    const oldest = bucket.timestamps[0] ?? now;
    const retryAfterSec = Math.max(1, Math.ceil((oldest + windowMs - now) / 1000));
    return { ok: false, remaining: 0, retryAfterSec, backend: "memory" };
  }
  bucket.timestamps.push(now);
  return {
    ok: true,
    remaining: Math.max(0, limit - bucket.timestamps.length),
    retryAfterSec: 0,
    backend: "memory",
  };
}

/** Drop stale memory keys (call opportunistically). */
export function pruneRateLimits(): void {
  const cutoff = Date.now() - 15 * 60_000;
  for (const [k, b] of memoryStore) {
    b.timestamps = b.timestamps.filter((t) => t > cutoff);
    if (b.timestamps.length === 0) memoryStore.delete(k);
  }
}

// ── Upstash ──────────────────────────────────────────────────────────────────

async function upstashLimit(
  key: string,
  limit: number,
  windowMs: number
): Promise<RateLimitResult | null> {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;

  try {
    const { Ratelimit } = await import("@upstash/ratelimit");
    const { Redis } = await import("@upstash/redis");
    const redis = new Redis({ url, token });
    const windowSec = Math.max(1, Math.ceil(windowMs / 1000));
    const rl = new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(limit, `${windowSec} s`),
      prefix: "sisonkhe:rl",
      analytics: false,
    });
    const res = await rl.limit(key);
    const retryAfterSec = res.success
      ? 0
      : Math.max(1, Math.ceil((res.reset - Date.now()) / 1000));
    return {
      ok: res.success,
      remaining: res.remaining,
      retryAfterSec,
      backend: "upstash",
    };
  } catch (err) {
    console.error("[rateLimit] upstash error:", err);
    return null;
  }
}

/**
 * Async rate limit. Prefer this in route handlers.
 * @param key  Stable identity (e.g. `signin:ip:1.2.3.4`)
 * @param limit  Max events in the window
 * @param windowMs  Window length in milliseconds
 */
export async function rateLimitAsync(
  key: string,
  limit: number,
  windowMs: number
): Promise<RateLimitResult> {
  if (!isEnabled()) {
    return { ok: true, remaining: Infinity, retryAfterSec: 0, backend: "disabled" };
  }

  const remote = await upstashLimit(key, limit, windowMs);
  if (remote) return remote;

  // No Upstash or error — memory fallback unless fail-closed
  if (failClosed() && !process.env.UPSTASH_REDIS_REST_URL) {
    return { ok: false, remaining: 0, retryAfterSec: 60, backend: "error" };
  }

  return memoryLimit(key, limit, windowMs);
}

/**
 * Sync convenience for legacy call sites. Uses memory only when enabled;
 * does not await Upstash. Prefer rateLimitAsync in new code.
 */
export function rateLimit(
  key: string,
  limit: number,
  windowMs: number
): RateLimitResult {
  if (!isEnabled()) {
    return { ok: true, remaining: Infinity, retryAfterSec: 0, backend: "disabled" };
  }
  return memoryLimit(key, limit, windowMs);
}

/** Client IP from common proxy headers (Vercel / Cloudflare). */
export function clientIp(request: Request): string {
  const h = request.headers;
  const fwd = h.get("x-forwarded-for");
  if (fwd) {
    const first = fwd.split(",")[0]?.trim();
    if (first) return first;
  }
  return h.get("x-real-ip")?.trim() || h.get("cf-connecting-ip")?.trim() || "unknown";
}

/** Standard limits for common surfaces. */
export const RATE_LIMITS = {
  /** Sign-in attempts per IP per 15 minutes */
  signinIp: { limit: 30, windowMs: 15 * 60_000 },
  /** Sign-in attempts per identifier per 15 minutes */
  signinId: { limit: 10, windowMs: 15 * 60_000 },
  /** Payment webhook deliveries per provider reference per minute */
  paymentWebhook: { limit: 60, windowMs: 60_000 },
  /** Payment mutations (top-up / send) per user per minute */
  paymentMutation: { limit: 20, windowMs: 60_000 },
} as const;
