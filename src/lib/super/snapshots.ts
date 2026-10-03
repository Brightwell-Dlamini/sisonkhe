/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import "server-only";
import { createSupabaseAdminClient } from "../supabase/server";

export interface Snapshot {
  id: string;
  timestamp: string;
  label: string;
  sizeKb: number;
  entityCounts: Record<string, number>;
}

export async function listSnapshots(): Promise<Snapshot[]> {
  const admin = createSupabaseAdminClient();
  const { data } = await admin
    .from("system_snapshots")
    .select("id, timestamp, label, size_kb, entity_counts")
    .order("timestamp", { ascending: false })
    .limit(20);

  return (data ?? []).map((s) => ({
    id: s.id as string,
    timestamp: s.timestamp as string,
    label: s.label as string,
    sizeKb: Number(s.size_kb ?? 0),
    entityCounts: (s.entity_counts as Record<string, number>) ?? {},
  }));
}

export async function createSnapshot(
  label: string,
  userId: string
): Promise<{ success: boolean; id?: string; error?: string }> {
  const admin = createSupabaseAdminClient();
  const tables = [
    "regions",
    "routes",
    "vehicles",
    "drivers",
    "fleet_operators",
    "marshals",
    "trips",
    "traffic_tickets",
    "incidents",
  ];

  const snapshot: Record<string, unknown[]> = {};
  const counts: Record<string, number> = {};

  for (const t of tables) {
    const { data } = await admin.from(t).select("*").limit(1000);
    snapshot[t] = data ?? [];
    counts[t] = data?.length ?? 0;
  }

  const json = JSON.stringify(snapshot);
  const sizeKb = Math.round(Buffer.byteLength(json, "utf8") / 1024);
  const id = `snap-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

  const { error } = await admin.from("system_snapshots").insert({
    id,
    label,
    size_kb: sizeKb,
    entity_counts: counts,
    snapshot_data: snapshot,
    created_by: userId,
  });

  if (error) return { success: false, error: error.message };
  return { success: true, id };
}
