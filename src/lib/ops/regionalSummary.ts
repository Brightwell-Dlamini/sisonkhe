/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Regional exception / pressure summary for national command-centre heat maps.
 * Lightweight aggregates — not a full per-region intelligence snapshot.
 */

import "server-only";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { evaluateCompliance } from "@/lib/domain/compliance";
import { log } from "@/lib/observability/log";

export interface RegionPressure {
  region: string;
  vehiclesInQueue: number;
  blockedFromLoad: number;
  waiting: number;
  loading: number;
  delayed: number;
  pressureScore: number;
}

export interface RegionalSummaryReport {
  generatedAt: string;
  regions: RegionPressure[];
  hottest: string | null;
}

export async function buildRegionalSummary(): Promise<RegionalSummaryReport> {
  const admin = createSupabaseAdminClient();
  const now = new Date();

  const { data: routes } = await admin
    .from("routes")
    .select("id, region_code")
    .limit(2000);

  const routeRegion = new Map<string, string>();
  for (const r of routes ?? []) {
    if (r.id && r.region_code) {
      routeRegion.set(String(r.id), String(r.region_code));
    }
  }

  const { data: vehicles } = await admin
    .from("vehicles")
    .select(
      "registration_number, status, current_queue_position, route_assignment_id, driver_id, permit_status, permit_expiry_date, cof_expiry_date, insurance_expiry, roadworthiness_expiry"
    )
    .neq("status", "Archived")
    .limit(5000);

  const byRegion = new Map<
    string,
    {
      waiting: number;
      loading: number;
      delayed: number;
      inQueue: number;
      blocked: number;
    }
  >();

  const ensure = (region: string) => {
    if (!byRegion.has(region)) {
      byRegion.set(region, {
        waiting: 0,
        loading: 0,
        delayed: 0,
        inQueue: 0,
        blocked: 0,
      });
    }
    return byRegion.get(region)!;
  };

  for (const v of vehicles ?? []) {
    const routeId = v.route_assignment_id
      ? routeRegion.get(String(v.route_assignment_id))
      : null;
    const region = routeId ?? "unassigned";
    const bucket = ensure(region);
    const status = String(v.status ?? "Waiting");

    if (status === "Waiting") bucket.waiting += 1;
    else if (status === "Loading") bucket.loading += 1;
    else if (status === "Delayed") bucket.delayed += 1;

    const inQueue =
      Number(v.current_queue_position ?? 0) > 0 ||
      ["Waiting", "Loading", "Delayed"].includes(status);

    if (!inQueue) continue;
    bucket.inQueue += 1;

    const report = evaluateCompliance({
      permitStatus: v.permit_status as string | null,
      permitExpiryDate: v.permit_expiry_date as string | null,
      cofExpiryDate: v.cof_expiry_date as string | null,
      insuranceExpiry: v.insurance_expiry as string | null,
      roadworthinessExpiry: v.roadworthiness_expiry as string | null,
      vehicleStatus: status,
      hasDriver: Boolean(v.driver_id),
    });

    if (report.blocksRankLoad) bucket.blocked += 1;
  }

  const regions: RegionPressure[] = Array.from(byRegion.entries()).map(
    ([region, b]) => {
      // Weighted pressure: blockers dominate, then delayed, then queue depth
      const pressureScore =
        b.blocked * 40 + b.delayed * 15 + b.loading * 5 + b.waiting * 2;
      return {
        region,
        vehiclesInQueue: b.inQueue,
        blockedFromLoad: b.blocked,
        waiting: b.waiting,
        loading: b.loading,
        delayed: b.delayed,
        pressureScore,
      };
    }
  );

  regions.sort((a, b) => b.pressureScore - a.pressureScore);

  const hottest =
    regions.length > 0 && regions[0].pressureScore > 0
      ? regions[0].region
      : null;

  log.info("ops.regional_summary", {
    regionCount: regions.length,
    hottest,
    topPressure: regions[0]?.pressureScore ?? 0,
  });

  return {
    generatedAt: now.toISOString(),
    regions: regions.slice(0, 20),
    hottest,
  };
}
