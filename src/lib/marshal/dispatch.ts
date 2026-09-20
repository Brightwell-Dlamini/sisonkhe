/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Marshal dispatch transitions.
 *
 * Rank fee: one fee per real departure (Load → Full Cabin/Depart).
 * After Return to Queue → Load → depart again, another fee is charged.
 * Only a 3s window blocks double-click of Full Cabin + Depart on the same click.
 *
 * Trip row is written only when the rank fee transaction is successfully written,
 * so trips and fees stay in sync.
 */

import "server-only";
import { createSupabaseAdminClient } from "../supabase/server";
import type { MarshalContext } from "./queries";

const RANK_FEE_SZL = 25;
/** Double-click guard only (Full Cabin then Depart on same departure). */
const DOUBLE_CLICK_MS = 3_000;

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

  // Try exact match first, then case-insensitive via ilike on trimmed value
  let { data: vehicle, error } = await admin
    .from("vehicles")
    .select(
      "registration_number, route_assignment_id, status, current_queue_position, seating_capacity, driver_id"
    )
    .eq("registration_number", registrationNumber)
    .maybeSingle();

  if ((error || !vehicle) && registrationNumber) {
    const { data: alt } = await admin
      .from("vehicles")
      .select(
        "registration_number, route_assignment_id, status, current_queue_position, seating_capacity, driver_id"
      )
      .ilike("registration_number", registrationNumber)
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

/**
 * Write rank fee for this departure.
 * Returns written:true on success.
 * Returns written:false only for the 3s double-click guard.
 * Throws / returns error string on DB failure.
 */
async function writeRankFee(
  context: MarshalContext,
  registrationNumber: string,
  triggerSource: string
): Promise<{ written: boolean; error?: string }> {
  const admin = createSupabaseAdminClient();
  const nowIso = new Date().toISOString();
  const sinceIso = new Date(Date.now() - DOUBLE_CLICK_MS).toISOString();

  // Only block rapid double-click of Full Cabin + Depart (~same second)
  const { data: recent } = await admin
    .from("marshal_transactions")
    .select("id")
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
    console.error("[marshal/dispatch] marshal_transactions insert error:", txErr);
    return { written: false, error: txErr.message };
  }

  // Schema requires payment_method; no marshal_id column on rank_fee_payments
  const { error: payErr } = await admin.from("rank_fee_payments").insert({
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

  if (payErr) {
    // Fee is still counted via marshal_transactions for the marshal UI summary.
    // Log payment ledger failure but do not roll back the rank fee.
    console.error("[marshal/dispatch] rank_fee_payments insert error:", payErr);
  }

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
    console.warn("[marshal/dispatch] skip trip — no route:", vehicle.reg);
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

  // Always use the canonical reg from DB for writes
  const reg = vehicle.reg;
  const admin = createSupabaseAdminClient();
  const nowIso = new Date().toISOString();

  switch (action) {
    case "load": {
      let newPosition = vehicle.currentQueuePosition;
      if (newPosition < 1) {
        const maxQueued = await countQueuedOnRoute(vehicle.routeId ?? "", reg);
        newPosition = maxQueued + 1;
      }

      const { error } = await admin
        .from("vehicles")
        .update({
          status: "Loading",
          current_queue_position: newPosition,
        })
        .eq("registration_number", reg);

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
      const fee = await writeRankFee(context, reg, trigger);

      if (fee.error) {
        return {
          success: false,
          error: `Could not record rank fee: ${fee.error}`,
        };
      }

      // Double-click within 3s: status may already be Departed from first click
      if (!fee.written) {
        return {
          success: true,
          newStatus: vehicle.status === "Departed" ? "Departed" : vehicle.status,
          rankFeeWritten: false,
        };
      }

      const oldPos = vehicle.currentQueuePosition;

      const { error } = await admin
        .from("vehicles")
        .update({
          status: "Departed",
          current_queue_position: 0,
        })
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

      // Trip only when fee was written — keeps counts aligned
      await recordTrip({ ...vehicle, reg }, nowIso);

      return {
        success: true,
        newStatus: "Departed",
        rankFeeWritten: true,
      };
    }

    case "delay": {
      const { error } = await admin
        .from("vehicles")
        .update({ status: "Delayed" })
        .eq("registration_number", reg);

      if (error) return { success: false, error: error.message };

      if (reason) {
        await admin.from("notifications").insert({
          id: `notif_${Date.now()}`,
          timestamp: nowIso,
          type: "Push",
          recipient_name: null,
          recipient_phone: null,
          message: `Delay reported for ${reg}: ${reason}`,
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
        .eq("registration_number", reg);

      if (error) return { success: false, error: error.message };

      if (reason) {
        await admin.from("notifications").insert({
          id: `notif_${Date.now()}`,
          timestamp: nowIso,
          type: "Push",
          recipient_name: null,
          recipient_phone: null,
          message: `Breakdown reported for ${reg}: ${reason}`,
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
        .eq("registration_number", reg);

      if (error) return { success: false, error: error.message };
      return { success: true, newStatus: "Waiting" };
    }

    default:
      return { success: false, error: "Unknown action." };
  }
}
