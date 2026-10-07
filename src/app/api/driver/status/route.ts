/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Driver self-service status. Notifies marshal; does not auto-dispatch.
 */

import type { NextRequest } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { requireServerRole } from "@/lib/auth/session";
import { getDriverContext } from "@/lib/driver/queries";
import { getMarshalForRoute, notifyMarshal } from "@/lib/driver/notifications";
import { AppError } from "@/lib/api/errors";
import { ok, withApiHandler } from "@/lib/api/response";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const VALID = ["Waiting", "Loading", "Full", "Depart"];

const MESSAGE: Record<string, string> = {
  Waiting: "Driver is ready and waiting.",
  Loading: "Driver has started boarding passengers.",
  Full: "Cabin is full — please approve dispatch.",
  Depart: "Requesting permission to depart bay.",
};

export const POST = withApiHandler(async (request: NextRequest) => {
  const session = await requireServerRole(["driver"]);
  const ctx = await getDriverContext(session.authUserId);
  if (!ctx?.vehicle) throw AppError.notFound("Vehicle assignment");

  const body = await request.json();
  const nextStatus = String(body.status ?? "");
  if (!VALID.includes(nextStatus)) {
    throw AppError.validation("Invalid status");
  }

  const admin = createSupabaseAdminClient();
  const dbStatus = nextStatus === "Depart" ? "Departed" : nextStatus;
  const { error: updateErr } = await admin
    .from("vehicles")
    .update({ status: dbStatus })
    .eq("registration_number", ctx.vehicle.registrationNumber);

  if (updateErr) {
    throw AppError.internal(updateErr.message);
  }

  if (ctx.vehicle.routeId) {
    const marshal = await getMarshalForRoute(ctx.vehicle.routeId);
    if (marshal) {
      await notifyMarshal(
        marshal.name,
        marshal.phone,
        ctx.fullName,
        ctx.vehicle.registrationNumber,
        MESSAGE[nextStatus]
      );
    }
  }

  return ok({ success: true, status: dbStatus });
});
