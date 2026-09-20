/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Marshal dispatch transitions.
 *
 * Rank fee rules:
 *   - Charged once per departure cycle (Full Cabin OR Depart).
 *   - A vehicle can pay again after Return to Queue → Load → depart again.
 *   - Not once-per-calendar-day (that blocked multi-trip testing/ops).
 *   - Short cooldown (90s) only to block double-click of Full Cabin + Depart
 *     on the same departure.
 *
 * Trips:
 *   - Written only when the vehicle actually transitions to Departed from
 *     Loading / Waiting / Delayed — not when spam-clicking already-Departed.
 */

import "server-only";
import { createSupabaseAdminClient } from "../supabase/server";
import type { MarshalContext } from "./queries";

const RANK_FEE_SZL = 25;
/** Prevent double-charge if marshal hits Full Cabin then Depart within this window. */
const FEE_COOLDOWN_MS = 90_000;

const DEPARTABLE_STATUSES = new Set(["Loading", "Waiting", "Delayed"]);

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
  const sinceIso = new Date(Date.now() - FEE_COOLDOWN_MS).toISOString();

  // Only block duplicate fee within the short cooldown (same departure event).
  // After Return to Queue + Load + depart again, a new fee is allowed.
  const { data: recent } = await admin
    .from("marshal_transactions")
    .select("id, timestamp")
    .eq("marshal_id", context.marshalId)
    .eq("vehicle_reg", registrationNumber)
    .gte("timestamp", sinceIso)
    .limit(1);

  if (recent && recent.length > 0) {
    return { written: false };
  }

  const safeReg = registrationNumber.replace(/\s+/g, "");
  const txId = `mtx_${Date.now()}_${safeReg}`;
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

  await admin.from("rank_fee_payments").insert({
    id: `rfp_${Date.now()}_${safeReg}`,
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
    return {
      success: false,
      error: "Vehicle not found or not under your authority.",
    };
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

    case "full_cabin":
    case "depart": {
      if (!DEPARTABLE_STATUSES.has(vehicle.status)) {
        return {
          success: false,
          error:
            vehicle.status === "Departed"
              ? "Already departed. Use Return to Queue, then Load, before departing again."
              : `Cannot depart from status "${vehicle.status}". Load the vehicle first.`,
        };
      }

      const trigger =
        action === "full_cabin" ? "Full Cabin Button" : "Depart Button";
      const fee = await writeRankFee(context, registrationNumber, trigger);

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
        try {
          await admin.rpc("shift_queue_forward", {
            p_route_id: vehicle.routeId,
            p_from_position: oldPos,
          });
        } catch {
          /* best-effort */
        }
      }

      // Only record a trip when this is a real departure transition
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
          current_queue_position: 0,
        })
        .eq("registration_number", registrationNumber);

      if (error) return { success: false, error: error.message };
      return { success: true, newStatus: "Waiting" };
    }

    default:
      return { success: false, error: "Unknown action." };
  }
}
