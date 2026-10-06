/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
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
import { getRankFeeConfig } from "@/lib/domain/rankFee";
import { nextMarshalTxId } from "@/lib/domain/serials";
import { writeAudit } from "@/lib/domain/audit";

const IDEMPOTENCY_MS = 60_000; // 1 minute same vehicle+marshal

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
  revenueEstimated?: boolean;
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
  insuranceExpiry: string | null;
  roadworthinessExpiry: string | null;
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
  const compact = plate.replace(/\s+/g, "");

  let { data: vehicle } = await admin
    .from("vehicles")
    .select(
      "registration_number, route_assignment_id, status, current_queue_position, seating_capacity, driver_id, version, permit_status, permit_expiry_date, cof_expiry_date, insurance_expiry, roadworthiness_expiry"
    )
    .eq("registration_number", plate)
    .maybeSingle();

  if (!vehicle && compact) {
    const { data: candidates } = await admin
      .from("vehicles")
      .select(
        "registration_number, route_assignment_id, status, current_queue_position, seating_capacity, driver_id, version, permit_status, permit_expiry_date, cof_expiry_date, insurance_expiry, roadworthiness_expiry"
      )
      .ilike("registration_number", `%${compact.slice(0, 4)}%`)
      .limit(30);
    vehicle =
      (candidates ?? []).find(
        (r) =>
          String(r.registration_number)
            .toUpperCase()
            .replace(/\s+/g, "") === compact
      ) ?? null;
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
    insuranceExpiry: (vehicle.insurance_expiry as string | null) ?? null,
    roadworthinessExpiry:
      (vehicle.roadworthiness_expiry as string | null) ?? null,
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
    insuranceExpiry: vehicle.insuranceExpiry,
    roadworthinessExpiry: vehicle.roadworthinessExpiry,
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
  const feeCfg = await getRankFeeConfig(admin);
  const nowIso = new Date().toISOString();
  const date = nowIso.slice(0, 10);
  const month = nowIso.slice(0, 7);
  const sinceIso = new Date(Date.now() - IDEMPOTENCY_MS).toISOString();

  // Any successful fee for this vehicle in window (any marshal) blocks double-charge
  const { data: recent } = await admin
    .from("marshal_transactions")
    .select("id")
    .eq("vehicle_reg", registrationNumber)
    .gte("timestamp", sinceIso)
    .limit(1);
  if (recent && recent.length > 0) return { written: false };

  const txId = await nextMarshalTxId(admin, registrationNumber);
  const { error: txErr } = await admin.from("marshal_transactions").insert({
    id: txId,
    marshal_id: context.marshalId,
    timestamp: nowIso,
    date,
    month,
    vehicle_reg: registrationNumber,
    trigger_source: triggerSource,
    amount_szl: feeCfg.rankFee,
  });
  if (txErr) return { written: false, error: txErr.message };

  await admin.from("rank_fee_payments").insert({
    id: `rfp_${txId}`,
    timestamp: nowIso,
    vehicle_reg: registrationNumber,
    amount_szl: feeCfg.rankFee,
    payment_method: "Rank Fee (Operational)",
    transaction_ref: txId,
    status: "Recorded",
    allocation_operational: feeCfg.splitOperational,
    allocation_nrtc: feeCfg.splitNRTC,
    allocation_maintenance: feeCfg.splitMaintenance,
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
  nowIso: string,
  opts: { passengerCount: number | null; estimated: boolean }
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
  const hasCount = opts.passengerCount != null && opts.passengerCount > 0;
  const passengers = hasCount
    ? opts.passengerCount!
    : Math.max(1, vehicle.seatingCapacity);
  const revenue = hasCount ? fare * passengers : null;

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
    delay_reason: opts.estimated ? "passenger_count_estimated" : null,
    status: "Departed",
    revenue_szl: revenue,
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
  reason?: string,
  passengerCount?: number | null
): Promise<DispatchResult> {
  const vehicle = await authorizeVehicle(context, registrationNumber);
  if (!vehicle) {
    return {
      success: false,
      error: "Vehicle not found or not under your authority.",
    };
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
        .update({
          ...payload,
          version: vehicle.version + 1,
          updated_at: nowIso,
        })
        .eq("registration_number", reg)
        .eq("version", vehicle.version);
      if (error) return { success: false, error: error.message };
      await logSyncEvent(reg, "UPDATE", payload, vehicle.version, clientId);
      await writeAudit(admin, {
        action: "dispatch.load",
        actorId: context.marshalId,
        actorRole: "marshal",
        entityType: "vehicle",
        entityId: reg,
        summary: `Load ${reg}`,
      });
      return { success: true, newStatus: "Loading", warning: gate.warning };
    }

    case "full_cabin":
    case "depart": {
      const gate = canDispatchDepart(gatePayload(vehicle));
      if (!gate.eligible) return { success: false, error: gate.reason };

      const oldPos = vehicle.currentQueuePosition;
      const payload = { status: "Departed", current_queue_position: 0 };
      const { data: updated, error } = await admin
        .from("vehicles")
        .update({
          ...payload,
          version: vehicle.version + 1,
          updated_at: nowIso,
        })
        .eq("registration_number", reg)
        .eq("version", vehicle.version)
        .select("registration_number")
        .maybeSingle();

      if (error) return { success: false, error: error.message };
      if (!updated) {
        return {
          success: false,
          error: "Vehicle changed under you — refresh and try again.",
        };
      }

      // Fee ONLY after status transition succeeds
      const trigger =
        action === "full_cabin" ? "Full Cabin Button" : "Depart Button";
      const fee = await writeRankFee(context, reg, trigger);

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

      const estimated =
        passengerCount == null || !(passengerCount > 0);
      await recordTrip(
        { ...vehicle, reg },
        nowIso,
        { passengerCount: passengerCount ?? null, estimated }
      );
      await logSyncEvent(reg, "UPDATE", payload, vehicle.version, clientId);
      await writeAudit(admin, {
        action: "dispatch.depart",
        actorId: context.marshalId,
        actorRole: "marshal",
        entityType: "vehicle",
        entityId: reg,
        summary: `Depart ${reg}`,
        meta: {
          estimatedPassengers: estimated,
          rankFeeWritten: fee.written,
        },
      });
      return {
        success: true,
        newStatus: "Departed",
        rankFeeWritten: fee.written,
        warning: gate.warning,
        revenueEstimated: estimated,
      };
    }

    case "delay": {
      const payload = { status: "Delayed" };
      const { error } = await admin
        .from("vehicles")
        .update({
          ...payload,
          version: vehicle.version + 1,
          updated_at: nowIso,
        })
        .eq("registration_number", reg);
      if (error) return { success: false, error: error.message };
      await logSyncEvent(reg, "UPDATE", payload, vehicle.version, clientId);
      await writeAudit(admin, {
        action: "dispatch.delay",
        actorId: context.marshalId,
        actorRole: "marshal",
        entityType: "vehicle",
        entityId: reg,
        summary: `Delay ${reg}${reason ? `: ${reason}` : ""}`,
      });
      return { success: true, newStatus: "Delayed" };
    }

    case "breakdown": {
      const payload = { status: "Breakdown", current_queue_position: 0 };
      const { error } = await admin
        .from("vehicles")
        .update({
          ...payload,
          version: vehicle.version + 1,
          updated_at: nowIso,
        })
        .eq("registration_number", reg);
      if (error) return { success: false, error: error.message };
      await logSyncEvent(reg, "UPDATE", payload, vehicle.version, clientId);
      await writeAudit(admin, {
        action: "dispatch.breakdown",
        actorId: context.marshalId,
        actorRole: "marshal",
        entityType: "vehicle",
        entityId: reg,
        summary: `Breakdown ${reg}`,
      });
      return { success: true, newStatus: "Breakdown" };
    }

    case "reset_to_waiting": {
      const payload = { status: "Waiting", current_queue_position: 0 };
      const { error } = await admin
        .from("vehicles")
        .update({
          ...payload,
          version: vehicle.version + 1,
          updated_at: nowIso,
        })
        .eq("registration_number", reg);
      if (error) return { success: false, error: error.message };
      await logSyncEvent(reg, "UPDATE", payload, vehicle.version, clientId);
      await writeAudit(admin, {
        action: "dispatch.reset",
        actorId: context.marshalId,
        actorRole: "marshal",
        entityType: "vehicle",
        entityId: reg,
        summary: `Reset ${reg} to Waiting`,
      });
      return { success: true, newStatus: "Waiting" };
    }

    default:
      return { success: false, error: "Unknown action." };
  }
}
