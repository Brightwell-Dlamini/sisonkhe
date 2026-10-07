/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * POST /api/operator/transfer — master card → vehicle card.
 */

import type { NextRequest } from "next/server";
import { requireServerRole } from "@/lib/auth/session";
import { transferToVehicle } from "@/lib/operator/transfers";
import { rateLimitAsync } from "@/lib/domain/rateLimit";
import { AppError } from "@/lib/api/errors";
import { ok, withApiHandler } from "@/lib/api/response";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export const POST = withApiHandler(async (request: NextRequest) => {
  const session = await requireServerRole(["operator"]);
  if (!session.operatorId) throw AppError.forbidden("Operator profile required");

  const rl = await rateLimitAsync(`xfer:${session.operatorId}`, 20, 60_000);
  if (!rl.ok) {
    throw new AppError("RATE_LIMITED", "Too many transfers. Wait a moment.", {
      details: { retryAfterSec: rl.retryAfterSec },
    });
  }

  const body = await request.json();
  const vehicleReg = String(body.vehicleReg ?? "").trim();
  const amountSzl = Number(body.amountSzl ?? 0);
  const category = String(body.category ?? "Fuel Allowance");
  const description = body.description ? String(body.description) : undefined;

  if (!vehicleReg || amountSzl <= 0) {
    throw AppError.validation("vehicleReg and positive amountSzl required");
  }

  const result = await transferToVehicle({
    operatorId: session.operatorId,
    vehicleReg,
    amountSzl,
    category,
    description,
    actorUserId: session.authUserId,
  });

  if (!result.success) {
    throw AppError.validation(result.error ?? "Transfer failed");
  }

  return ok({ success: true, ...result });
});
