/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Marshal dispatch transitions — state machine + compliance gates.
 */

import "server-only";
import { createSupabaseAdminClient } from "../supabase/server";
import type { MarshalContext } from "./queries";
import {
  canDispatchLoad,
  canDispatchDepart,
  canRankTransition,
  type RankAction,
} from "@/lib/domain/eligibility";
import { normalizePlate } from "@/lib/domain/identity";

const RANK_FEE_SZL = 25;
const DOUBLE_CLICK_MS = 3_000;

export type DispatchAction =
  | "load"
  | "full_cabin"
  | "depart"
  | "delay"
  | "breakdown"
  | "reset_to_waiting";

export interface DispatchResult {
  success: boolean;
  error?: string;
  rankFeeWritten?: boolean;
  newStatus?: string;
  warning?: string;
}

type AuthVehicle = {
  reg: string;
  routeId: string | null;
  status: string;
  currentQueuePosition: number;
  seatingCapacity: number;
  driverId: string | null;
  version: number;
  permitStatus: string | null;
  permitExpiryDate: string | null;
  cofExpiryDate: string | null;
  driverStatus: string | null;
  driverPdpStatus: string | null;
  driverPdpExpiry: string | null;
  printPending: boolean;
};

async function authorizeVehicle(
  context: MarshalContext,
  registrationNumber: string
): Promise<AuthVehicle | null> {
  const admin = createSupabaseAdminClient();
  const plate = normalizePlate(registrationNumber);

  let { data: vehicle, error } = await admin
    .from("vehicles")
    .select(
      "registration_number, route_assignment_id, status, current_queue_position, seating_capacity, driver_id, version, permit_status, permit_expiry_date, cof_expiry_date"
    )
    .eq("registration_number", plate)
    .maybeSingle();

  if ((error || !vehicle) && plate) {
    const { data: alt } = await admin
      .from("vehicles")
      .select(
        "registration_number, route_assignment_id, status, current_queue_position, seating_capacity, driver_id, version, permit_status, permit_expiry_date, cof_expiry_date"
      )
      .ilike("registration_number", plate)
      .limit(1)
      .maybeSingle();
    vehicle = alt;
  }

  if (!vehicle) return null;

  const routeId = vehicle.route_assignment_id as string | null;
  if (routeId) {
    if (context.assignedRouteId) {
      if (routeId !== context.assignedRouteId) return null;
    } else {
      const { data: route } = await admin
        .from("routes")
        .select("region_code")
        .eq("id", routeId)
        .maybeSingle();
      if (!route || route.region_code !== context.region) return null;
    }
  }

  let driverStatus: string | null = null;
  let driverPdpStatus: string | null = null;
  let driverPdpExpiry: string | null = null;
  const driverId = (vehicle.driver_id as string | null) ?? null;
  if (driverId) {
    const { data: driver } = await admin
      .from("drivers")
      .select("status, pdp_status, pdp_expiry_date")
      .eq("id", driverId)
      .maybeSingle();
    if (driver) {
      driverStatus = (driver.status as string | null) ?? null;
      driverPdpStatus = (driver.pdp_status as string | null) ?? null;
      driverPdpExpiry = (driver.pdp_expiry_date as string | null) ?? null;
    }
  }

  let printPending = false;
  try {
    const { data: pendingPrint } = await admin
      .from("permit_renewal_requests")
      .select("id")
      .eq("vehicle_reg", vehicle.registration_number as string)
      .eq("status", "Approved")
      .limit(1);
    printPending = !!(pendingPrint && pendingPrint.length > 0);
  } catch {
    printPending = false;
  }

  return {
    reg: vehicle.registration_number as string,
    routeId,
    status: vehicle.status as string,
    currentQueuePosition: (vehicle.current_queue_position as number) ?? 0,
    seatingCapacity: (vehicle.seating_capacity as number) ?? 15,
    driverId,
    version: (vehicle.version as number) ?? 1,
    permitStatus: (vehicle.permit_status as string | null) ?? null,
    permitExpiryDate: (vehicle.permit_expiry_date as string | null) ?? null,
    cofExpiryDate: (vehicle.cof_expiry_date as string | null) ?? null,
    driverStatus,
    driverPdpStatus,
    driverPdpExpiry,
    printPending,
  };
}

