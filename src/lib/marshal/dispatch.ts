/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Marshal dispatch. The ONLY writer of rank operational statuses.
 */

import "server-only";
import { createSupabaseAdminClient } from "../supabase/server";
import type { MarshalContext } from "./queries";
import {
  canMarshalTransition,
  type MarshalAction,
  type VehicleStatus,
} from "@/lib/domain/vehicleStatus";
import { canDispatchLoad, canDispatchDepart } from "@/lib/domain/eligibility";
import { normalizePlate } from "@/lib/domain/identity";
import { getRankFeeConfig } from "@/lib/domain/rankFee";
import { writeAudit } from "@/lib/domain/audit";

export type DispatchAction = MarshalAction;

export interface DispatchResult {
  success: boolean;
  error?: string;
  rankFeeWritten?: boolean;
  newStatus?: VehicleStatus;
  warning?: string;
  revenueEstimated?: boolean;
}

type AuthVehicle = {
  reg: string;
  routeId: string | null;
  status: VehicleStatus;
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

function regionMatch(a: string | null | undefined, b: string | null | undefined) {
  return (a ?? "").trim().toLowerCase() === (b ?? "").trim().toLowerCase();
}

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
      if (!route || !regionMatch(route.region_code as string, context.region))
        return null;
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
      .select("id, printed_at")
      .eq("vehicle_reg", vehicle.registration_number as string)
      .eq("status", "Approved")
      .limit(5);
    printPending = !!(pendingPrint ?? []).some(
      (r) => !(r as { printed_at?: string | null }).printed_at
    );
  } catch {
    // Column may not exist — fall back to any Approved row
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
  }

  return {
    reg: vehicle.registration_number as string,
    routeId,
    status: (vehicle.status as VehicleStatus) ?? "Waiting",
    currentQueuePosition: (vehicle.current_queue_position as number) ?? 0,
    seatingCapacity: (vehicle.seating_capacity as number) ?? 15,
    driverId,
    version: (vehicle.version as number) ?? 1,
    permitStatus: (vehicle.permit_status as string | null) ?? null,
    permitExpiryDate: (vehicle.permit_expiry_date as string | null) ?? null,
    cofExpiryDate: (vehicle.cof_expiry_date as string | null) ?? null,
    insuranceExpiry: (vehicle.insurance_expiry as string | null) ?? null,
    roadworthinessExpiry: (vehicle.roadworthiness_expiry as string | null) ?? null,
    driverStatus,
    driverPdpStatus,
    driverPdpExpiry,
    printPending,
  };
}

