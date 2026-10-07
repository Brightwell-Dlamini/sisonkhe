/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * POST /api/marshal/vehicles/queue/reorder
 * Body: { registrationNumber, direction: "up" | "down" }
 */

import type { NextRequest } from "next/server";
import { randomBytes } from "crypto";
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
  if (!ctx) throw AppError.notFound("Marshal context");

  const body = await request.json();
  const reg = String(body.registrationNumber ?? "").trim().toUpperCase();
  const direction = body.direction as "up" | "down";

  if (!reg || (direction !== "up" && direction !== "down")) {
    throw AppError.validation(
      "registrationNumber and direction (up|down) required"
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

  if (!vehicle) throw AppError.notFound("Vehicle");

  if (
    ctx.assignedRouteId &&
    vehicle.route_assignment_id !== ctx.assignedRouteId
  ) {
    throw AppError.forbidden("Vehicle not in your route");
  }

  const pos = (vehicle.current_queue_position as number) ?? 0;
  if (pos < 1) throw AppError.conflict("Vehicle is not in the queue");

  const targetPos = direction === "up" ? pos - 1 : pos + 1;
  if (targetPos < 1) throw AppError.conflict("Already at front of queue");

  const routeId = vehicle.route_assignment_id as string;

  const { data: neighbour } = await admin
    .from("vehicles")
    .select("registration_number, current_queue_position, version")
    .eq("route_assignment_id", routeId)
    .eq("current_queue_position", targetPos)
    .maybeSingle();

  if (!neighbour) {
    throw AppError.conflict(
      direction === "down" ? "Already at end of queue" : "No neighbour"
    );
  }

  const nowIso = new Date().toISOString();
  const token = randomBytes(6).toString("hex");

  const { error: e1 } = await admin
    .from("vehicles")
    .update({
      current_queue_position: targetPos,
      version: ((vehicle.version as number) ?? 1) + 1,
      updated_at: nowIso,
    })
    .eq("registration_number", reg);

  if (e1) throw AppError.internal(e1.message);

  const { error: e2 } = await admin
    .from("vehicles")
    .update({
      current_queue_position: pos,
      version: ((neighbour.version as number) ?? 1) + 1,
      updated_at: nowIso,
    })
    .eq("registration_number", neighbour.registration_number);

  if (e2) {
    await admin
      .from("vehicles")
      .update({ current_queue_position: pos })
      .eq("registration_number", reg);
    throw AppError.internal(e2.message);
  }

  try {
    const nReg = String(neighbour.registration_number);
    await admin.from("sync_events").insert([
      {
        id: `evt_${token}_${reg.replace(/\s+/g, "")}`,
        entity_type: "vehicle",
        entity_id: reg,
        operation: "UPDATE",
        payload: { current_queue_position: targetPos },
        idempotency_key: `reorder_${reg}_${token}`,
        client_id: `marshal:${ctx.marshalId}`,
        occurred_at: nowIso,
        base_version: vehicle.version,
      },
      {
        id: `evt_${token}b_${nReg.replace(/\s+/g, "")}`,
        entity_type: "vehicle",
        entity_id: nReg,
        operation: "UPDATE",
        payload: { current_queue_position: pos },
        idempotency_key: `reorder_${nReg}_${token}`,
        client_id: `marshal:${ctx.marshalId}`,
        occurred_at: nowIso,
        base_version: neighbour.version,
      },
    ]);
  } catch {
    /* non-fatal */
  }

  return ok({
    success: true,
    newPosition: targetPos,
    swappedWith: neighbour.registration_number,
  });
});