function gatePayload(vehicle: AuthVehicle) {
  return {
    hasDriver: !!vehicle.driverId,
    driverStatus: vehicle.driverStatus,
    driverPdpStatus: vehicle.driverPdpStatus,
    driverPdpExpiry: vehicle.driverPdpExpiry,
    permitStatus: vehicle.permitStatus,
    permitExpiryDate: vehicle.permitExpiryDate,
    cofExpiryDate: vehicle.cofExpiryDate,
    vehicleStatus: vehicle.status,
    printPending: vehicle.printPending,
  };
}

async function countQueuedOnRoute(
  routeId: string,
  excludeReg?: string
): Promise<number> {
  const admin = createSupabaseAdminClient();
  let q = admin
    .from("vehicles")
    .select("*", { count: "exact", head: true })
    .eq("route_assignment_id", routeId)
    .gt("current_queue_position", 0);
  if (excludeReg) q = q.neq("registration_number", excludeReg);
  const { count } = await q;
  return count ?? 0;
}

async function writeRankFee(
  context: MarshalContext,
  registrationNumber: string,
  triggerSource: string
): Promise<{ written: boolean; error?: string }> {
  const admin = createSupabaseAdminClient();
  const nowIso = new Date().toISOString();
  const date = nowIso.slice(0, 10);
  const month = nowIso.slice(0, 7);
  const sinceIso = new Date(Date.now() - DOUBLE_CLICK_MS).toISOString();

  const { data: recent } = await admin
    .from("marshal_transactions")
    .select("id")
    .eq("marshal_id", context.marshalId)
    .eq("vehicle_reg", registrationNumber)
    .gte("timestamp", sinceIso)
    .limit(1);
  if (recent && recent.length > 0) return { written: false };

  const safeReg = registrationNumber.replace(/\s+/g, "");
  const txId = `mtx_${Date.now()}_${safeReg}`;
  const { error: txErr } = await admin.from("marshal_transactions").insert({
    id: txId,
    marshal_id: context.marshalId,
    timestamp: nowIso,
    date,
    month,
    vehicle_reg: registrationNumber,
    trigger_source: triggerSource,
    amount_szl: RANK_FEE_SZL,
  });
  if (txErr) return { written: false, error: txErr.message };

  await admin.from("rank_fee_payments").insert({
    id: `rfp_${Date.now()}_${safeReg}`,
    timestamp: nowIso,
    vehicle_reg: registrationNumber,
    amount_szl: RANK_FEE_SZL,
    payment_method: "Cash",
    transaction_ref: txId,
    status: "Success",
    allocation_operational: 20,
    allocation_nrtc: 3.5,
    allocation_maintenance: 1.5,
  });
  return { written: true };
}

async function recordTrip(
  vehicle: {
    reg: string;
    routeId: string | null;
    seatingCapacity: number;
    driverId: string | null;
  },
  nowIso: string
): Promise<void> {
  if (!vehicle.routeId) return;
  const admin = createSupabaseAdminClient();
  const now = new Date(nowIso);
  const { data: route } = await admin
    .from("routes")
    .select("base_fare_e")
    .eq("id", vehicle.routeId)
    .maybeSingle();
  const fare = Number(route?.base_fare_e ?? 0);
  const passengers = Math.max(1, vehicle.seatingCapacity);
  await admin.from("trips").insert({
    id: `trip_${Date.now()}_${vehicle.reg.replace(/\s+/g, "")}`,
    date: now.toISOString().slice(0, 10),
    departure_time: now.toISOString().slice(11, 16),
    arrival_time: null,
    route_id: vehicle.routeId,
    vehicle_reg: vehicle.reg,
    driver_id: vehicle.driverId || "unassigned",
    passenger_count: passengers,
    trip_duration_minutes: null,
    delay_reason: null,
    status: "Completed",
    revenue_szl: fare * passengers,
  });
}

async function logSyncEvent(
  entityId: string,
  operation: "UPDATE",
  payload: Record<string, unknown>,
  baseVersion: number,
  clientId: string
): Promise<void> {
  const admin = createSupabaseAdminClient();
  const id = `evt_${Date.now()}_${entityId.replace(/\s+/g, "")}`;
  await admin.from("sync_events").insert({
    id,
    entity_type: "vehicle",
    entity_id: entityId,
    operation,
    payload,
    idempotency_key: `${id}_${operation}`,
    client_id: clientId,
    occurred_at: new Date().toISOString(),
    base_version: baseVersion,
  });
}

