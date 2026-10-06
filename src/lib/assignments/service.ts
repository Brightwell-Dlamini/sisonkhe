/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Single write path for driver ↔ vehicle.
 * Prefer DB RPC assign_driver_vehicle_atomic (session-gated triggers).
 * Falls back to direct writes only if RPC is missing.
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

function mapRpcResult(raw: Record<string, unknown>): AssignmentResult {
  return {
    driverId: String(raw.driverId ?? raw.driver_id ?? ""),
    driverName: String(raw.driverName ?? raw.driver_name ?? ""),
    nationalId: (raw.nationalId ?? raw.national_id ?? null) as string | null,
    vehicleReg: String(raw.vehicleReg ?? raw.vehicle_reg ?? ""),
    vehicleMake: (raw.vehicleMake ?? raw.vehicle_make ?? null) as string | null,
    vehicleModel: (raw.vehicleModel ?? raw.vehicle_model ?? null) as
      | string
      | null,
    vic: (raw.vic ?? null) as string | null,
    releasedDriverId: (raw.releasedDriverId ??
      raw.released_driver_id ??
      null) as string | null,
    releasedVehicleReg: (raw.releasedVehicleReg ??
      raw.released_vehicle_reg ??
      null) as string | null,
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

  // Prefer atomic RPC (bypasses chicken-egg triggers)
  const { data: rpcData, error: rpcErr } = await admin.rpc(
    "assign_driver_vehicle_atomic",
    {
      p_driver_id: driver.id,
      p_vehicle_reg: canonicalPlate,
      p_force: !!keys.force,
    }
  );

  if (!rpcErr && rpcData) {
    return mapRpcResult(
      typeof rpcData === "object" && !Array.isArray(rpcData)
        ? (rpcData as Record<string, unknown>)
        : {}
    );
  }

  // If RPC missing (migration not applied), surface a clear error — do NOT
  // attempt sequential writes (they always fail against the bidirectional guards).
  if (
    rpcErr &&
    (rpcErr.message?.includes("Could not find the function") ||
      rpcErr.message?.includes("function public.assign_driver_vehicle_atomic") ||
      rpcErr.code === "PGRST202" ||
      rpcErr.code === "42883")
  ) {
    throw Object.assign(
      new Error(
        "Assignment RPC is not installed. Run migration 20261012_assignment_atomic.sql on Supabase, then retry."
      ),
      { status: 503 }
    );
  }

  if (rpcErr) {
    const msg = rpcErr.message || "Assignment failed";
    const status =
      msg.includes("already") ||
      msg.includes("force") ||
      msg.includes("Suspended") ||
      msg.includes("cannot be assigned")
        ? 409
        : 500;
    throw Object.assign(new Error(msg), { status });
  }

  throw Object.assign(new Error("Assignment failed with empty RPC response"), {
    status: 500,
  });
}

export async function unassignDriverVehicle(
  admin: SupabaseClient,
  keys: Pick<AssignmentKeys, "driverId" | "nationalId" | "vehicleReg">
): Promise<{ driverId: string | null; vehicleReg: string | null }> {
  let driverId: string | null = keys.driverId?.trim() || null;
  let vehicleReg: string | null = keys.vehicleReg
    ? normalizePlate(keys.vehicleReg)
    : null;

  if (!driverId && keys.nationalId) {
    const d = await resolveDriver(admin, { nationalId: keys.nationalId });
    driverId = (d?.id as string) ?? null;
  }

  if (!driverId && !vehicleReg) {
    throw Object.assign(
      new Error("Nothing to unlink — no matching assignment."),
      { status: 404 }
    );
  }

  const { data: rpcData, error: rpcErr } = await admin.rpc(
    "unassign_driver_vehicle_atomic",
    {
      p_driver_id: driverId,
      p_vehicle_reg: vehicleReg,
    }
  );

  if (!rpcErr && rpcData) {
    const row = rpcData as Record<string, unknown>;
    return {
      driverId: (row.driverId ?? row.driver_id ?? null) as string | null,
      vehicleReg: (row.vehicleReg ?? row.vehicle_reg ?? null) as string | null,
    };
  }

  if (
    rpcErr &&
    (rpcErr.message?.includes("Could not find the function") ||
      rpcErr.code === "PGRST202" ||
      rpcErr.code === "42883")
  ) {
    throw Object.assign(
      new Error(
        "Unassign RPC is not installed. Run migration 20261012_assignment_atomic.sql on Supabase, then retry."
      ),
      { status: 503 }
    );
  }

  if (rpcErr) {
    throw Object.assign(new Error(rpcErr.message || "Unassign failed"), {
      status: 500,
    });
  }

  return { driverId, vehicleReg };
}