function gatePayload(v: AuthVehicle) {
  return {
    hasDriver: !!v.driverId,
    driverStatus: v.driverStatus,
    driverPdpStatus: v.driverPdpStatus,
    driverPdpExpiry: v.driverPdpExpiry,
    permitStatus: v.permitStatus,
    permitExpiryDate: v.permitExpiryDate,
    cofExpiryDate: v.cofExpiryDate,
    insuranceExpiry: v.insuranceExpiry,
    roadworthinessExpiry: v.roadworthinessExpiry,
    vehicleStatus: v.status,
    printPending: v.printPending,
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

  const { data, error } = await admin.rpc("record_rank_fee", {
    p_marshal_id: context.marshalId,
    p_vehicle_reg: registrationNumber,
    p_trigger_source: triggerSource,
    p_amount_szl: feeCfg.rankFee,
    p_allocation_operational: feeCfg.splitOperational,
    p_allocation_nrtc: feeCfg.splitNRTC,
    p_allocation_maintenance: feeCfg.splitMaintenance,
  });

  if (error) {
    return { written: false, error: error.message };
  }

  const result = data as {
    written?: boolean;
    reason?: string;
    tx_id?: string;
  } | null;
  if (!result || result.written !== true) {
    return { written: false };
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

  // Never use sentinel "unassigned" — null is honest
  await admin.from("trips").insert({
    id: `trip_${Date.now()}_${vehicle.reg.replace(/\s+/g, "")}`,
    date: now.toISOString().slice(0, 10),
    departure_time: now.toISOString().slice(11, 16),
    arrival_time: null,
    route_id: vehicle.routeId,
    vehicle_reg: vehicle.reg,
    driver_id: vehicle.driverId || null,
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

async function consumeDriverSignals(reg: string): Promise<void> {
  const admin = createSupabaseAdminClient();
  await admin
    .from("driver_signals")
    .update({ status: "consumed", consumed_at: new Date().toISOString() })
    .eq("vehicle_reg", reg)
    .eq("status", "pending");
}

async function optimisticUpdate(
  reg: string,
  version: number,
  payload: Record<string, unknown>,
  nowIso: string
): Promise<{ ok: boolean; error?: string; conflict?: boolean }> {
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("vehicles")
    .update({ ...payload, version: version + 1, updated_at: nowIso })
    .eq("registration_number", reg)
    .eq("version", version)
    .select("registration_number")
    .maybeSingle();

  if (error) return { ok: false, error: error.message };
  if (!data) {
    return {
      ok: false,
      conflict: true,
      error: "Vehicle changed under you — refresh and try again.",
    };
  }
  return { ok: true };
}

async function shiftQueue(
  routeId: string | null,
  fromPos: number
): Promise<void> {
  if (!routeId || fromPos <= 0) return;
  const admin = createSupabaseAdminClient();
  try {
    await admin.rpc("shift_queue_forward", {
      p_route_id: routeId,
      p_from_position: fromPos,
    });
  } catch {
    /* best-effort */
  }
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

  const transition = canMarshalTransition(vehicle.status, action);
  if (!transition.ok) {
    return { success: false, error: (transition as { ok: false; reason: string }).reason };
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
        newPosition =
          (await countQueuedOnRoute(vehicle.routeId ?? "", reg)) + 1;
      }
      const payload = {
        status: "Loading",
        current_queue_position: newPosition,
      };
      const up = await optimisticUpdate(reg, vehicle.version, payload, nowIso);
      if (!up.ok) return { success: false, error: up.error };

      await logSyncEvent(reg, "UPDATE", payload, vehicle.version, clientId);
      await consumeDriverSignals(reg);
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
      const up = await optimisticUpdate(reg, vehicle.version, payload, nowIso);
      if (!up.ok) return { success: false, error: up.error };

      const trigger =
        action === "full_cabin" ? "Full Cabin Button" : "Depart Button";
      const fee = await writeRankFee(context, reg, trigger);

      await shiftQueue(vehicle.routeId, oldPos);

      const estimated = passengerCount == null || !(passengerCount > 0);
      await recordTrip(
        { ...vehicle, reg },
        nowIso,
        { passengerCount: passengerCount ?? null, estimated }
      );
      await logSyncEvent(reg, "UPDATE", payload, vehicle.version, clientId);
      await consumeDriverSignals(reg);
      await writeAudit(admin, {
        action: "dispatch.depart",
        actorId: context.marshalId,
        actorRole: "marshal",
        entityType: "vehicle",
        entityId: reg,
        summary: `Depart ${reg}`,
        meta: { estimatedPassengers: estimated, rankFeeWritten: fee.written },
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
      const payload = { status: "Delayed" as const };
      const up = await optimisticUpdate(reg, vehicle.version, payload, nowIso);
      if (!up.ok) return { success: false, error: up.error };
      await logSyncEvent(reg, "UPDATE", payload, vehicle.version, clientId);
      await consumeDriverSignals(reg);
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
      const oldPos = vehicle.currentQueuePosition;
      const payload = {
        status: "Breakdown" as const,
        current_queue_position: 0,
      };
      const up = await optimisticUpdate(reg, vehicle.version, payload, nowIso);
      if (!up.ok) return { success: false, error: up.error };

      await shiftQueue(vehicle.routeId, oldPos);

      await logSyncEvent(reg, "UPDATE", payload, vehicle.version, clientId);
      await consumeDriverSignals(reg);
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
      const payload = {
        status: "Waiting" as const,
        current_queue_position: 0,
      };
      const up = await optimisticUpdate(reg, vehicle.version, payload, nowIso);
      if (!up.ok) return { success: false, error: up.error };
      await logSyncEvent(reg, "UPDATE", payload, vehicle.version, clientId);
      await consumeDriverSignals(reg);
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
