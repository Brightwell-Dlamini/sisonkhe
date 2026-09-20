/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Trip and settlement queries.
 *
 * Role scoping:
 *   - super-admin, fleet-manager: full national access, can filter by region
 *   - admin: scoped to their own region
 */

import "server-only";
import { createSupabaseAdminClient } from "../supabase/server";
import type { ResolvedUser } from "../auth/roles";

// ---------------------------------------------------------------------------
// Scoping helpers
// ---------------------------------------------------------------------------

export interface LedgerScope {
  regions: string[] | null; // null = national
  staffRegion: string | null;
}

export function getLedgerScope(user: ResolvedUser): LedgerScope {
  if (user.role === "super-admin" || user.role === "fleet-manager") {
    return { regions: null, staffRegion: null };
  }
  if (user.role === "admin" && user.region) {
    return { regions: [user.region], staffRegion: user.region };
  }
  // Fallback: no access
  return { regions: [], staffRegion: null };
}

// ---------------------------------------------------------------------------
// Filter types
// ---------------------------------------------------------------------------

export interface TripFilters {
  fromDate: string; // YYYY-MM-DD
  toDate: string; // YYYY-MM-DD
  region?: string; // optional; ignored if scope is regional
  routeId?: string;
  vehicleReg?: string;
  driverId?: string;
  page: number; // 1-indexed
  pageSize: number;
}

export interface TripRow {
  id: string;
  date: string;
  departureTime: string;
  arrivalTime: string | null;
  routeId: string;
  routeOrigin: string | null;
  routeDestination: string | null;
  region: string | null;
  vehicleReg: string;
  driverId: string;
  driverName: string | null;
  passengerCount: number;
  revenueSzl: number;
  status: string;
}

export interface TripListResult {
  trips: TripRow[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// ---------------------------------------------------------------------------
// Trip list
// ---------------------------------------------------------------------------

export async function listTrips(
  scope: LedgerScope,
  filters: TripFilters
): Promise<TripListResult> {
  const admin = createSupabaseAdminClient();

  // 1. Get route ids in scope
  let routeQuery = admin.from("routes").select("id, origin, destination, region_code");
  if (scope.regions !== null) {
    if (scope.regions.length === 0) {
      return { trips: [], total: 0, page: 1, pageSize: filters.pageSize, totalPages: 0 };
    }
    routeQuery = routeQuery.in("region_code", scope.regions);
  }
  if (filters.region) {
    routeQuery = routeQuery.eq("region_code", filters.region);
  }
  if (filters.routeId) {
    routeQuery = routeQuery.eq("id", filters.routeId);
  }

  const { data: routes } = await routeQuery;
  const routeList = routes ?? [];
  const routeIds = routeList.map((r) => r.id as string);

  if (routeIds.length === 0) {
    return { trips: [], total: 0, page: 1, pageSize: filters.pageSize, totalPages: 0 };
  }

  const routeMap = new Map<string, { origin: string; destination: string; region: string }>();
  for (const r of routeList) {
    routeMap.set(r.id as string, {
      origin: r.origin as string,
      destination: r.destination as string,
      region: r.region_code as string,
    });
  }

  // 2. Build trip query
  let q = admin
    .from("trips")
    .select(
      "id, date, departure_time, arrival_time, route_id, vehicle_reg, driver_id, passenger_count, revenue_szl, status",
      { count: "exact" }
    )
    .gte("date", filters.fromDate)
    .lte("date", filters.toDate)
    .in("route_id", routeIds);

  if (filters.vehicleReg) {
    q = q.eq("vehicle_reg", filters.vehicleReg);
  }
  if (filters.driverId) {
    q = q.eq("driver_id", filters.driverId);
  }

  const from = (filters.page - 1) * filters.pageSize;
  const to = from + filters.pageSize - 1;

  const { data, error, count } = await q
    .order("date", { ascending: false })
    .order("departure_time", { ascending: false })
    .range(from, to);

  if (error) {
    console.error("[ledger] listTrips error:", error);
    throw new Error(`Failed to list trips: ${error.message}`);
  }

  const trips = data ?? [];

  // 3. Join driver names
  const driverIds = Array.from(new Set(trips.map((t) => t.driver_id as string)));
  const driverMap = new Map<string, string>();
  if (driverIds.length > 0) {
    const { data: drivers } = await admin
      .from("drivers")
      .select("id, full_name")
      .in("id", driverIds);
    for (const d of drivers ?? []) {
      driverMap.set(d.id as string, d.full_name as string);
    }
  }

  const result: TripRow[] = trips.map((t) => {
    const routeId = t.route_id as string;
    const route = routeMap.get(routeId);
    return {
      id: t.id as string,
      date: t.date as string,
      departureTime: t.departure_time as string,
      arrivalTime: (t.arrival_time as string | null) ?? null,
      routeId,
      routeOrigin: route?.origin ?? null,
      routeDestination: route?.destination ?? null,
      region: route?.region ?? null,
      vehicleReg: t.vehicle_reg as string,
      driverId: t.driver_id as string,
      driverName: driverMap.get(t.driver_id as string) ?? null,
      passengerCount: (t.passenger_count as number) ?? 0,
      revenueSzl: Number(t.revenue_szl ?? 0),
      status: t.status as string,
    };
  });

  const total = count ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / filters.pageSize));

