/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import "server-only";
import { createSupabaseAdminClient } from "../supabase/server";
import { autoResetStaleDeparted } from "./autoReset";

export interface MarshalContext {
  marshalId: string;
  fullName: string;
  region: string;
  terminalId: string | null;
  assignedRouteId: string | null;
}

export interface MarshalVehicle {
  registrationNumber: string;
  vic: string | null;
  make: string;
  model: string;
  seatingCapacity: number;
  classification: string;
  status: string;
  currentQueuePosition: number;
  loadingBay: string | null;
  routeId: string | null;
  routeOrigin: string | null;
  routeDestination: string | null;
  driverId: string | null;
  driverName: string | null;
  driverPhone: string | null;
  lastActive: string | null;
  // Rank Coach inputs
  permitStatus: string | null;
  permitExpiryDate: string | null;
  cofExpiryDate: string | null;
  insuranceExpiry: string | null;
  roadworthinessExpiry: string | null;
  driverStatus: string | null;
  driverPdpStatus: string | null;
  driverPdpExpiry: string | null;
  printPending: boolean;
}

export async function getMarshalContext(
  authUserId: string
): Promise<MarshalContext | null> {
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("marshals")
    .select(
      "id, first_name, surname, region, terminal_id, assigned_route_id, is_active"
    )
    .eq("auth_user_id", authUserId)
    .eq("is_active", true)
    .maybeSingle();

  if (error) {
    console.error("[marshal/queries] context error:", error);
    return null;
  }
  if (!data) return null;

  return {
    marshalId: data.id as string,
    fullName: `${data.first_name} ${data.surname}`.trim(),
    region: data.region as string,
    terminalId: (data.terminal_id as string | null) ?? null,
    assignedRouteId: (data.assigned_route_id as string | null) ?? null,
  };
}

async function routeIdsForMarshal(context: MarshalContext): Promise<string[]> {
  const admin = createSupabaseAdminClient();
  if (context.assignedRouteId) return [context.assignedRouteId];

  const { data: routes } = await admin
    .from("routes")
    .select("id")
    .ilike("region_code", context.region);
  return (routes ?? []).map((r) => r.id as string);
}

export async function listVehiclesForMarshal(
  context: MarshalContext
): Promise<MarshalVehicle[]> {
  const admin = createSupabaseAdminClient();
  const routeIds = await routeIdsForMarshal(context);
  if (routeIds.length === 0) return [];

  const { data: vehicles, error } = await admin
    .from("vehicles")
    .select(
      `
      registration_number, vic, make, model, seating_capacity, classification,
      status, current_queue_position, loading_bay,
      route_assignment_id, driver_id, updated_at,
      permit_status, permit_expiry_date, cof_expiry_date,
      insurance_expiry, roadworthiness_expiry
    `
    )
    .in("route_assignment_id", routeIds)
    .neq("status", "Offline")
    .neq("status", "Archived")
    .order("current_queue_position", { ascending: true })
    .order("registration_number", { ascending: true });

  if (error) {
    console.error("[marshal/queries] vehicles error:", error);
    return [];
  }

  let vehicleList = vehicles ?? [];

  try {
    const regs = vehicleList.map((v) => v.registration_number as string);
    const n = await autoResetStaleDeparted(admin, regs);
    if (n > 0) {
      const { data: refreshed } = await admin
        .from("vehicles")
        .select(
          `
          registration_number, vic, make, model, seating_capacity, classification,
          status, current_queue_position, loading_bay,
          route_assignment_id, driver_id, updated_at,
          permit_status, permit_expiry_date, cof_expiry_date,
          insurance_expiry, roadworthiness_expiry
        `
        )
        .in("route_assignment_id", routeIds)
        .neq("status", "Offline")
        .neq("status", "Archived")
        .order("current_queue_position", { ascending: true })
        .order("registration_number", { ascending: true });
      vehicleList = refreshed ?? vehicleList;
    }
  } catch (err) {
    console.warn("[marshal/queries] auto-reset skipped:", err);
  }

  const { data: routes } = await admin
    .from("routes")
    .select("id, origin, destination")
    .in("id", routeIds);

  const routeMap = new Map<string, { origin: string; destination: string }>();
  for (const r of routes ?? []) {
    routeMap.set(r.id as string, {
      origin: r.origin as string,
      destination: r.destination as string,
    });
  }

  const driverIds = vehicleList
    .map((v) => v.driver_id as string | null)
    .filter((id): id is string => !!id);

  const driverMap = new Map<
    string,
    {
      name: string;
      phone: string | null;
      status: string | null;
      pdpStatus: string | null;
      pdpExpiry: string | null;
    }
  >();
  if (driverIds.length > 0) {
    const { data: drivers } = await admin
      .from("drivers")
      .select("id, full_name, phone, status, pdp_status, pdp_expiry_date")
      .in("id", driverIds);
    for (const d of drivers ?? []) {
      driverMap.set(d.id as string, {
        name: d.full_name as string,
        phone: (d.phone as string | null) ?? null,
        status: (d.status as string | null) ?? null,
        pdpStatus: (d.pdp_status as string | null) ?? null,
        pdpExpiry: (d.pdp_expiry_date as string | null) ?? null,
      });
    }
  }

  // Batch print-pending: Approved renewals not yet Printed
  const regs = vehicleList.map((v) => v.registration_number as string);
  const printPendingSet = new Set<string>();
  if (regs.length > 0) {
    try {
      const { data: pending } = await admin
        .from("permit_renewal_requests")
        .select("vehicle_reg, status")
        .in("vehicle_reg", regs)
        .eq("status", "Approved");
      for (const p of pending ?? []) {
        printPendingSet.add(p.vehicle_reg as string);
      }
    } catch {
      /* ignore */
    }
  }

  return vehicleList.map((v) => {
    const routeId = v.route_assignment_id as string | null;
    const route = routeId ? routeMap.get(routeId) : null;
    const driverId = v.driver_id as string | null;
    const driver = driverId ? driverMap.get(driverId) : null;
    const reg = v.registration_number as string;

    return {
      registrationNumber: reg,
      vic: (v.vic as string | null) ?? null,
      make: v.make as string,
      model: v.model as string,
      seatingCapacity: v.seating_capacity as number,
      classification: v.classification as string,
      status: v.status as string,
      currentQueuePosition: (v.current_queue_position as number) ?? 0,
      loadingBay: (v.loading_bay as string | null) ?? null,
      routeId,
      routeOrigin: route?.origin ?? null,
      routeDestination: route?.destination ?? null,
      driverId,
      driverName: driver?.name ?? null,
      driverPhone: driver?.phone ?? null,
      lastActive: (v.updated_at as string | null) ?? null,
      permitStatus: (v.permit_status as string | null) ?? null,
      permitExpiryDate: (v.permit_expiry_date as string | null) ?? null,
      cofExpiryDate: (v.cof_expiry_date as string | null) ?? null,
      insuranceExpiry: (v.insurance_expiry as string | null) ?? null,
      roadworthinessExpiry: (v.roadworthiness_expiry as string | null) ?? null,
      driverStatus: driver?.status ?? null,
      driverPdpStatus: driver?.pdpStatus ?? null,
      driverPdpExpiry: driver?.pdpExpiry ?? null,
      printPending: printPendingSet.has(reg),
    };
  });
}

