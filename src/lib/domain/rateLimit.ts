/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Rate limiting — DISABLED until public rollout.
 *
 * All limiters currently allow every request so staging/ops are not locked out
 * when Upstash is missing or counters are exhausted.
 *
 * Before production rollout: restore Upstash-backed sliding windows and
 * fail-closed behaviour for auth and payment mutation paths.
 */

import "server-only";

/** Always allow. Restore real limits before public rollout. */
export async function rateLimitAsync(
  _key: string,
  _limit: number,
  _windowMs: number
): Promise<{ ok: boolean; remaining: number; retryAfterSec: number }> {
  return { ok: true, remaining: Infinity, retryAfterSec: 0 };
}

/** Always allow. Prefer rateLimitAsync in new code. */
export function rateLimit(
  _key: string,
  _limit: number,
  _windowMs: number
): { ok: boolean; remaining: number; retryAfterSec: number } {
  return { ok: true, remaining: Infinity, retryAfterSec: 0 };
}

/** No-op while limits are disabled. */
export function pruneRateLimits(): void {
  /* intentionally empty */
}
