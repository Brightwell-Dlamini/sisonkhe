/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Single write path for driver ↔ vehicle.
 * Order: driver.assigned_vehicle_reg first, then vehicles.driver_id
 * (DB triggers often require the driver side to match before vehicle.driver_id is set).
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { driverAssignableToVehicle } from "@/lib/domain/eligibility";
import { normalizePlate, plateKey, platesEqual } from "@/lib/domain/identity";

export type AssignmentKeys = {
  driverId?: string | null;
  nationalId?: string | null;
  vehicleReg?: string | null;
  force?: boolean;
};

export type AssignmentResult = {
  driverId: string;
  driverName: string;
  nationalId: string | null;
  vehicleReg: string;
  vehicleMake: string | null;
  vehicleModel: string | null;
  vic: string | null;
  releasedDriverId: string | null;
  releasedVehicleReg: string | null;
};

function normNid(id: string): string {
  return id.trim();
}

export async function resolveDriver(
  admin: SupabaseClient,
  keys: Pick<AssignmentKeys, "driverId" | "nationalId">
) {
  if (keys.driverId?.trim()) {
    const { data } = await admin
      .from("drivers")
      .select(
        "id, full_name, national_id, assigned_vehicle_reg, phone, status, pdp_status, pdp_expiry_date"
      )
      .eq("id", keys.driverId.trim())
      .maybeSingle();
    return data;
  }
  if (keys.nationalId?.trim()) {
    const { data } = await admin
      .from("drivers")
      .select(
        "id, full_name, national_id, assigned_vehicle_reg, phone, status, pdp_status, pdp_expiry_date"
      )
      .eq("national_id", normNid(keys.nationalId))
      .maybeSingle();
    return data;
  }
  return null;
}

export async function resolveVehicle(admin: SupabaseClient, vehicleReg: string) {
  const plate = normalizePlate(vehicleReg);
  const compact = plateKey(plate);

  let { data } = await admin
    .from("vehicles")
    .select(
      "registration_number, make, model, vic, driver_id, status, owner_name"
    )
    .eq("registration_number", plate)
    .maybeSingle();

  if (!data && compact) {
    const { data: candidates } = await admin
      .from("vehicles")
      .select(
        "registration_number, make, model, vic, driver_id, status, owner_name"
      )
      .ilike("registration_number", `%${compact.slice(0, 4)}%`)
      .limit(40);
    data =
      (candidates ?? []).find(
        (r) => plateKey(String(r.registration_number)) === compact
      ) ?? null;
  }

  if (!data) return null;
  return {
    ...data,
    registration_number: normalizePlate(data.registration_number as string),
  };
}

