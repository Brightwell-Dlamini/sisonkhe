/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Year-over-year comparison for a route. Since we don't have historical
 * trip data yet, this returns the current cycle's projected deltas against
 * a synthetic baseline. When trips accumulate, we swap the baseline for
 * real data.
 */

import "server-only";
import { createSupabaseAdminClient } from "../supabase/server";

export interface YoYMetric {
  label: string;
  thisYear: number;
  lastYear: number;
  delta: number;
  deltaPct: number;
}

export interface YoYView {
  routeId: string;
  routeLabel: string;
  year: number;
  compareYear: number;
  metrics: YoYMetric[];
  leadTimeline: Array<{
    year: number;
    leadVehicleReg: string | null;
  }>;
}

export async function getYoYView(
  routeId: string,
  year: number,
  compareYear: number
): Promise<YoYView | null> {
  const admin = createSupabaseAdminClient();

  const { data: route } = await admin
    .from("routes")
    .select("id, origin, destination, base_fare_e")
    .eq("id", routeId)
    .maybeSingle();

  if (!route) return null;

  // Count trips this year vs last year
  const thisYearStart = `${year}-01-01`;
  const thisYearEnd = `${year}-12-31`;
  const lastYearStart = `${compareYear}-01-01`;
  const lastYearEnd = `${compareYear}-12-31`;

  const { count: thisTrips } = await admin
    .from("trips")
    .select("*", { count: "exact", head: true })
    .eq("route_id", routeId)
    .gte("date", thisYearStart)
    .lte("date", thisYearEnd);

  const { count: lastTrips } = await admin
    .from("trips")
    .select("*", { count: "exact", head: true })
    .eq("route_id", routeId)
    .gte("date", lastYearStart)
    .lte("date", lastYearEnd);

  const { data: thisYearData } = await admin
    .from("trips")
    .select("passenger_count, revenue_szl")
    .eq("route_id", routeId)
    .gte("date", thisYearStart)
    .lte("date", thisYearEnd);

  const { data: lastYearData } = await admin
    .from("trips")
    .select("passenger_count, revenue_szl")
    .eq("route_id", routeId)
    .gte("date", lastYearStart)
    .lte("date", lastYearEnd);

  const thisPassengers = (thisYearData ?? []).reduce(
    (s, t) => s + Number(t.passenger_count ?? 0),
    0
  );
  const thisRevenue = (thisYearData ?? []).reduce(
    (s, t) => s + Number(t.revenue_szl ?? 0),
    0
  );
  const lastPassengers = (lastYearData ?? []).reduce(
    (s, t) => s + Number(t.passenger_count ?? 0),
    0
  );
  const lastRevenue = (lastYearData ?? []).reduce(
    (s, t) => s + Number(t.revenue_szl ?? 0),
    0
  );

  const delta = (a: number, b: number) => a - b;
  const pct = (a: number, b: number) => (b === 0 ? 0 : Math.round(((a - b) / b) * 1000) / 10);

  return {
    routeId: route.id as string,
    routeLabel: `${route.origin} → ${route.destination}`,
    year,
    compareYear,
    metrics: [
      {
        label: "Dispatches",
        thisYear: thisTrips ?? 0,
        lastYear: lastTrips ?? 0,
        delta: delta(thisTrips ?? 0, lastTrips ?? 0),
        deltaPct: pct(thisTrips ?? 0, lastTrips ?? 0),
      },
      {
        label: "Passengers",
        thisYear: thisPassengers,
        lastYear: lastPassengers,
        delta: delta(thisPassengers, lastPassengers),
        deltaPct: pct(thisPassengers, lastPassengers),
      },
      {
        label: "Revenue (SZL)",
        thisYear: Math.round(thisRevenue),
        lastYear: Math.round(lastRevenue),
        delta: delta(Math.round(thisRevenue), Math.round(lastRevenue)),
        deltaPct: pct(Math.round(thisRevenue), Math.round(lastRevenue)),
      },
    ],
    leadTimeline: [],
  };
}
