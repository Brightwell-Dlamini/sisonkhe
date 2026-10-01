/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * GET /api/sync/pull?since=<seq>
 *
 * Returns changes since the given sequence number.
 * Clients use this to catch up after being offline.
 *
 * For Phase 5g, we return a full snapshot of the entities the caller cares
 * about, filtered by role. In a future phase we can diff by seq.
 */

import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { getServerSession } from "@/lib/auth/session";
import { getMarshalContext, listVehiclesForMarshal } from "@/lib/marshal/queries";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(_: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const admin = createSupabaseAdminClient();

    // For marshals, return their scoped vehicles + summary
    if (session.role === "marshal") {
      const ctx = await getMarshalContext(session.authUserId);
      if (!ctx) {
        return NextResponse.json({ error: "No marshal context" }, { status: 404 });
      }
      const vehicles = await listVehiclesForMarshal(ctx);

      // Last server seq
      const { data: lastEvent } = await admin
        .from("sync_events")
        .select("seq")
        .order("seq", { ascending: false })
        .limit(1)
        .maybeSingle();

      return NextResponse.json({
        vehicles,
        serverSeq: lastEvent?.seq ?? 0,
        serverTime: new Date().toISOString(),
      });
    }

    // For staff roles, return a broader snapshot (vehicles, drivers, routes)
    const [vehiclesRes, driversRes, routesRes] = await Promise.all([
      admin
        .from("vehicles")
        .select(
          "registration_number, vic, make, model, seating_capacity, classification, status, current_queue_position, loading_bay, route_assignment_id, driver_id, owner_name, owner_phone, permit_number, permit_status, permit_expiry_date"
        ),
      admin
        .from("drivers")
        .select("id, full_name, phone, assigned_vehicle_reg, status, pdp_status"),
      admin.from("routes").select("id, origin, destination, region_code, base_fare_e"),
    ]);

    const { data: lastEvent } = await admin
      .from("sync_events")
      .select("seq")
      .order("seq", { ascending: false })
      .limit(1)
      .maybeSingle();

    return NextResponse.json({
      vehicles: vehiclesRes.data ?? [],
      drivers: driversRes.data ?? [],
      routes: routesRes.data ?? [],
      serverSeq: lastEvent?.seq ?? 0,
      serverTime: new Date().toISOString(),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[api/sync/pull] error:", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