export async function assignDriverVehicle(
  admin: SupabaseClient,
  keys: AssignmentKeys
): Promise<AssignmentResult> {
  const plate = keys.vehicleReg ? normalizePlate(keys.vehicleReg) : "";
  if (!plate) {
    throw Object.assign(
      new Error("Vehicle registration (number plate) is required."),
      { status: 400 }
    );
  }
  if (!keys.driverId?.trim() && !keys.nationalId?.trim()) {
    throw Object.assign(
      new Error("Provide a driver National ID or driver ID."),
      { status: 400 }
    );
  }

  const driver = await resolveDriver(admin, keys);
  if (!driver) {
    throw Object.assign(
      new Error(
        keys.nationalId
          ? `No driver found with National ID ${normNid(keys.nationalId)}.`
          : `Driver ${keys.driverId} not found.`
      ),
      { status: 404 }
    );
  }

  const vehicle = await resolveVehicle(admin, plate);
  if (!vehicle) {
    throw Object.assign(
      new Error(`Vehicle ${plate} not found. Register the vehicle first.`),
      { status: 404 }
    );
  }

  const canonicalPlate = vehicle.registration_number as string;

  const eligibility = driverAssignableToVehicle(
    {
      id: driver.id as string,
      fullName: (driver.full_name as string) || "Driver",
      status: driver.status as string | null,
      assignedVehicleReg: driver.assigned_vehicle_reg as string | null,
      pdpStatus: driver.pdp_status as string | null,
      pdpExpiryDate: driver.pdp_expiry_date as string | null,
    },
    canonicalPlate
  );

  const hardBlock =
    eligibility.reason?.includes("suspended") ||
    eligibility.reason?.includes("PDP") ||
    eligibility.reason?.includes("On Leave") ||
    eligibility.reason?.includes("Off-Duty");

  if (!eligibility.eligible && hardBlock) {
    throw Object.assign(new Error(eligibility.reason ?? "Driver not eligible."), {
      status: 409,
    });
  }

  if (!eligibility.eligible && !keys.force) {
    throw Object.assign(
      new Error(
        eligibility.reason ??
          "Driver is not available for this vehicle. Unlink first or use staff force transfer."
      ),
      { status: 409 }
    );
  }

  let releasedDriverId: string | null = null;
  let releasedVehicleReg: string | null = null;

  // Clear previous occupant of this vehicle
  if (vehicle.driver_id && vehicle.driver_id !== driver.id) {
    if (!keys.force) {
      throw Object.assign(
        new Error(
          `Vehicle ${canonicalPlate} is already linked to another driver. Unlink first or use force (staff transfer).`
        ),
        { status: 409 }
      );
    }
    await admin
      .from("drivers")
      .update({ assigned_vehicle_reg: null })
      .eq("id", vehicle.driver_id);
    releasedDriverId = vehicle.driver_id as string;
  }

  // Clear previous vehicle of this driver
  const prevReg = driver.assigned_vehicle_reg as string | null;
  if (prevReg && !platesEqual(prevReg, canonicalPlate)) {
    if (!keys.force && !eligibility.eligible) {
      throw Object.assign(
        new Error(
          `Driver is on ${normalizePlate(prevReg)}. Confirm transfer (force) to move them to ${canonicalPlate}.`
        ),
        { status: 409 }
      );
    }
    await admin
      .from("vehicles")
      .update({ driver_id: null })
      .eq("registration_number", normalizePlate(prevReg));
    releasedVehicleReg = normalizePlate(prevReg);
  }

  // CRITICAL ORDER for DB triggers:
  // 1) drivers.assigned_vehicle_reg = plate
  // 2) vehicles.driver_id = driver
  const { error: dErr } = await admin
    .from("drivers")
    .update({ assigned_vehicle_reg: canonicalPlate })
    .eq("id", driver.id);

  if (dErr) {
    throw Object.assign(new Error(`Could not update driver: ${dErr.message}`), {
      status: 500,
    });
  }

  const { error: vErr } = await admin
    .from("vehicles")
    .update({ driver_id: driver.id })
    .eq("registration_number", canonicalPlate);

  if (vErr) {
    // Rollback driver side
    await admin
      .from("drivers")
      .update({ assigned_vehicle_reg: prevReg })
      .eq("id", driver.id);
    if (releasedVehicleReg) {
      await admin
        .from("vehicles")
        .update({ driver_id: driver.id })
        .eq("registration_number", releasedVehicleReg);
    }
    throw Object.assign(new Error(`Could not update vehicle: ${vErr.message}`), {
      status: 500,
    });
  }

  // Clear any other vehicles still pointing at this driver (split-brain cleanup)
  await admin
    .from("vehicles")
    .update({ driver_id: null })
    .eq("driver_id", driver.id)
    .neq("registration_number", canonicalPlate);

  return {
    driverId: driver.id as string,
    driverName: driver.full_name as string,
    nationalId: (driver.national_id as string | null) ?? null,
    vehicleReg: canonicalPlate,
    vehicleMake: (vehicle.make as string | null) ?? null,
    vehicleModel: (vehicle.model as string | null) ?? null,
    vic: (vehicle.vic as string | null) ?? null,
    releasedDriverId,
    releasedVehicleReg,
  };
}

export async function unassignDriverVehicle(
  admin: SupabaseClient,
  keys: Pick<AssignmentKeys, "driverId" | "nationalId" | "vehicleReg">
): Promise<{ driverId: string | null; vehicleReg: string | null }> {
  let driverId: string | null = null;
  let vehicleReg: string | null = null;

  if (keys.vehicleReg?.trim()) {
    const vehicle = await resolveVehicle(admin, keys.vehicleReg);
    if (vehicle) {
      vehicleReg = vehicle.registration_number as string;
      driverId = (vehicle.driver_id as string | null) ?? null;
    }
  }

  if (!driverId && (keys.driverId || keys.nationalId)) {
    const driver = await resolveDriver(admin, keys);
    if (driver) {
      driverId = driver.id as string;
      vehicleReg =
        vehicleReg ||
        ((driver.assigned_vehicle_reg as string | null)
          ? normalizePlate(driver.assigned_vehicle_reg as string)
          : null);
    }
  }

  if (!driverId && !vehicleReg) {
    throw Object.assign(
      new Error("Nothing to unlink — no matching assignment."),
      { status: 404 }
    );
  }

  // Clear vehicle first, then driver (triggers often check vehicle.driver_id)
  if (vehicleReg) {
    await admin
      .from("vehicles")
      .update({ driver_id: null })
      .eq("registration_number", vehicleReg);
  }
  if (driverId) {
    await admin
      .from("drivers")
      .update({ assigned_vehicle_reg: null })
      .eq("id", driverId);
    await admin
      .from("vehicles")
      .update({ driver_id: null })
      .eq("driver_id", driverId);
  }

  return { driverId, vehicleReg };
}
