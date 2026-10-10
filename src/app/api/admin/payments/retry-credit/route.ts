/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * POST /api/admin/payments/retry-credit
 * Body: { intentId: string }
 *
 * Re-attempts card credit for a completed intent that has no payment_credits row.
 */

import type { NextRequest } from "next/server";
import { requirePermission } from "@/lib/auth/session";
import { retryCreditForIntent } from "@/lib/payments/intent";
import { AppError } from "@/lib/api/errors";
import { ok, withApiHandler } from "@/lib/api/response";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export const POST = withApiHandler(async (request: NextRequest) => {
  const user = await requirePermission("admin.payments.manage");
  const body = await request.json();
  const intentId = String(body.intentId ?? "").trim();
  if (!intentId) throw AppError.validation("intentId is required");

  const result = await retryCreditForIntent(intentId, {
    actorId: user.authUserId,
    actorName: user.fullName,
  });

  if (!result.success) {
    throw AppError.validation(result.error ?? "Retry failed");
  }

  return ok({ success: true, credited: result.credited });
});
