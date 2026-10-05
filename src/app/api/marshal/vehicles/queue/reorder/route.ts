/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * POST /api/marshal/vehicles/queue/reorder
 * Body: { registrationNumber: string, direction: "up" | "down" }
 *
 * Swaps the vehicle with its neighbour in the queue.
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
    const direction = body.direction as "up" | "down";

    if (!reg || (direction !== "up" && direction !== "down")) {
      return NextResponse.json(
        { error: "registrationNumber and direction (up|down) required" },
        { status: 400 }
      );
    }

    const admin = createSupabaseAdminClient();

    const { data: vehicle } = await admin
      .from("vehicles")
      .select(
        "registration_number, route_assignment_id, current_queue_position, version"
      )
      .eq("registration_number", reg)
      .maybeSingle();

    if (!vehicle) {
      return NextResponse.json({ error: "Vehicle not found" }, { status: 404 });
    }

    if (ctx.assignedRouteId && vehicle.route_assignment_id !== ctx.assignedRouteId) {
      return NextResponse.json({ error: "Vehicle not in your route" }, { status: 403 });
    }

    const pos = (vehicle.current_queue_position as number) ?? 0;
    if (pos < 1) {
      return NextResponse.json({ error: "Vehicle is not in the queue" }, { status: 409 });
    }

    const targetPos = direction === "up" ? pos - 1 : pos + 1;
    if (targetPos < 1) {
      return NextResponse.json({ error: "Already at front of queue" }, { status: 409 });
    }

    const routeId = vehicle.route_assignment_id as string;

    const { data: neighbour } = await admin
      .from("vehicles")
      .select("registration_number, current_queue_position, version")
      .eq("route_assignment_id", routeId)
      .eq("current_queue_position", targetPos)
      .maybeSingle();

    if (!neighbour) {
      return NextResponse.json(
        { error: direction === "down" ? "Already at end of queue" : "No neighbour" },
        { status: 409 }
      );
    }

    const nowIso = new Date().toISOString();

    // Swap positions
    const { error: e1 } = await admin
      .from("vehicles")
      .update({
        current_queue_position: targetPos,
        version: ((vehicle.version as number) ?? 1) + 1,
        updated_at: nowIso,
      })
      .eq("registration_number", reg);

    if (e1) {
      return NextResponse.json({ error: e1.message }, { status: 500 });
    }

    const { error: e2 } = await admin
      .from("vehicles")
      .update({
        current_queue_position: pos,
        version: ((neighbour.version as number) ?? 1) + 1,
        updated_at: nowIso,
      })
      .eq("registration_number", neighbour.registration_number);

    if (e2) {
      // Best-effort rollback
      await admin
        .from("vehicles")
        .update({ current_queue_position: pos })
        .eq("registration_number", reg);
      return NextResponse.json({ error: e2.message }, { status: 500 });
    }

    // Log sync events (non-fatal)
    try {
      await admin.from("sync_events").insert([
        {
          id: `evt_${Date.now()}_${reg.replace(/\s+/g, "")}`,
          entity_type: "vehicle",
          entity_id: reg,
          operation: "UPDATE",
          payload: { current_queue_position: targetPos },
          idempotency_key: `reorder_${reg}_${Date.now()}`,
          client_id: `marshal:${ctx.marshalId}`,
          occurred_at: nowIso,
          base_version: vehicle.version,
        },
        {
          id: `evt_${Date.now() + 1}_${String(neighbour.registration_number).replace(/\s+/g, "")}`,
          entity_type: "vehicle",
          entity_id: neighbour.registration_number,
          operation: "UPDATE",
          payload: { current_queue_position: pos },
          idempotency_key: `reorder_${neighbour.registration_number}_${Date.now()}`,
          client_id: `marshal:${ctx.marshalId}`,
          occurred_at: nowIso,
          base_version: neighbour.version,
        },
      ]);
    } catch {
      /* non-fatal */
    }

    return NextResponse.json({
      success: true,
      newPosition: targetPos,
      swappedWith: neighbour.registration_number,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[api/marshal/vehicles/queue/reorder]", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
