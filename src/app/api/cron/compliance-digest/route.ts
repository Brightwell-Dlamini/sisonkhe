/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Daily compliance digest. Authorization: Bearer $CRON_SECRET
 */

import { runComplianceDigest } from "@/lib/compliance/digest";
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

function authorize(request: Request): boolean {
  const expected = process.env.CRON_SECRET;
  if (!expected) return false;
  const header = request.headers.get("authorization") ?? "";
  const provided = header.startsWith("Bearer ") ? header.slice(7) : "";
  return !!provided && timingSafeEqual(provided, expected);
}

export const GET = withApiHandler(async (request: Request) => {
  if (!process.env.CRON_SECRET) {
    throw AppError.internal("CRON_SECRET is not configured");
  }
  if (!authorize(request)) throw AppError.unauthenticated();

  const summary = await runComplianceDigest();
  return ok({ summary });
});
