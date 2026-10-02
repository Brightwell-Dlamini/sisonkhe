/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * POST /api/marshal/vehicles/queue
 * Body: { registrationNumber: string }
 *
 * Adds an off-queue vehicle to the tail of the queue.
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
    if (!ctx) {
      return NextResponse.json({ error: "No marshal context" }, { status: 404 });
    }

    const body = await request.json();
    const reg = String(body.registrationNumber ?? "").trim().toUpperCase();
    if (!reg) {
      return NextResponse.json(
        { error: "registrationNumber required" },
        { status: 400 }
      );
    }

    const admin = createSupabaseAdminClient();

    // Verify vehicle is in marshal's scope
    const { data: vehicle } = await admin
      .from("vehicles")
      .select("registration_number, route_assignment_id, current_queue_position")
      .eq("registration_number", reg)
      .maybeSingle();

    if (!vehicle) {
      return NextResponse.json({ error: "Vehicle not found" }, { status: 404 });
    }

    if (ctx.assignedRouteId && vehicle.route_assignment_id !== ctx.assignedRouteId) {
      return NextResponse.json({ error: "Vehicle not in your route" }, { status: 403 });
    }

    if ((vehicle.current_queue_position as number) > 0) {
      return NextResponse.json(
        { error: "Vehicle already in queue" },
        { status: 409 }
      );
    }

    // Find next queue position on that route
    const { data: existing } = await admin
      .from("vehicles")
      .select("current_queue_position")
      .eq("route_assignment_id", vehicle.route_assignment_id as string)
      .gt("current_queue_position", 0);

    const maxPos = (existing ?? []).reduce(
      (max, v) => Math.max(max, (v.current_queue_position as number) ?? 0),
      0
    );
    const nextPos = maxPos + 1;

    const { error: updateErr } = await admin
      .from("vehicles")
      .update({
        current_queue_position: nextPos,
        status: "Waiting",
      })
      .eq("registration_number", reg);

    if (updateErr) {
      return NextResponse.json({ error: updateErr.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, position: nextPos });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[api/marshal/vehicles/queue] error:", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
