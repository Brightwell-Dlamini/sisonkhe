/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Heuristic diagnostic assistant. Queries real data, produces readable answers.
 */

import "server-only";
import { createSupabaseAdminClient } from "../supabase/server";

export interface AssistantResponse {
  query: string;
  answer: string;
  bullets: string[];
}

export async function runAssistantQuery(query: string): Promise<AssistantResponse> {
  const admin = createSupabaseAdminClient();
  const q = query.toLowerCase();

  // Expired / expiring permits
  if (q.includes("permit") || q.includes("expir")) {
    const today = new Date().toISOString().split("T")[0];
    const in30 = new Date(Date.now() + 30 * 86400000).toISOString().split("T")[0];

    const { data: expiring } = await admin
      .from("vehicles")
      .select("registration_number, permit_expiry_date, owner_name")
      .gte("permit_expiry_date", today)
      .lte("permit_expiry_date", in30);

    const { data: expired } = await admin
      .from("vehicles")
      .select("registration_number, permit_expiry_date, owner_name")
      .lt("permit_expiry_date", today);

    return {
      query,
      answer: `${expired?.length ?? 0} permits are expired and ${expiring?.length ?? 0} expire within 30 days.`,
      bullets: [
        ...(expired ?? []).slice(0, 5).map(
          (v) => `EXPIRED: ${v.registration_number} (${v.owner_name}) — ${v.permit_expiry_date}`
        ),
        ...(expiring ?? []).slice(0, 5).map(
          (v) => `EXPIRING SOON: ${v.registration_number} (${v.owner_name}) — ${v.permit_expiry_date}`
        ),
      ],
    };
  }

  // Security
  if (q.includes("security") || q.includes("threat")) {
    const { data: events } = await admin
      .from("sync_events")
      .select("client_id")
      .gte("applied_at", new Date(Date.now() - 3600 * 1000).toISOString());

    const clientCounts = new Map<string, number>();
    for (const e of events ?? []) {
      const cid = e.client_id as string;
      clientCounts.set(cid, (clientCounts.get(cid) ?? 0) + 1);
    }
    const suspicious = Array.from(clientCounts.entries()).filter(
      ([, c]) => c >= 20
    );

    return {
      query,
      answer: `${suspicious.length} client(s) show elevated activity in the last hour.`,
      bullets: suspicious.slice(0, 5).map(([cid, c]) => `${cid}: ${c} events`),
    };
  }

  // System health
  if (q.includes("health") || q.includes("status") || q.includes("error")) {
    const { count: pending } = await admin
      .from("system_errors")
      .select("*", { count: "exact", head: true })
      .eq("status", "Pending");

    const { count: resolved } = await admin
      .from("system_errors")
      .select("*", { count: "exact", head: true })
      .eq("status", "Resolved");

    return {
      query,
      answer: `${pending ?? 0} errors pending, ${resolved ?? 0} resolved.`,
      bullets: [],
    };
  }

  // Default
  const { count: vehicles } = await admin
    .from("vehicles")
    .select("*", { count: "exact", head: true });
  const { count: drivers } = await admin
    .from("drivers")
    .select("*", { count: "exact", head: true });
  const { count: trips } = await admin
    .from("trips")
    .select("*", { count: "exact", head: true });

  return {
    query,
    answer: `System status: ${vehicles ?? 0} vehicles, ${drivers ?? 0} drivers, ${trips ?? 0} trips logged.`,
    bullets: [],
  };
}
