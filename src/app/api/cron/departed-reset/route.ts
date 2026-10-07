/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Auto-reset stale Departed vehicles. Authorization: Bearer $CRON_SECRET
 */

import { autoResetStaleDeparted } from "@/lib/ops/departedReset";
import { AppError } from "@/lib/api/errors";
import { ok, withApiHandler } from "@/lib/api/response";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

export const GET = withApiHandler(async (request: Request) => {
  const expected = process.env.CRON_SECRET;
  if (!expected) throw AppError.internal("CRON_SECRET is not configured");

  const header = request.headers.get("authorization") ?? "";
  const provided = header.startsWith("Bearer ") ? header.slice(7) : "";
  if (!provided || !timingSafeEqual(provided, expected)) {
    throw AppError.unauthenticated();
  }

  const result = await autoResetStaleDeparted();
  return ok(result);
});
