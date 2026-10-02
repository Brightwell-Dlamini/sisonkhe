/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * GET /api/assignments/resolve?nationalId=… | ?vehicleReg=…
 */

import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { resolveDriver, resolveVehicle } from "@/lib/assignments/service";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const nationalId = searchParams.get("nationalId")?.trim() || "";
    const driverId = searchParams.get("driverId")?.trim() || "";
    const vehicleReg = searchParams.get("vehicleReg")?.trim() || "";

    if (!nationalId && !driverId && !vehicleReg) {
      return NextResponse.json(
        { error: "Provide nationalId, driverId, or vehicleReg" },
        { status: 400 }
      );
    }

    const admin = createSupabaseAdminClient();
    const out: Record<string, unknown> = {};

    if (nationalId || driverId) {
      const driver = await resolveDriver(admin, { nationalId, driverId });
      if (!driver) {
        return NextResponse.json({ error: "Driver not found" }, { status: 404 });
      }
      out.driver = {
        id: driver.id,
        fullName: driver.full_name,
        nationalId: driver.national_id,
        phone: driver.phone,
        assignedVehicleReg: driver.assigned_vehicle_reg,
        status: driver.status,
      };
    }

    if (vehicleReg) {
      const vehicle = await resolveVehicle(admin, vehicleReg);
      if (!vehicle) {
        return NextResponse.json({ error: "Vehicle not found" }, { status: 404 });
      }
      out.vehicle = {
        registrationNumber: vehicle.registration_number,
        make: vehicle.make,
        model: vehicle.model,
        vic: vehicle.vic,
        driverId: vehicle.driver_id,
        status: vehicle.status,
        ownerName: vehicle.owner_name,
      };
    }

    return NextResponse.json(out);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[api/assignments/resolve]", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
