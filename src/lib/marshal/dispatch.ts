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

/**
 * Validate that the calling marshal has authority over this vehicle.
 * Returns the vehicle row if valid, null otherwise.
 */
async function authorizeVehicle(
  context: MarshalContext,
  registrationNumber: string
): Promise<{
  reg: string;
  routeId: string | null;
  status: string;
  currentQueuePosition: number;
  seatingCapacity: number;
} | null> {
  const admin = createSupabaseAdminClient();

  const { data: vehicle, error } = await admin
    .from("vehicles")
    .select(
      "registration_number, route_assignment_id, status, current_queue_position, seating_capacity"
    )
    .eq("registration_number", registrationNumber)
    .maybeSingle();

  if (error || !vehicle) return null;

  // Authorization: marshal must be assigned to the vehicle's route or the route's region
  const routeId = vehicle.route_assignment_id as string | null;
  if (routeId) {
    if (context.assignedRouteId) {
      if (routeId !== context.assignedRouteId) return null;
    } else {
      // Fall back to region check
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
  };
}

/**
 * Count queued vehicles on the same route.
 */
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
 * Write a rank fee transaction + a payment record. Idempotent per (vehicle, today, trigger).
 *
 * Returns the receipt id if written, or null if already written today for the same trigger.
 */
async function writeRankFee(
  context: MarshalContext,
  registrationNumber: string,
  triggerSource: "Full Cabin Button" | "Depart Button"
): Promise<{ written: boolean; receiptRef?: string }> {
  const admin = createSupabaseAdminClient();
  const now = new Date();
  const dateStr = now.toISOString().split("T")[0];
  const monthStr = dateStr.substring(0, 7);

  // Idempotency: only one rank fee per vehicle per trigger per day
  const { data: existing } = await admin
    .from("marshal_transactions")
    .select("id")
    .eq("vehicle_reg", registrationNumber)
    .eq("date", dateStr)
    .eq("trigger_source", triggerSource)
    .maybeSingle();

  if (existing) {
    return { written: false };
  }

  const txId = `mtx_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
  const receiptRef = `CLOAK-${Math.floor(100000 + Math.random() * 900000)}`;

  // 1. Marshal transaction (the marshal's ledger)
  const { error: txErr } = await admin.from("marshal_transactions").insert({
    id: txId,
    marshal_id: context.marshalId,
    timestamp: now.toISOString(),
    date: dateStr,
    month: monthStr,
    vehicle_reg: registrationNumber,
    amount_szl: RANK_FEE_SZL,
    trigger_source: triggerSource,
  });

  if (txErr) {
    console.error("[marshal/dispatch] rank fee insert error:", txErr);
    return { written: false };
  }

  // 2. Rank fee payment (the system-wide ledger)
  const paymentId = `pay_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
  await admin.from("rank_fee_payments").insert({
    id: paymentId,
    timestamp: now.toISOString(),
    vehicle_reg: registrationNumber,
    amount_szl: RANK_FEE_SZL,
    payment_method: "Cash",
    transaction_ref: receiptRef,
    status: "Success",
    allocation_operational: 20.0,
    allocation_nrtc: 3.5,
    allocation_maintenance: 1.5,
  });

  return { written: true, receiptRef };
}

/**
 * Apply a dispatch action. Idempotent-ish: calling twice is safe.
 */
export async function applyDispatchAction(
  context: MarshalContext,
  registrationNumber: string,
  action: DispatchAction,
  reason?: string
): Promise<DispatchResult> {
  const vehicle = await authorizeVehicle(context, registrationNumber);
  if (!vehicle) {
    return { success: false, error: "Vehicle not found or not in your terminal." };
  }

  const admin = createSupabaseAdminClient();
  const now = new Date();
  const nowIso = now.toISOString();

  switch (action) {
    case "load": {
      // Move to Loading. Advance its queue position to 1 if not already queued.
      let newPosition = vehicle.currentQueuePosition;
      if (!newPosition || newPosition < 1) {
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
      // Write rank fee, then immediately transition to Departed.
      const fee = await writeRankFee(context, registrationNumber, "Full Cabin Button");

      // Advance the queue: everyone behind shifts forward by 1
      const oldPos = vehicle.currentQueuePosition;
      const newPos = 0; // Departed leaves the queue

      const { error } = await admin
        .from("vehicles")
        .update({
          status: "Departed",
          current_queue_position: newPos,
        })
        .eq("registration_number", registrationNumber);

      if (error) return { success: false, error: error.message };

      // Shift everyone behind forward
      if (oldPos > 0 && vehicle.routeId) {
        await admin.rpc("shift_queue_forward", {
          p_route_id: vehicle.routeId,
          p_from_position: oldPos,
        }).then(() => { /* best-effort */ });
      }

      return {
        success: true,
        newStatus: "Departed",
        rankFeeWritten: fee.written,
      };
    }

    case "depart": {
      // Straight departure — still writes a rank fee (per current business rule).
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
        // Best-effort queue shift
        await admin.rpc("shift_queue_forward", {
          p_route_id: vehicle.routeId,
          p_from_position: oldPos,
        }).catch(() => {});
      }

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

      // Log notification (optional — informational)
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
