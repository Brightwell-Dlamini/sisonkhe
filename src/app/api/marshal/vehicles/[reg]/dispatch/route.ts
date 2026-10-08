/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * POST /api/marshal/vehicles/[reg]/dispatch
 */

import type { NextRequest } from "next/server";
import { requireServerRole } from "@/lib/auth/session";
import { getMarshalContext } from "@/lib/marshal/queries";
import {
  applyDispatchAction,
  type DispatchAction,
} from "@/lib/marshal/dispatch";
import { AppError } from "@/lib/api/errors";
import { ok, withApiHandler } from "@/lib/api/response";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type Ctx = { params: Promise<{ reg: string }> };

const VALID_ACTIONS: DispatchAction[] = [
  "load",
  "full_cabin",
  "depart",
  "delay",
  "breakdown",
  "reset_to_waiting",
];

export const POST = withApiHandler(async (request: NextRequest, ctx: Ctx) => {
  const session = await requireServerRole(["marshal"]);
  const context = await getMarshalContext(session.authUserId);
  if (!context) throw AppError.notFound("Marshal assignment");

  const { reg } = await ctx.params;
  const registrationNumber = decodeURIComponent(reg).toUpperCase();

  const body = await request.json();
  const action = String(body.action ?? "") as DispatchAction;
  const reason =
    typeof body.reason === "string" ? body.reason.trim() : undefined;

  if (!VALID_ACTIONS.includes(action)) {
    throw AppError.validation(`Invalid action: ${action}`);
  }

  const result = await applyDispatchAction(
    context,
    registrationNumber,
    action,
    reason
  );

  if (!result.success) {
    throw AppError.validation(result.error ?? "Dispatch failed");
  }

  return ok({
    success: true,
    newStatus: result.newStatus,
    rankFeeWritten: result.rankFeeWritten ?? false,
    smartRecommendation: result.smartRecommendation ?? null,
  });
});
