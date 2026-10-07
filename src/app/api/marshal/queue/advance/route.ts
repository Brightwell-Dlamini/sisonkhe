/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * POST /api/marshal/queue/advance — advance circular rotation to next month.
 */

import type { NextRequest } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { requireServerRole } from "@/lib/auth/session";
import { getMarshalContext } from "@/lib/marshal/queries";
import { AppError } from "@/lib/api/errors";
import { ok, withApiHandler } from "@/lib/api/response";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export const POST = withApiHandler(async (request: NextRequest) => {
  const session = await requireServerRole(["marshal"]);
  const ctx = await getMarshalContext(session.authUserId);
  if (!ctx?.assignedRouteId) throw AppError.notFound("Route assignment");

  const body = await request.json();
  const targetMonth = String(body.targetMonth ?? "").trim();
  if (!/^\d{4}-\d{2}$/.test(targetMonth)) {
    throw AppError.validation("Invalid targetMonth");
  }

  const admin = createSupabaseAdminClient();
  const { data: vehicles } = await admin
    .from("vehicles")
    .select(
      "registration_number, current_queue_position, is_mid_month_addition"
    )
    .eq("route_assignment_id", ctx.assignedRouteId)
    .neq("status", "Offline")
    .order("current_queue_position", { ascending: true });

  const list = vehicles ?? [];
  if (list.length === 0) {
    throw AppError.validation("No vehicles on route");
  }

  const regulars = list.filter((v) => !v.is_mid_month_addition);
  const midMonth = list.filter((v) => v.is_mid_month_addition);
  const rotated =
    regulars.length > 1 ? [...regulars.slice(1), regulars[0]] : regulars;
  const finalOrder = [...rotated, ...midMonth];

  for (let i = 0; i < finalOrder.length; i++) {
    await admin
      .from("vehicles")
      .update({
        current_queue_position: i + 1,
        is_mid_month_addition: false,
        month_registered: targetMonth,
      })
      .eq(
        "registration_number",
        finalOrder[i].registration_number as string
      );
  }

  return ok({
    success: true,
    routeId: ctx.assignedRouteId,
    targetMonth,
    newSequence: finalOrder.map((v, i) => ({
      position: i + 1,
      registrationNumber: v.registration_number,
    })),
  });
});
