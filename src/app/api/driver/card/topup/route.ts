/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * POST /api/driver/card/topup
 */

import type { NextRequest } from "next/server";
import { requireServerRole } from "@/lib/auth/session";
import { getDriverContext } from "@/lib/driver/queries";
import { createIntent } from "@/lib/payments/intent";
import type { ProviderId } from "@/lib/payments/types";
import { AppError } from "@/lib/api/errors";
import { ok, withApiHandler } from "@/lib/api/response";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export const POST = withApiHandler(async (request: NextRequest) => {
  const session = await requireServerRole(["driver"]);
  const ctx = await getDriverContext(session.authUserId);
  if (!ctx?.vehicle) throw AppError.notFound("Vehicle assignment");

  const body = await request.json();
  const amount = Number(body.amount ?? 0);
  const providerId = String(body.providerId ?? "manual") as ProviderId;
  const payerPhone = body.payerPhone ? String(body.payerPhone) : undefined;

  if (amount <= 0) {
    throw AppError.validation("amount must be positive");
  }

  const result = await createIntent({
    providerId,
    amountSzl: amount,
    purpose: "vehicle_card_topup",
    targetEntityId: ctx.vehicle.registrationNumber,
    initiatedBy: session.authUserId,
    payerPhone,
    payerName: ctx.fullName,
    description: `Driver top-up for ${ctx.vehicle.registrationNumber}`,
  });

  if (result.error) {
    throw AppError.validation(result.error, { intent: result.intent });
  }

  return ok({ intent: result.intent }, { status: 201 });
});