  return {
    trips: result,
    total,
    page: filters.page,
    pageSize: filters.pageSize,
    totalPages,
  };
}

// ---------------------------------------------------------------------------
// Settlement summary
// ---------------------------------------------------------------------------

export interface SettlementSummary {
  totalCollected: number;
  totalDispatches: number;
  allocationOperational: number;
  allocationNrtc: number;
  allocationMaintenance: number;
  totalDistributed: number;
  balance: number; // should be 0
  byMarshal: Array<{
    marshalId: string;
    marshalName: string;
    region: string;
    dispatchCount: number;
    totalCollected: number;
  }>;
  byVehicle: Array<{
    vehicleReg: string;
    vic: string | null;
    dispatchCount: number;
    totalCollected: number;
  }>;
  byRoute: Array<{
    routeId: string;
    origin: string;
    destination: string;
    region: string;
    dispatchCount: number;
    totalCollected: number;
  }>;
}

export async function getSettlementSummary(
  scope: LedgerScope,
  fromDate: string,
  toDate: string,
  region?: string
): Promise<SettlementSummary> {
  const admin = createSupabaseAdminClient();

  // 1. Determine route ids in scope
  let routeQuery = admin.from("routes").select("id, origin, destination, region_code");
  if (scope.regions !== null) {
    if (scope.regions.length === 0) {
      return emptySettlement();
    }
    routeQuery = routeQuery.in("region_code", scope.regions);
  }
  if (region) {
    routeQuery = routeQuery.eq("region_code", region);
  }

  const { data: routes } = await routeQuery;
  const routeList = routes ?? [];
  const routeIds = routeList.map((r) => r.id as string);

  if (routeIds.length === 0) {
    return emptySettlement();
  }

  const routeMap = new Map<string, { origin: string; destination: string; region: string }>();
  for (const r of routeList) {
    routeMap.set(r.id as string, {
      origin: r.origin as string,
      destination: r.destination as string,
      region: r.region_code as string,
    });
  }

  // 2. Fetch trips in the range on those routes
  const { data: trips } = await admin
    .from("trips")
    .select("id, route_id, vehicle_reg, passenger_count, revenue_szl")
    .gte("date", fromDate)
    .lte("date", toDate)
    .in("route_id", routeIds);

  const tripList = trips ?? [];

  // 3. Fetch rank_fee_payments in the same range (via trips' vehicle+date)
  // We filter payments by timestamp -> date range
  const fromIso = `${fromDate}T00:00:00.000Z`;
  const toIso = `${toDate}T23:59:59.999Z`;

  const { data: payments } = await admin
    .from("rank_fee_payments")
    .select(
      "id, timestamp, vehicle_reg, amount_szl, allocation_operational, allocation_nrtc, allocation_maintenance"
    )
    .gte("timestamp", fromIso)
    .lte("timestamp", toIso)
    .eq("status", "Success");

  const paymentList = payments ?? [];

  // Only keep payments for vehicles in scope
  const inScopeVehicles = new Set(tripList.map((t) => t.vehicle_reg as string));
  const scopedPayments = paymentList.filter((p) =>
    inScopeVehicles.has(p.vehicle_reg as string)
  );

  // 4. Compute aggregates
  let totalCollected = 0;
  let allocationOperational = 0;
  let allocationNrtc = 0;
  let allocationMaintenance = 0;

  for (const p of scopedPayments) {
    totalCollected += Number(p.amount_szl ?? 0);
    allocationOperational += Number(p.allocation_operational ?? 0);
    allocationNrtc += Number(p.allocation_nrtc ?? 0);
    allocationMaintenance += Number(p.allocation_maintenance ?? 0);
  }

  const totalDistributed =
    allocationOperational + allocationNrtc + allocationMaintenance;
  const balance = totalCollected - totalDistributed;

  // 5. Group by vehicle
  const byVehicleMap = new Map<
    string,
    { dispatchCount: number; totalCollected: number }
  >();
  for (const p of scopedPayments) {
    const reg = p.vehicle_reg as string;
    const cur = byVehicleMap.get(reg) ?? { dispatchCount: 0, totalCollected: 0 };
    cur.dispatchCount += 1;
    cur.totalCollected += Number(p.amount_szl ?? 0);
    byVehicleMap.set(reg, cur);
  }

  // Enrich with VIC
  const byVehicleRegs = Array.from(byVehicleMap.keys());
  const { data: vehicleRows } = byVehicleRegs.length > 0
    ? await admin
        .from("vehicles")
        .select("registration_number, vic")
        .in("registration_number", byVehicleRegs)
    : { data: [] };

  const vicMap = new Map<string, string | null>();
  for (const v of vehicleRows ?? []) {
    vicMap.set(v.registration_number as string, (v.vic as string | null) ?? null);
  }

  const byVehicle = Array.from(byVehicleMap.entries())
    .map(([reg, stats]) => ({
      vehicleReg: reg,
      vic: vicMap.get(reg) ?? null,
      dispatchCount: stats.dispatchCount,
      totalCollected: stats.totalCollected,
    }))
    .sort((a, b) => b.totalCollected - a.totalCollected);

  // 6. Group by marshal
  const { data: marshalTx } = await admin
    .from("marshal_transactions")
    .select("marshal_id, amount_szl")
    .gte("date", fromDate)
    .lte("date", toDate);

  const marshalTotals = new Map<string, { count: number; total: number }>();
  for (const tx of marshalTx ?? []) {
    const mid = tx.marshal_id as string;
    const cur = marshalTotals.get(mid) ?? { count: 0, total: 0 };
    cur.count += 1;
    cur.total += Number(tx.amount_szl ?? 0);
    marshalTotals.set(mid, cur);
  }

  const marshalIds = Array.from(marshalTotals.keys());
  const byMarshal: SettlementSummary["byMarshal"] = [];
  if (marshalIds.length > 0) {
    const { data: marshalRows } = await admin
      .from("marshals")
      .select("id, first_name, surname, region")
      .in("id", marshalIds);

    for (const m of marshalRows ?? []) {
      const stats = marshalTotals.get(m.id as string);
      if (!stats) continue;
      if (scope.regions !== null && scope.regions.length > 0) {
        if (!scope.regions.includes(m.region as string)) continue;
      }
      byMarshal.push({
        marshalId: m.id as string,
        marshalName: `${m.first_name} ${m.surname}`.trim(),
        region: m.region as string,
        dispatchCount: stats.count,
        totalCollected: stats.total,
      });
    }
    byMarshal.sort((a, b) => b.totalCollected - a.totalCollected);
  }

  // 7. Group by route (via trips)
  const byRouteMap = new Map<string, { count: number; total: number }>();
  for (const t of tripList) {
    const rid = t.route_id as string;
    const cur = byRouteMap.get(rid) ?? { count: 0, total: 0 };
    cur.count += 1;
    cur.total += Number(t.revenue_szl ?? 0);
    byRouteMap.set(rid, cur);
  }

  const byRoute = Array.from(byRouteMap.entries())
    .map(([rid, stats]) => {
      const route = routeMap.get(rid);
      return {
        routeId: rid,
        origin: route?.origin ?? "—",
        destination: route?.destination ?? "—",
        region: route?.region ?? "—",
        dispatchCount: stats.count,
        totalCollected: stats.total,
      };
    })
    .sort((a, b) => b.dispatchCount - a.dispatchCount);

  return {
    totalCollected,
    totalDispatches: scopedPayments.length,
    allocationOperational,
    allocationNrtc,
    allocationMaintenance,
    totalDistributed,
    balance,
    byMarshal,
    byVehicle,
    byRoute,
  };
}

function emptySettlement(): SettlementSummary {
  return {
    totalCollected: 0,
    totalDispatches: 0,
    allocationOperational: 0,
    allocationNrtc: 0,
    allocationMaintenance: 0,
    totalDistributed: 0,
    balance: 0,
    byMarshal: [],
    byVehicle: [],
    byRoute: [],
  };
}
