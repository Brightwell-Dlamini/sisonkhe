/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Heuristic diagnostic assistant powered by the intelligence snapshot.
 */

import "server-only";
import { createSupabaseAdminClient } from "../supabase/server";
import type { ResolvedUser } from "../auth/roles";
import { buildIntelligenceSnapshot } from "../intelligence/snapshot";

export interface AssistantResponse {
  query: string;
  answer: string;
  bullets: string[];
}

export async function runAssistantQuery(
  query: string,
  user?: ResolvedUser | null
): Promise<AssistantResponse> {
  const q = query.toLowerCase();

  if (user) {
    try {
      const snap = await buildIntelligenceSnapshot(user);

      if (
        q.includes("what should") ||
        q.includes("next") ||
        q.includes("priority") ||
        q.includes("do now") ||
        q.includes("focus")
      ) {
        const top = snap.queue.slice(0, 8);
        return {
          query,
          answer: snap.briefing,
          bullets: top.map(
            (w) => `[${w.severity.toUpperCase()}] ${w.title} — ${w.detail}`
          ),
        };
      }

      if (q.includes("risk") || q.includes("threat") || q.includes("exposure")) {
        return {
          query,
          answer:
            snap.risks.length === 0
              ? "No elevated risk signals in the current window."
              : `${snap.risks.length} active risk signal${snap.risks.length === 1 ? "" : "s"}.`,
          bullets: snap.risks.map((r) => `${r.label}: ${r.value} — ${r.detail}`),
        };
      }

      if (
        q.includes("permit") ||
        q.includes("expir") ||
        q.includes("cof") ||
        q.includes("compliance")
      ) {
        const k = snap.kpis;
        return {
          query,
          answer: `${k.permitsExpired} expired permits, ${k.permitsExpiring30d} within 30 days, ${k.cofExpired} expired COF, ${k.renewalsPending} renewals pending.`,
          bullets: snap.queue
            .filter((w) =>
              [
                "permit_expired",
                "permit_expiring",
                "cof_expired",
                "cof_expiring",
                "renewal_pending",
              ].includes(w.kind)
            )
            .slice(0, 10)
            .map((w) => `${w.title} — ${w.detail}`),
        };
      }

      if (q.includes("queue") || q.includes("work") || q.includes("backlog")) {
        return {
          query,
          answer: `${snap.queue.length} ranked work items. ${snap.primaryAction ? `Primary: ${snap.primaryAction.label}.` : ""}`,
          bullets: snap.queue.slice(0, 10).map((w) => `${w.title} — ${w.detail}`),
        };
      }

      if (
        q.includes("status") ||
        q.includes("health") ||
        q.includes("summary") ||
        q.trim().length < 12
      ) {
        const k = snap.kpis;
        return {
          query,
          answer: snap.briefing,
          bullets: [
            `Fleet: ${k.vehiclesTotal} vehicles · ${k.driversTotal} drivers · ${k.operatorsTotal} operators`,
            `Compliance: ${k.permitsExpired} expired permits · ${k.cofExpired} expired COF`,
            `Pipeline: ${k.renewalsPending} renewals · ${k.printQueueOpen} print candidates`,
            `Assignment: ${k.vehiclesUnassigned} vehicles without drivers · ${k.driversSuspended} suspended`,
            ...(snap.primaryAction
              ? [`Next: ${snap.primaryAction.label} — ${snap.primaryAction.reason}`]
              : []),
          ],
        };
      }
    } catch (err) {
      console.warn("[assistant] snapshot failed, falling back:", err);
    }
  }

  const admin = createSupabaseAdminClient();

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
          (v) =>
            `EXPIRED: ${v.registration_number} (${v.owner_name}) — ${v.permit_expiry_date}`
        ),
        ...(expiring ?? []).slice(0, 5).map(
          (v) =>
            `EXPIRING SOON: ${v.registration_number} (${v.owner_name}) — ${v.permit_expiry_date}`
        ),
      ],
    };
  }

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
    const suspicious = Array.from(clientCounts.entries()).filter(([, c]) => c >= 20);

    return {
      query,
      answer: `${suspicious.length} client(s) show elevated activity in the last hour.`,
      bullets: suspicious.slice(0, 5).map(([cid, c]) => `${cid}: ${c} events`),
    };
  }

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
