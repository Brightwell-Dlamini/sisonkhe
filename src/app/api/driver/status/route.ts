/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * POST /api/driver/status
 * Body: { status: "Waiting" | "Loading" | "Full" | "Depart" }
 *
 * Driver's self-service status update. Notifies marshal but does NOT
 * auto-dispatch. Marshal has final authority.
 */

import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { getServerSession } from "@/lib/auth/session";
import { getDriverContext } from "@/lib/driver/queries";
import { getMarshalForRoute, notifyMarshal } from "@/lib/driver/notifications";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const VALID = ["Waiting", "Loading", "Full", "Depart"];

const MESSAGE: Record<string, string> = {
  Waiting: "Driver is ready and waiting.",
  Loading: "Driver has started boarding passengers.",
  Full: "Cabin is full — please approve dispatch.",
  Depart: "Requesting permission to depart bay.",
};

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session || session.role !== "driver") {
      return NextResponse.json({ error: "Driver only" }, { status: 403 });
    }

    const ctx = await getDriverContext(session.authUserId);
    if (!ctx || !ctx.vehicle) {
      return NextResponse.json({ error: "No vehicle assigned" }, { status: 404 });
    }

    const body = await request.json();
    const nextStatus = String(body.status ?? "");

    if (!VALID.includes(nextStatus)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }

    const admin = createSupabaseAdminClient();

    // Update vehicle status
    const dbStatus =
      nextStatus === "Depart" ? "Departed" : nextStatus;
    const { error: updateErr } = await admin
      .from("vehicles")
      .update({ status: dbStatus })
      .eq("registration_number", ctx.vehicle.registrationNumber);

    if (updateErr) {
      return NextResponse.json({ error: updateErr.message }, { status: 500 });
    }

    // Notify marshal
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

    return NextResponse.json({ success: true, status: dbStatus });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[api/driver/status] error:", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
