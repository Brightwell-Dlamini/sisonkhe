/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Telemetry — computed from real DB metadata + server metrics.
 */

import "server-only";
import { createSupabaseAdminClient } from "../supabase/server";

export interface TelemetrySnapshot {
  uptimeSeconds: number;
  serverTime: string;
  nodeVersion: string;
  dbLatencyMs: number;
  dbTables: number;
  syncEvents1h: number;
  activeClients24h: number;
  memoryMb: number;
  cpuCount: number;
}

export async function getTelemetry(): Promise<TelemetrySnapshot> {
  const admin = createSupabaseAdminClient();
  const start = Date.now();

  // Ping DB
  await admin.from("regions").select("code").limit(1);
  const dbLatency = Date.now() - start;

  const now = new Date();
  const since1h = new Date(now.getTime() - 3600 * 1000).toISOString();
  const since24h = new Date(now.getTime() - 24 * 3600 * 1000).toISOString();

  const { count: syncCount } = await admin
    .from("sync_events")
    .select("*", { count: "exact", head: true })
    .gte("applied_at", since1h);

  const { data: clients } = await admin
    .from("sync_events")
    .select("client_id")
    .gte("applied_at", since24h);

  const uniqueClients = new Set((clients ?? []).map((c) => c.client_id));

  const mem = process.memoryUsage();

  return {
    uptimeSeconds: Math.floor(process.uptime()),
    serverTime: now.toISOString(),
    nodeVersion: process.version,
    dbLatencyMs: dbLatency,
    dbTables: 25, // approximate
    syncEvents1h: syncCount ?? 0,
    activeClients24h: uniqueClients.size,
    memoryMb: Math.round(mem.heapUsed / 1024 / 1024),
    cpuCount: require("os").cpus().length,
  };
}