export interface MarshalSummary {
  dispatchedToday: number;
  feesCollectedToday: number;
  activeQueueLength: number;
  delayedCount: number;
  loadingCount: number;
  waitingCount: number;
}

export async function getMarshalSummary(
  context: MarshalContext
): Promise<MarshalSummary> {
  const admin = createSupabaseAdminClient();
  const today = new Date().toISOString().split("T")[0];

  const { data: txToday } = await admin
    .from("marshal_transactions")
    .select("amount_szl")
    .eq("marshal_id", context.marshalId)
    .eq("date", today);

  const feesCollectedToday = (txToday ?? []).reduce(
    (sum, t) => sum + Number(t.amount_szl ?? 0),
    0
  );
  const dispatchedToday = txToday?.length ?? 0;

  const routeIds = await routeIdsForMarshal(context);

  if (routeIds.length === 0) {
    return {
      dispatchedToday,
      feesCollectedToday,
      activeQueueLength: 0,
      delayedCount: 0,
      loadingCount: 0,
      waitingCount: 0,
    };
  }

  const { data: vehicles } = await admin
    .from("vehicles")
    .select("status, current_queue_position")
    .in("route_assignment_id", routeIds)
    .neq("status", "Offline")
    .neq("status", "Archived");

  const vehicleList = vehicles ?? [];
  const activeQueueLength = vehicleList.filter(
    (v) => (v.current_queue_position as number) > 0
  ).length;
  const delayedCount = vehicleList.filter((v) => v.status === "Delayed").length;
  const loadingCount = vehicleList.filter((v) => v.status === "Loading").length;
  const waitingCount = vehicleList.filter((v) => v.status === "Waiting").length;

  return {
    dispatchedToday,
    feesCollectedToday,
    activeQueueLength,
    delayedCount,
    loadingCount,
    waitingCount,
  };
}

export interface MarshalActivityItem {
  id: string;
  timestamp: string;
  vehicleReg: string;
  triggerSource: string;
  amountSzl: number;
}

export async function getMarshalActivity(
  context: MarshalContext,
  limit: number = 10
): Promise<MarshalActivityItem[]> {
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("marshal_transactions")
    .select("id, timestamp, vehicle_reg, trigger_source, amount_szl")
    .eq("marshal_id", context.marshalId)
    .order("timestamp", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("[marshal/queries] activity error:", error);
    return [];
  }

  return (data ?? []).map((row) => ({
    id: row.id as string,
    timestamp: row.timestamp as string,
    vehicleReg: row.vehicle_reg as string,
    triggerSource: row.trigger_source as string,
    amountSzl: Number(row.amount_szl ?? 0),
  }));
}
