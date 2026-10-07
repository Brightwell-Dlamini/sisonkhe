/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * POST /api/marshal/vehicles/queue — add vehicle to tail of queue.
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
  if (!reg) throw AppError.validation("registrationNumber required");

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

  if ((vehicle.current_queue_position as number) > 0) {
    throw AppError.conflict("Vehicle already in queue");
  }

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
  const nowIso = new Date().toISOString();
  const baseVersion = (vehicle.version as number) ?? 1;
  const token = randomBytes(6).toString("hex");

  const { error: updateErr } = await admin
    .from("vehicles")
    .update({
      current_queue_position: nextPos,
      status: "Waiting",
      version: baseVersion + 1,
      updated_at: nowIso,
    })
    .eq("registration_number", reg);

  if (updateErr) throw AppError.internal(updateErr.message);

  try {
    await admin.from("sync_events").insert({
      id: `evt_${token}_${reg.replace(/\s+/g, "")}`,
      entity_type: "vehicle",
      entity_id: reg,
      operation: "UPDATE",
      payload: {
        current_queue_position: nextPos,
        status: "Waiting",
      },
      idempotency_key: `queue_add_${reg}_${token}`,
      client_id: `marshal:${ctx.marshalId}`,
      occurred_at: nowIso,
      base_version: baseVersion,
    });
  } catch {
    /* non-fatal */
  }

  return ok({ success: true, position: nextPos });
});
