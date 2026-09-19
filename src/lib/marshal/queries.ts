/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Marshal-scoped queries. Every function here resolves the caller's marshal
 * assignment first, then scopes all data to that terminal/region.
 */

import "server-only";
import { createSupabaseAdminClient } from "../supabase/server";

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
}

/**
 * Resolve the calling marshal's context by auth user id.
 * Returns null if the auth user isn't a marshal.
 */
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

/**
 * Get all vehicles visible to this marshal.
 *
 * Scoping (Phase 5a):
 *   - Match the marshal's assigned_route_id if set (preferred, narrow)
 *   - Otherwise, match all routes in the marshal's region
 *
 * Sort order: current_queue_position ASC (0 = unqueued, appears last),
 * then registration number.
 */
export async function listVehiclesForMarshal(
  context: MarshalContext
): Promise<MarshalVehicle[]> {
  const admin = createSupabaseAdminClient();

  // 1. Find candidate routes
  let routeIds: string[] = [];
  if (context.assignedRouteId) {
    routeIds = [context.assignedRouteId];
  } else {
    const { data: routes } = await admin
      .from("routes")
      .select("id")
      .eq("region_code", context.region);
    routeIds = (routes ?? []).map((r) => r.id as string);
  }

  if (routeIds.length === 0) return [];

  // 2. Fetch vehicles on those routes, exclude Offline
  const { data: vehicles, error } = await admin
    .from("vehicles")
    .select(
      `
      registration_number, vic, make, model, seating_capacity, classification,
      status, current_queue_position, loading_bay,
      route_assignment_id, driver_id
    `
    )
    .in("route_assignment_id", routeIds)
    .neq("status", "Offline")
    .order("current_queue_position", { ascending: true })
    .order("registration_number", { ascending: true });

  if (error) {
    console.error("[marshal/queries] vehicles error:", error);
    return [];
  }

  const vehicleList = vehicles ?? [];

  // 3. Join route details
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

  // 4. Join driver details
  const driverIds = vehicleList
    .map((v) => v.driver_id as string | null)
    .filter((id): id is string => !!id);

  const driverMap = new Map<string, { name: string; phone: string | null }>();
  if (driverIds.length > 0) {
    const { data: drivers } = await admin
      .from("drivers")
      .select("id, full_name, phone")
      .in("id", driverIds);
    for (const d of drivers ?? []) {
      driverMap.set(d.id as string, {
        name: d.full_name as string,
        phone: (d.phone as string | null) ?? null,
      });
    }
  }

  return vehicleList.map((v) => {
    const routeId = v.route_assignment_id as string | null;
    const route = routeId ? routeMap.get(routeId) : null;
    const driverId = v.driver_id as string | null;
    const driver = driverId ? driverMap.get(driverId) : null;

    return {
      registrationNumber: v.registration_number as string,
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
      lastActive: null, // TODO: track last_active in a future sub-phase
    };
  });
}

/**
 * Today's summary metrics for this marshal.
 */
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

  // 1. Fees collected today
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

  // 2. Current queue counts (visible to this marshal)
  let routeIds: string[] = [];
  if (context.assignedRouteId) {
    routeIds = [context.assignedRouteId];
  } else {
    const { data: routes } = await admin
      .from("routes")
      .select("id")
      .eq("region_code", context.region);
    routeIds = (routes ?? []).map((r) => r.id as string);
  }

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
    .neq("status", "Offline");

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

/**
 * Recent dispatch activity for this marshal (last N events).
 */
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
