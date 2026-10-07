/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Expanded system health snapshot for ops / super-admin.
 */

import "server-only";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { getStoreBackendName } from "@/lib/fleetStore";
import { getLatestSeq } from "@/lib/sync/server";

export type CheckStatus = "ok" | "warn" | "fail" | "skip";

export interface HealthCheck {
  name: string;
  status: CheckStatus;
  detail?: string;
  latencyMs?: number;
}

export interface SystemHealthReport {
  status: "ok" | "degraded" | "down";
  service: string;
  version: string;
  timestamp: string;
  latencyMs: number;
  environment: string;
  checks: HealthCheck[];
  metrics: {
    latestSyncSeq: number;
    syncEventsLastHour: number;
    openInvariantViolations: number;
    pendingRankFees: number;
    legacyStoreBackend: string;
  };
}

export async function buildSystemHealth(): Promise<SystemHealthReport> {
  const started = Date.now();
  const checks: HealthCheck[] = [];
  let latestSyncSeq = 0;
  let syncEventsLastHour = 0;
  let openInvariantViolations = 0;
  let pendingRankFees = 0;
  let legacyStore = "unknown";

  try {
    legacyStore = getStoreBackendName();
    checks.push({
      name: "legacy_fleet_store",
      status: legacyStore === "error" ? "fail" : "ok",
      detail: `backend=${legacyStore} (deprecated)`,
    });
  } catch {
    legacyStore = "error";
    checks.push({ name: "legacy_fleet_store", status: "fail" });
  }

  const sbStart = Date.now();
  try {
    const admin = createSupabaseAdminClient();
    const { error } = await admin.from("staff").select("id").limit(1);
    checks.push({
      name: "supabase",
      status: error ? "fail" : "ok",
      detail: error?.message,
      latencyMs: Date.now() - sbStart,
    });

    if (!error) {
      try {
        latestSyncSeq = await getLatestSeq();
        const hourAgo = new Date(Date.now() - 3600000).toISOString();
        const { count } = await admin
          .from("sync_events")
          .select("id", { count: "exact", head: true })
          .gte("applied_at", hourAgo);
        syncEventsLastHour = count ?? 0;
        checks.push({
          name: "event_sync",
          status: "ok",
          detail: `seq=${latestSyncSeq} · lastHour=${syncEventsLastHour}`,
        });
      } catch (err) {
        checks.push({
          name: "event_sync",
          status: "warn",
          detail: err instanceof Error ? err.message : "sync metrics failed",
        });
      }

      try {
        const { count } = await admin
          .from("invariant_violations")
          .select("id", { count: "exact", head: true })
          .is("resolved_at", null);
        openInvariantViolations = count ?? 0;
        checks.push({
          name: "invariants",
          status: openInvariantViolations > 50 ? "warn" : "ok",
          detail: `open=${openInvariantViolations}`,
        });
      } catch {
        checks.push({ name: "invariants", status: "skip" });
      }

      try {
        const { count } = await admin
          .from("rank_fee_payments")
          .select("id", { count: "exact", head: true })
          .eq("status", "Pending");
        pendingRankFees = count ?? 0;
        checks.push({
          name: "rank_fees_pending",
          status: pendingRankFees > 20 ? "warn" : "ok",
          detail: `pending=${pendingRankFees}`,
        });
      } catch {
        checks.push({ name: "rank_fees_pending", status: "skip" });
      }
    }
  } catch {
    checks.push({ name: "supabase", status: "fail", latencyMs: Date.now() - sbStart });
  }

  if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
    const rStart = Date.now();
    try {
      const res = await fetch(`${process.env.UPSTASH_REDIS_REST_URL}/ping`, {
        headers: {
          Authorization: `Bearer ${process.env.UPSTASH_REDIS_REST_TOKEN}`,
        },
        cache: "no-store",
      });
      checks.push({
        name: "upstash_redis",
        status: res.ok ? "ok" : "warn",
        latencyMs: Date.now() - rStart,
      });
    } catch {
      checks.push({
        name: "upstash_redis",
        status: "warn",
        detail: "unreachable",
        latencyMs: Date.now() - rStart,
      });
    }
  } else {
    checks.push({ name: "upstash_redis", status: "skip", detail: "not configured" });
  }

  const hasFail = checks.some((c) => c.status === "fail");
  const hasWarn = checks.some((c) => c.status === "warn");
  const status = hasFail ? "down" : hasWarn ? "degraded" : "ok";

  return {
    status: status === "down" ? "down" : status === "degraded" ? "degraded" : "ok",
    service: "Sisonkhe In Transit",
    version: "1.1.0",
    timestamp: new Date().toISOString(),
    latencyMs: Date.now() - started,
    environment:
      process.env.VERCEL_ENV || process.env.NODE_ENV || "development",
    checks,
    metrics: {
      latestSyncSeq,
      syncEventsLastHour,
      openInvariantViolations,
      pendingRankFees,
      legacyStoreBackend: legacyStore,
    },
  };
}
