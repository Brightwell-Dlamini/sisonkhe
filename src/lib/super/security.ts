/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import "server-only";
import { createSupabaseAdminClient } from "../supabase/server";

export interface SecurityThreat {
  id: string;
  timestamp: string;
  ipAddress: string;
  event: string;
  severity: "Low" | "Medium" | "High";
  status: "Investigating" | "Blocked" | "Ignored";
}

export async function listThreats(): Promise<SecurityThreat[]> {
  // Threats are derived from sync_events with suspicious patterns
  // In a real system, this comes from an IDS. For now, we synthesize
  // from the sync_events table — looking for high frequency from one client.
  const admin = createSupabaseAdminClient();
  const { data: events } = await admin
    .from("sync_events")
    .select("client_id, applied_at")
    .order("applied_at", { ascending: false })
    .limit(500);

  const clientCounts = new Map<string, number>();
  for (const e of events ?? []) {
    const cid = e.client_id as string;
    clientCounts.set(cid, (clientCounts.get(cid) ?? 0) + 1);
  }

  const threats: SecurityThreat[] = [];
  let idx = 0;
  for (const [clientId, count] of clientCounts.entries()) {
    if (count >= 20) {
      threats.push({
        id: `threat-${idx++}`,
        timestamp: new Date().toISOString(),
        ipAddress: clientId.startsWith("dev-") ? "N/A" : clientId,
        event: `Elevated sync activity (${count} events from same client)`,
        severity: count >= 50 ? "High" : "Medium",
        status: "Investigating",
      });
    }
  }
  return threats;
}

export async function getIpLists(): Promise<{
  whitelist: string[];
  blacklist: string[];
}> {
  const admin = createSupabaseAdminClient();
  const { data } = await admin
    .from("system_config")
    .select("key, value")
    .in("key", ["ip_whitelist", "ip_blacklist"]);

  const map = new Map<string, any>();
  for (const row of data ?? []) map.set(row.key as string, row.value);

  return {
    whitelist: (map.get("ip_whitelist") as string[] | undefined) ?? [],
    blacklist: (map.get("ip_blacklist") as string[] | undefined) ?? [],
  };
}

export async function setIpLists(input: {
  whitelist?: string[];
  blacklist?: string[];
}): Promise<{ success: boolean; error?: string }> {
  const admin = createSupabaseAdminClient();
  const updates: Array<{ key: string; value: any }> = [];
  if (input.whitelist) updates.push({ key: "ip_whitelist", value: input.whitelist });
  if (input.blacklist) updates.push({ key: "ip_blacklist", value: input.blacklist });

  for (const u of updates) {
    const { error } = await admin
      .from("system_config")
      .upsert({ key: u.key, value: u.value, updated_at: new Date().toISOString() });
    if (error) return { success: false, error: error.message };
  }
  return { success: true };
}