export async function applyDispatchAction(
  context: MarshalContext,
  registrationNumber: string,
  action: DispatchAction,
  reason?: string
): Promise<DispatchResult> {
  const vehicle = await authorizeVehicle(context, registrationNumber);
  if (!vehicle) {
    return { success: false, error: "Vehicle not found or not under your authority." };
  }

  const transition = canRankTransition(vehicle.status, action as RankAction);
  if (!transition.eligible) {
    return { success: false, error: transition.reason };
  }

  const reg = vehicle.reg;
  const admin = createSupabaseAdminClient();
  const nowIso = new Date().toISOString();
  const clientId = `marshal:${context.marshalId}`;

  switch (action) {
    case "load": {
      const gate = canDispatchLoad(gatePayload(vehicle));
      if (!gate.eligible) return { success: false, error: gate.reason };

      let newPosition = vehicle.currentQueuePosition;
      if (newPosition < 1) {
        newPosition = (await countQueuedOnRoute(vehicle.routeId ?? "", reg)) + 1;
      }
      const payload = { status: "Loading", current_queue_position: newPosition };
      const { error } = await admin
        .from("vehicles")
        .update({ ...payload, version: vehicle.version + 1, updated_at: nowIso })
        .eq("registration_number", reg);
      if (error) return { success: false, error: error.message };
      await logSyncEvent(reg, "UPDATE", payload, vehicle.version, clientId);
      return { success: true, newStatus: "Loading", warning: gate.warning };
    }

    case "full_cabin":
    case "depart": {
      const gate = canDispatchDepart(gatePayload(vehicle));
      if (!gate.eligible) return { success: false, error: gate.reason };

      const trigger = action === "full_cabin" ? "Full Cabin Button" : "Depart Button";
      const fee = await writeRankFee(context, reg, trigger);
      if (fee.error) return { success: false, error: `Could not record rank fee: ${fee.error}` };
      if (!fee.written) {
        return { success: true, newStatus: vehicle.status, rankFeeWritten: false };
      }

      const oldPos = vehicle.currentQueuePosition;
      const payload = { status: "Departed", current_queue_position: 0 };
      const { error } = await admin
        .from("vehicles")
        .update({ ...payload, version: vehicle.version + 1, updated_at: nowIso })
        .eq("registration_number", reg);
      if (error) return { success: false, error: error.message };

      if (oldPos > 0 && vehicle.routeId) {
        try {
          await admin.rpc("shift_queue_forward", {
            p_route_id: vehicle.routeId,
            p_from_position: oldPos,
          });
        } catch {
          /* best-effort */
        }
      }
      await recordTrip({ ...vehicle, reg }, nowIso);
      await logSyncEvent(reg, "UPDATE", payload, vehicle.version, clientId);
      return {
        success: true,
        newStatus: "Departed",
        rankFeeWritten: true,
        warning: gate.warning,
      };
    }

    case "delay": {
      const payload = { status: "Delayed" };
      const { error } = await admin
        .from("vehicles")
        .update({ ...payload, version: vehicle.version + 1, updated_at: nowIso })
        .eq("registration_number", reg);
      if (error) return { success: false, error: error.message };
      if (reason) {
        await admin.from("notifications").insert({
          id: `notif_${Date.now()}`,
          timestamp: nowIso,
          type: "Push",
          message: `Delay reported for ${reg}: ${reason}`,
          status: "Sent",
        });
      }
      await logSyncEvent(reg, "UPDATE", payload, vehicle.version, clientId);
      return { success: true, newStatus: "Delayed" };
    }

    case "breakdown": {
      const payload = { status: "Breakdown", current_queue_position: 0 };
      const { error } = await admin
        .from("vehicles")
        .update({ ...payload, version: vehicle.version + 1, updated_at: nowIso })
        .eq("registration_number", reg);
      if (error) return { success: false, error: error.message };
      if (reason) {
        await admin.from("notifications").insert({
          id: `notif_${Date.now()}`,
          timestamp: nowIso,
          type: "Push",
          message: `Breakdown reported for ${reg}: ${reason}`,
          status: "Sent",
        });
      }
      await logSyncEvent(reg, "UPDATE", payload, vehicle.version, clientId);
      return { success: true, newStatus: "Breakdown" };
    }

    case "reset_to_waiting": {
      const payload = { status: "Waiting", current_queue_position: 0 };
      const { error } = await admin
        .from("vehicles")
        .update({ ...payload, version: vehicle.version + 1, updated_at: nowIso })
        .eq("registration_number", reg);
      if (error) return { success: false, error: error.message };
      await logSyncEvent(reg, "UPDATE", payload, vehicle.version, clientId);
      return { success: true, newStatus: "Waiting" };
    }

    default:
      return { success: false, error: "Unknown action." };
  }
}
