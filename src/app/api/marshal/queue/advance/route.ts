/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * POST /api/marshal/queue/advance
 * Body: { targetMonth: YYYY-MM }
 *
 * Advances the circular rotation for this marshal's route to the next month.
 * Moves the previous #1 to the bottom, graduates mid-month additions.
 */

import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { getServerSession } from "@/lib/auth/session";
import { getMarshalContext } from "@/lib/marshal/queries";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session || session.role !== "marshal") {
      return NextResponse.json({ error: "Marshal only" }, { status: 403 });
    }
    const ctx = await getMarshalContext(session.authUserId);
    if (!ctx || !ctx.assignedRouteId) {
      return NextResponse.json({ error: "No route assigned" }, { status: 404 });
    }

    const body = await request.json();
    const targetMonth = String(body.targetMonth ?? "").trim();
    if (!/^\d{4}-\d{2}$/.test(targetMonth)) {
      return NextResponse.json({ error: "Invalid targetMonth" }, { status: 400 });
    }

    const admin = createSupabaseAdminClient();

    // Fetch route vehicles ordered by current position
    const { data: vehicles } = await admin
      .from("vehicles")
      .select("registration_number, current_queue_position, is_mid_month_addition")
      .eq("route_assignment_id", ctx.assignedRouteId)
      .neq("status", "Offline")
      .order("current_queue_position", { ascending: true });

    const list = vehicles ?? [];
    if (list.length === 0) {
      return NextResponse.json({ error: "No vehicles on route" }, { status: 400 });
    }

    const regulars = list.filter((v) => !v.is_mid_month_addition);
    const midMonth = list.filter((v) => v.is_mid_month_addition);

    // Rotate: previous #1 to bottom, others shift up, mid-month graduate to regular
    const rotated = regulars.length > 1 ? [...regulars.slice(1), regulars[0]] : regulars;
    const finalOrder = [...rotated, ...midMonth];

    // Update each vehicle: new queue position, clear mid-month flag
    for (let i = 0; i < finalOrder.length; i++) {
      await admin
        .from("vehicles")
        .update({
          current_queue_position: i + 1,
          is_mid_month_addition: false,
          month_registered: targetMonth,
        })
        .eq("registration_number", finalOrder[i].registration_number as string);
    }

    return NextResponse.json({
      success: true,
      routeId: ctx.assignedRouteId,
      targetMonth,
      newSequence: finalOrder.map((v, i) => ({
        position: i + 1,
        registrationNumber: v.registration_number,
      })),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[api/marshal/queue/advance] error:", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
