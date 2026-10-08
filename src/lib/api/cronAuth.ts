/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Shared authorization for Vercel cron routes.
 */

import "server-only";
import { AppError } from "./errors";

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

/** Require Authorization: Bearer $CRON_SECRET. Fail closed if unset. */
export function requireCronSecret(request: Request): void {
  const expected = process.env.CRON_SECRET;
  if (!expected || expected.length < 16) {
    throw AppError.internal("CRON_SECRET is not configured");
  }
  const header = request.headers.get("authorization") ?? "";
  const provided = header.startsWith("Bearer ") ? header.slice(7) : "";
  if (!provided || !timingSafeEqual(provided, expected)) {
    throw AppError.unauthenticated();
  }
}
