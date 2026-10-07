/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { NextRequest } from "next/server";
import { requireServerRole } from "@/lib/auth/session";
import { getOperatorVehicleCard } from "@/lib/operator/queries";
import { AppError } from "@/lib/api/errors";
import { ok, withApiHandler } from "@/lib/api/response";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type Ctx = { params: Promise<{ reg: string }> };

export const GET = withApiHandler(async (_: NextRequest, ctx: Ctx) => {
  const session = await requireServerRole(["operator"]);
  if (!session.operatorId) throw AppError.forbidden("Operator profile required");

  const { reg } = await ctx.params;
  const decoded = decodeURIComponent(reg).toUpperCase();

  const card = await getOperatorVehicleCard(session.operatorId, decoded);
  if (!card) throw AppError.notFound("Vehicle card");

  return ok({ card });
});
