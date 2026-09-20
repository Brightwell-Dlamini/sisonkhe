/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Marshal dispatch transitions. Every vehicle status change and rank fee
 * write goes through this module — single source of truth for operational
 * state changes.
 *
 * Key invariant: whenever a marshal triggers Full Cabin or Depart, exactly
 * one rank fee transaction is written. No double-charging.
 *
 * Also records a Completed trip row so admin/ledger Trips & Settlement work.
 */

import "server-only";
import { createSupabaseAdminClient } from "../supabase/server";
import type { MarshalContext } from "./queries";

const RANK_FEE_SZL = 25;
const LOADING_DURATION_MIN = 20;

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
}

async function authorizeVehicle(
  context: MarshalContext,
  registrationNumber: string
): Promise<{
  reg: string;
  routeId: string | null;
  status: string;
  currentQueuePosition: number;
  seatingCapacity: number;
  driverId: string | null;
} | null> {
  const admin = createSupabaseAdminClient();

  const { data: vehicle, error } = await admin
    .from("vehicles")
    .select(
      "registration_number, route_assignment_id, status, current_queue_position, seating_capacity, driver_id"
    )
    .eq("registration_number", registrationNumber)
    .maybeSingle();

  if (error || !vehicle) return null;

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

  return {
    reg: vehicle.registration_number as string,
    routeId,
    status: vehicle.status as string,
    currentQueuePosition: (vehicle.current_queue_position as number) ?? 0,
    seatingCapacity: (vehicle.seating_capacity as number) ?? 15,
    driverId: (vehicle.driver_id as string | null) ?? null,
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

  if (excludeReg) {
    q = q.neq("registration_number", excludeReg);
  }

  const { count } = await q;
  return count ?? 0;
}

async function writeRankFee(
  context: MarshalContext,
  registrationNumber: string,
  triggerSource: string
): Promise<{ written: boolean }> {
  const admin = createSupabaseAdminClient();
  const nowIso = new Date().toISOString();
  const today = nowIso.slice(0, 10);

  // Prevent double-charge for same vehicle same calendar day from this marshal
  const { data: existing } = await admin
    .from("marshal_transactions")
    .select("id")
    .eq("marshal_id", context.marshalId)
    .eq("vehicle_reg", registrationNumber)
    .gte("timestamp", `${today}T00:00:00.000Z`)
    .lte("timestamp", `${today}T23:59:59.999Z`)
    .limit(1);

  if (existing && existing.length > 0) {
    return { written: false };
  }

  const txId = `mtx_${Date.now()}_${registrationNumber.replace(/\s+/g, "")}`;
  const { error: txErr } = await admin.from("marshal_transactions").insert({
    id: txId,
    marshal_id: context.marshalId,
    timestamp: nowIso,
    vehicle_reg: registrationNumber,
    trigger_source: triggerSource,
    amount_szl: RANK_FEE_SZL,
  });

  if (txErr) {
    console.error("[marshal/dispatch] rank fee insert error:", txErr);
    return { written: false };
  }

  // Split allocations (default 20 / 3.5 / 1.5 of E25)
  await admin.from("rank_fee_payments").insert({
    id: `rfp_${Date.now()}_${registrationNumber.replace(/\s+/g, "")}`,
    timestamp: nowIso,
    vehicle_reg: registrationNumber,
    amount_szl: RANK_FEE_SZL,
    allocation_operational: 20,
    allocation_nrtc: 3.5,
    allocation_maintenance: 1.5,
    marshal_id: context.marshalId,
  });

  return { written: true };
}

/**
 * Record a completed trip when a vehicle departs (Full Cabin or Depart).
 */
async function recordTrip(
  vehicle: {
    reg: string;
    routeId: string | null;
    seatingCapacity: number;
    driverId: string | null;
  },
  nowIso: string
): Promise<void> {
  if (!vehicle.routeId) {
    console.warn("[marshal/dispatch] skip trip — vehicle has no route:", vehicle.reg);
    return;
  }

  const admin = createSupabaseAdminClient();
  const now = new Date(nowIso);
  const date = now.toISOString().slice(0, 10);
  const departureTime = now.toISOString().slice(11, 16);

  const { data: route } = await admin
    .from("routes")
    .select("base_fare_e")
    .eq("id", vehicle.routeId)
    .maybeSingle();
  const fare = Number(route?.base_fare_e ?? 0);
  const passengers = Math.max(1, vehicle.seatingCapacity);
  const revenue = fare * passengers;

  const id = `trip_${Date.now()}_${vehicle.reg.replace(/\s+/g, "")}`;

  const { error } = await admin.from("trips").insert({
    id,
    date,
    departure_time: departureTime,
    arrival_time: null,
    route_id: vehicle.routeId,
    vehicle_reg: vehicle.reg,
    driver_id: vehicle.driverId || "unassigned",
    passenger_count: passengers,
    trip_duration_minutes: null,
    delay_reason: null,
    status: "Completed",
    revenue_szl: revenue,
  });

  if (error) {
    console.error("[marshal/dispatch] trip insert error:", error);
  }
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

  const admin = createSupabaseAdminClient();
  const nowIso = new Date().toISOString();

  switch (action) {
    case "load": {
      let newPosition = vehicle.currentQueuePosition;
      if (newPosition < 1) {
        const maxQueued = await countQueuedOnRoute(vehicle.routeId ?? "");
        newPosition = maxQueued + 1;
      }

      const { error } = await admin
        .from("vehicles")
        .update({
          status: "Loading",
          current_queue_position: newPosition,
        })
        .eq("registration_number", registrationNumber);

      if (error) return { success: false, error: error.message };
      return { success: true, newStatus: "Loading" };
    }

    case "full_cabin": {
      const fee = await writeRankFee(context, registrationNumber, "Full Cabin Button");

      const oldPos = vehicle.currentQueuePosition;

      const { error } = await admin
        .from("vehicles")
        .update({
          status: "Departed",
          current_queue_position: 0,
        })
        .eq("registration_number", registrationNumber);

      if (error) return { success: false, error: error.message };

      if (oldPos > 0 && vehicle.routeId) {
        await admin
          .rpc("shift_queue_forward", {
            p_route_id: vehicle.routeId,
            p_from_position: oldPos,
          })
          .then(() => {});
      }

      await recordTrip(vehicle, nowIso);

      return {
        success: true,
        newStatus: "Departed",
        rankFeeWritten: fee.written,
      };
    }

    case "depart": {
      const fee = await writeRankFee(context, registrationNumber, "Depart Button");

      const oldPos = vehicle.currentQueuePosition;

      const { error } = await admin
        .from("vehicles")
        .update({
          status: "Departed",
          current_queue_position: 0,
        })
        .eq("registration_number", registrationNumber);

      if (error) return { success: false, error: error.message };

      if (oldPos > 0 && vehicle.routeId) {
        await admin
          .rpc("shift_queue_forward", {
            p_route_id: vehicle.routeId,
            p_from_position: oldPos,
          })
          .catch(() => {});
      }

      await recordTrip(vehicle, nowIso);

      return {
        success: true,
        newStatus: "Departed",
        rankFeeWritten: fee.written,
      };
    }

    case "delay": {
      const { error } = await admin
        .from("vehicles")
        .update({ status: "Delayed" })
        .eq("registration_number", registrationNumber);

      if (error) return { success: false, error: error.message };

      if (reason) {
        await admin.from("notifications").insert({
          id: `notif_${Date.now()}`,
          timestamp: nowIso,
          type: "Push",
          recipient_name: null,
          recipient_phone: null,
          message: `Delay reported for ${registrationNumber}: ${reason}`,
          status: "Sent",
        });
      }

      return { success: true, newStatus: "Delayed" };
    }

    case "breakdown": {
      const { error } = await admin
        .from("vehicles")
        .update({
          status: "Breakdown",
          current_queue_position: 0,
        })
        .eq("registration_number", registrationNumber);

      if (error) return { success: false, error: error.message };

      if (reason) {
        await admin.from("notifications").insert({
          id: `notif_${Date.now()}`,
          timestamp: nowIso,
          type: "Push",
          recipient_name: null,
          recipient_phone: null,
          message: `Breakdown reported for ${registrationNumber}: ${reason}`,
          status: "Sent",
        });
      }

      return { success: true, newStatus: "Breakdown" };
    }

    case "reset_to_waiting": {
      const { error } = await admin
        .from("vehicles")
        .update({
          status: "Waiting",
        })
        .eq("registration_number", registrationNumber);

      if (error) return { success: false, error: error.message };
      return { success: true, newStatus: "Waiting" };
    }

    default:
      return { success: false, error: "Unknown action." };
  }
}
