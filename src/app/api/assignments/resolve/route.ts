/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * GET /api/assignments/resolve?nationalId=… | ?vehicleReg=…
 */

import type { NextRequest } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { requireServerRole } from "@/lib/auth/session";
import { resolveDriver, resolveVehicle } from "@/lib/assignments/service";
import { AppError } from "@/lib/api/errors";
import { ok, withApiHandler } from "@/lib/api/response";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export const GET = withApiHandler(async (request: NextRequest) => {
  await requireServerRole(["super-admin", "admin", "fleet-manager"]);

  const { searchParams } = new URL(request.url);
  const nationalId = searchParams.get("nationalId")?.trim() || "";
  const driverId = searchParams.get("driverId")?.trim() || "";
  const vehicleReg = searchParams.get("vehicleReg")?.trim() || "";

  if (!nationalId && !driverId && !vehicleReg) {
    throw AppError.validation("Provide nationalId, driverId, or vehicleReg");
  }

  const admin = createSupabaseAdminClient();
  const out: Record<string, unknown> = {};

  if (nationalId || driverId) {
    const driver = await resolveDriver(admin, { nationalId, driverId });
    if (!driver) throw AppError.notFound("Driver");
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
    if (!vehicle) throw AppError.notFound("Vehicle");
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

  return ok(out);
});
