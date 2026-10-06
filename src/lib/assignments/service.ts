/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Single source of truth for driver ↔ vehicle assignment.
 * Always writes BOTH:
 *   drivers.assigned_vehicle_reg
 *   vehicles.driver_id
 *
 * Domain rules: one driver ↔ one vehicle; suspended / invalid PDP blocked.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { driverAssignableToVehicle } from "@/lib/domain/eligibility";

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

function normPlate(reg: string): string {
  return reg.trim().toUpperCase().replace(/\s+/g, " ");
}

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
  const plate = normPlate(vehicleReg);
  const { data } = await admin
    .from("vehicles")
    .select(
      "registration_number, make, model, vic, driver_id, status, owner_name"
    )
    .eq("registration_number", plate)
    .maybeSingle();
  return data ? { ...data, registration_number: plate } : null;
}

export async function assignDriverVehicle(
  admin: SupabaseClient,
  keys: AssignmentKeys
): Promise<AssignmentResult> {
  const plate = keys.vehicleReg ? normPlate(keys.vehicleReg) : "";
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

  const eligibility = driverAssignableToVehicle(
    {
      id: driver.id as string,
      fullName: (driver.full_name as string) || "Driver",
      status: driver.status as string | null,
      assignedVehicleReg: driver.assigned_vehicle_reg as string | null,
      pdpStatus: driver.pdp_status as string | null,
      pdpExpiryDate: driver.pdp_expiry_date as string | null,
    },
    plate
  );

  // force only bypasses "already on another vehicle" conflict after explicit staff intent,
  // never suspended / invalid PDP
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

  if (vehicle.driver_id && vehicle.driver_id !== driver.id) {
    if (!keys.force) {
      throw Object.assign(
        new Error(
          `Vehicle ${plate} is already linked to another driver. Unlink first or use force (staff transfer).`
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

  const prevReg = driver.assigned_vehicle_reg as string | null;
  if (prevReg && normPlate(prevReg) !== plate) {
    if (!keys.force && !eligibility.eligible) {
      throw Object.assign(
        new Error(
          `Driver is on ${normPlate(prevReg)}. Confirm transfer (force) to move them to ${plate}.`
        ),
        { status: 409 }
      );
    }
    await admin
      .from("vehicles")
      .update({ driver_id: null })
      .eq("registration_number", normPlate(prevReg));
    releasedVehicleReg = normPlate(prevReg);
  }

  const { error: vErr } = await admin
    .from("vehicles")
    .update({ driver_id: driver.id })
    .eq("registration_number", plate);
  if (vErr) {
    throw Object.assign(new Error(`Could not update vehicle: ${vErr.message}`), {
      status: 500,
    });
  }

  const { error: dErr } = await admin
    .from("drivers")
    .update({ assigned_vehicle_reg: plate })
    .eq("id", driver.id);
  if (dErr) {
    throw Object.assign(new Error(`Could not update driver: ${dErr.message}`), {
      status: 500,
    });
  }

  return {
    driverId: driver.id as string,
    driverName: driver.full_name as string,
    nationalId: (driver.national_id as string | null) ?? null,
    vehicleReg: plate,
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
          ? normPlate(driver.assigned_vehicle_reg as string)
          : null);
    }
  }

  if (!driverId && !vehicleReg) {
    throw Object.assign(
      new Error("Nothing to unlink — no matching assignment."),
      { status: 404 }
    );
  }

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
