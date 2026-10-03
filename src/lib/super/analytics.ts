/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Live analytics. Real reads from the DB.
 */

import "server-only";
import { createSupabaseAdminClient } from "../supabase/server";

export interface AnalyticsSnapshot {
  totals: {
    vehicles: number;
    drivers: number;
    operators: number;
    marshals: number;
    staff: number;
    trips: number;
    incidents: number;
    tickets: number;
    renewals: number;
    payments: number;
  };
  last24h: {
    dispatches: number;
    revenue: number;
    newTrips: number;
    newIncidents: number;
    newTickets: number;
  };
  regions: Array<{
    code: string;
    vehicles: number;
    routes: number;
    trips30d: number;
    revenue30d: number;
  }>;
  topRoutes: Array<{
    routeId: string;
    label: string;
    region: string;
    trips: number;
    revenue: number;
  }>;
}

export async function getAnalyticsSnapshot(): Promise<AnalyticsSnapshot> {
  const admin = createSupabaseAdminClient();
  const now = new Date();
  const since24h = new Date(now.getTime() - 24 * 3600 * 1000).toISOString();
  const since30d = new Date(now.getTime() - 30 * 86400 * 1000)
    .toISOString()
    .split("T")[0];

  const [
    vehiclesCount,
    driversCount,
    operatorsCount,
    marshalsCount,
    staffCount,
    tripsCount,
    incidentsCount,
    ticketsCount,
    renewalsCount,
    paymentsCount,
  ] = await Promise.all([
    admin.from("vehicles").select("*", { count: "exact", head: true }),
    admin.from("drivers").select("*", { count: "exact", head: true }),
    admin.from("fleet_operators").select("*", { count: "exact", head: true }),
    admin.from("marshals").select("*", { count: "exact", head: true }),
    admin.from("staff").select("*", { count: "exact", head: true }),
    admin.from("trips").select("*", { count: "exact", head: true }),
    admin.from("incidents").select("*", { count: "exact", head: true }),
    admin.from("traffic_tickets").select("*", { count: "exact", head: true }),
    admin.from("permit_renewal_requests").select("*", { count: "exact", head: true }),
    admin.from("rank_fee_payments").select("*", { count: "exact", head: true }),
  ]);

  // 24h metrics
  const { data: recentPayments } = await admin
    .from("rank_fee_payments")
    .select("amount_szl, timestamp")
    .gte("timestamp", since24h);

  const { count: newTrips } = await admin
    .from("trips")
    .select("*", { count: "exact", head: true })
    .gte("date", since24h.split("T")[0]);

  const { count: newIncidents } = await admin
    .from("incidents")
    .select("*", { count: "exact", head: true })
    .gte("timestamp", since24h);

  const { count: newTickets } = await admin
    .from("traffic_tickets")
    .select("*", { count: "exact", head: true })
    .gte("timestamp", since24h);

  const dispatches24 = recentPayments?.length ?? 0;
  const revenue24 = (recentPayments ?? []).reduce(
    (s, p) => s + Number(p.amount_szl ?? 0),
    0
  );

  // Regions
  const { data: regions } = await admin.from("regions").select("code");
  const regionsList = (regions ?? []).map((r) => r.code as string);

  const regionsAnalytics = await Promise.all(
    regionsList.map(async (code) => {
      const { data: routes } = await admin
        .from("routes")
        .select("id")
        .eq("region_code", code);
      const routeIds = (routes ?? []).map((r) => r.id as string);

      const { count: vehicleCount } = await admin
        .from("vehicles")
        .select("*", { count: "exact", head: true })
        .in("route_assignment_id", routeIds);

      const { data: trips } = routeIds.length > 0
        ? await admin
            .from("trips")
            .select("revenue_szl")
            .in("route_id", routeIds)
            .gte("date", since30d)
        : { data: [] as any[] };

      return {
        code,
        vehicles: vehicleCount ?? 0,
        routes: routeIds.length,
        trips30d: trips?.length ?? 0,
        revenue30d: (trips ?? []).reduce(
          (s, t) => s + Number(t.revenue_szl ?? 0),
          0
        ),
      };
    })
  );

  // Top routes
  const { data: topTrips } = await admin
    .from("trips")
    .select("route_id, revenue_szl")
    .gte("date", since30d);

  const routeAgg = new Map<string, { trips: number; revenue: number }>();
  for (const t of topTrips ?? []) {
    const rid = t.route_id as string;
    const cur = routeAgg.get(rid) ?? { trips: 0, revenue: 0 };
    cur.trips += 1;
    cur.revenue += Number(t.revenue_szl ?? 0);
    routeAgg.set(rid, cur);
  }

  const { data: allRoutes } = await admin
    .from("routes")
    .select("id, origin, destination, region_code");

  const routeMap = new Map<string, { label: string; region: string }>();
  for (const r of allRoutes ?? []) {
    routeMap.set(r.id as string, {
      label: `${r.origin} → ${r.destination}`,
      region: r.region_code as string,
    });
  }

  const topRoutes = Array.from(routeAgg.entries())
    .map(([rid, stats]) => ({
      routeId: rid,
      label: routeMap.get(rid)?.label ?? rid,
      region: routeMap.get(rid)?.region ?? "—",
      trips: stats.trips,
      revenue: stats.revenue,
    }))
    .sort((a, b) => b.trips - a.trips)
    .slice(0, 10);

  return {
    totals: {
      vehicles: vehiclesCount.count ?? 0,
      drivers: driversCount.count ?? 0,
      operators: operatorsCount.count ?? 0,
      marshals: marshalsCount.count ?? 0,
      staff: staffCount.count ?? 0,
      trips: tripsCount.count ?? 0,
      incidents: incidentsCount.count ?? 0,
      tickets: ticketsCount.count ?? 0,
      renewals: renewalsCount.count ?? 0,
      payments: paymentsCount.count ?? 0,
    },
    last24h: {
      dispatches: dispatches24,
      revenue: revenue24,
      newTrips: newTrips ?? 0,
      newIncidents: newIncidents ?? 0,
      newTickets: newTickets ?? 0,
    },
    regions: regionsAnalytics,
    topRoutes,
  };
}
