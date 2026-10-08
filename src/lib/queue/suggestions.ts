/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Rank queue intelligence — suggestions for marshals.
 * Heuristic fairness + readiness scoring (no ML dependency).
 */

import "server-only";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { daysUntil } from "@/lib/intelligence/rules";

export type SuggestionKind =
  | "load_next"
  | "skip_compliance"
  | "balance_operator"
  | "stale_queue"
  | "unassigned_driver";

export interface QueueSuggestion {
  id: string;
  kind: SuggestionKind;
  severity: "info" | "medium" | "high" | "critical";
  title: string;
  detail: string;
  vehicleReg: string | null;
  routeId: string | null;
  score: number;
  action?: "advance" | "reorder" | "hold" | "assign_driver";
}

export interface QueueIntelligenceResult {
  generatedAt: string;
  routeId: string | null;
  terminalId: string | null;
  queueLength: number;
  suggestions: QueueSuggestion[];
  recommendedNext: string | null;
}

export type QueueReadiness = "ready" | "review" | "hold";

export interface QueueCandidateScore {
  score: number;
  readiness: QueueReadiness;
  reasons: string[];
}

interface VehicleQueueRow {
  registration_number: string;
  status: string | null;
  current_queue_position: number | null;
  driver_id: string | null;
  owner_operator_id: string | null;
  permit_status: string | null;
  permit_expiry_date: string | null;
  cof_expiry_date: string | null;
  route_assignment_id: string | null;
  updated_at: string | null;
}

export function scoreQueueCandidate(
  row: Pick<
    VehicleQueueRow,
    | "registration_number"
    | "status"
    | "current_queue_position"
    | "driver_id"
    | "owner_operator_id"
    | "permit_status"
    | "permit_expiry_date"
    | "cof_expiry_date"
    | "updated_at"
  >,
  context?: {
    now?: Date;
    queueLength?: number;
    operatorCounts?: Map<string, number>;
  }
): QueueCandidateScore {
  const now = context?.now ?? new Date();
  const queueLength = Math.max(1, context?.queueLength ?? 1);
  const opCount = context?.operatorCounts?.get(row.owner_operator_id ?? "unknown") ?? 0;
  const opShare = queueLength > 0 ? opCount / queueLength : 0;

  let score = 50;
  const reasons: string[] = [];

  if (row.driver_id) {
    score += 25;
  } else {
    score -= 35;
    reasons.push("no driver");
  }

  if (row.permit_status === "Expired" || row.permit_status === "Suspended") {
    score -= 60;
    reasons.push("expired or suspended permit");
  } else {
    const permitDays = daysUntil(row.permit_expiry_date, now);
    if (permitDays !== null && permitDays <= 14) {
      score -= permitDays <= 0 ? 50 : 15;
      reasons.push(`permit expiring in ${permitDays} day${permitDays === 1 ? "" : "s"}`);
    }
  }

  const cofDays = daysUntil(row.cof_expiry_date, now);
  if (cofDays !== null && cofDays <= 30) {
    score -= cofDays <= 0 ? 35 : 12;
    reasons.push(`COF expiring in ${cofDays} day${cofDays === 1 ? "" : "s"}`);
  }

  if (row.current_queue_position != null) {
    if (row.current_queue_position <= 2) score += 8;
    else if (row.current_queue_position >= 8) score -= 10;
  }

  if (row.updated_at) {
    const ageMs = now.getTime() - new Date(row.updated_at).getTime();
    if (ageMs > 4 * 60 * 60 * 1000) {
      score -= 12;
      reasons.push("stale queue state");
    }
  }

  if (opShare > 0.55) {
    score -= 12;
    reasons.push("operator concentration is high");
  } else if (opShare < 0.25) {
    score += 8;
  }

  const clamp = (value: number): number => Math.max(0, Math.min(100, value));
  score = clamp(score);

  let readiness: QueueReadiness = "ready";
  if (score < 40 || reasons.some((reason) => /expired|no driver|stale/i.test(reason))) {
    readiness = "hold";
  } else if (score < 70 || reasons.length > 0) {
    readiness = "review";
  }

  return { score, readiness, reasons };
}

/**
 * Build ranked suggestions for a route (or whole terminal when routeId is null).
 */
export async function buildQueueSuggestions(opts: {
  routeId?: string | null;
  terminalId?: string | null;
  region?: string | null;
}): Promise<QueueIntelligenceResult> {
  const admin = createSupabaseAdminClient();
  const now = new Date();
  const suggestions: QueueSuggestion[] = [];

  let q = admin
    .from("vehicles")
    .select(
      "registration_number, status, current_queue_position, driver_id, owner_operator_id, permit_status, permit_expiry_date, cof_expiry_date, route_assignment_id, updated_at"
    )
    .in("status", ["Waiting", "Loading", "At Rank", "Queued"])
    .order("current_queue_position", { ascending: true })
    .limit(200);

  if (opts.routeId) {
    q = q.eq("route_assignment_id", opts.routeId);
  }

  const { data } = await q;
  let rows = (data ?? []) as VehicleQueueRow[];

  rows = rows.filter(
    (r) =>
      r.current_queue_position != null &&
      Number(r.current_queue_position) >= 0
  );

  const queueLength = rows.length;

  const operatorTripCounts = new Map<string, number>();
  try {
    const today = now.toISOString().slice(0, 10);
    const { data: trips } = await admin
      .from("trips")
      .select("vehicle_reg, status")
      .eq("date", today)
      .neq("status", "Cancelled")
      .limit(2000);
    const regToOp = new Map(
      rows.map((r) => [
        r.registration_number,
        r.owner_operator_id ?? "unknown",
      ])
    );
    for (const t of trips ?? []) {
      const reg = String(t.vehicle_reg ?? "");
      const op = regToOp.get(reg);
      if (op) {
        operatorTripCounts.set(op, (operatorTripCounts.get(op) ?? 0) + 1);
      }
    }
  } catch {
    // Fairness is advisory only
  }

  const opCounts = new Map<string, number>();
  for (const r of rows) {
    const op = r.owner_operator_id ?? "unknown";
    opCounts.set(op, (opCounts.get(op) ?? 0) + 1);
  }

  const scored = rows.map((r, index) => {
    const evaluated = scoreQueueCandidate(r, {
      now,
      queueLength: rows.length,
      operatorCounts: opCounts,
    });

    const op = r.owner_operator_id ?? "unknown";
    const tripsToday = operatorTripCounts.get(op) ?? 0;
    const score = evaluated.score + Math.max(0, 8 - tripsToday) - index;
    const blocked = evaluated.readiness === "hold";

    return { row: r, score, blocked, tripsToday, index, reasons: evaluated.reasons };
  });

  scored.sort((a, b) => b.score - a.score);

  const recommended =
    scored.find((s) => !s.blocked)?.row.registration_number ?? null;

  if (recommended) {
    const front = rows[0]?.registration_number;
    if (front && front !== recommended) {
      suggestions.push({
        id: `load-next-${recommended}`,
        kind: "load_next",
        severity: "info",
        title: `Prefer ${recommended} for next load`,
        detail:
          front === recommended
            ? "Front of queue is ready."
            : `${front} is at the front but ${recommended} scores higher on readiness/fairness.`,
        vehicleReg: recommended,
        routeId: opts.routeId ?? null,
        score: 90,
        action: "advance",
      });
    } else if (recommended) {
      suggestions.push({
        id: `load-next-${recommended}`,
        kind: "load_next",
        severity: "info",
        title: `Next load: ${recommended}`,
        detail: "Front of queue is compliant and has a driver.",
        vehicleReg: recommended,
        routeId: opts.routeId ?? null,
        score: 85,
        action: "advance",
      });
    }
  }

  for (const s of scored.filter((x) => x.blocked).slice(0, 8)) {
    const r = s.row;
    const reasons: string[] = [];
    if (!r.driver_id) reasons.push("no driver");
    const permitDays = daysUntil(r.permit_expiry_date, now);
    const cofDays = daysUntil(r.cof_expiry_date, now);
    if (r.permit_status === "Expired" || (permitDays !== null && permitDays < 0))
      reasons.push("expired permit");
    if (r.permit_status === "Suspended") reasons.push("suspended permit");
    if (cofDays !== null && cofDays < 0) reasons.push("expired COF");

    suggestions.push({
      id: `skip-${r.registration_number}`,
      kind: reasons.includes("no driver")
        ? "unassigned_driver"
        : "skip_compliance",
      severity:
        reasons.some((x) => x.includes("expired") || x.includes("suspended"))
          ? "critical"
          : "high",
      title: `Hold ${r.registration_number}`,
      detail: reasons.join(" · ") || "Not ready to load",
      vehicleReg: r.registration_number,
      routeId: r.route_assignment_id,
      score: 70,
      action: reasons.includes("no driver") ? "assign_driver" : "hold",
    });
  }

  if (opCounts.size >= 2 && queueLength >= 4) {
    const sortedOps = Array.from(opCounts.entries()).sort(
      (a, b) => b[1] - a[1]
    );
    const [topOp, topCount] = sortedOps[0];
    if (topCount >= Math.ceil(queueLength * 0.6)) {
      suggestions.push({
        id: `balance-${topOp}`,
        kind: "balance_operator",
        severity: "medium",
        title: "Operator concentration in queue",
        detail: `One operator holds ${topCount} of ${queueLength} queued vehicles. Consider fairness when advancing.`,
        vehicleReg: null,
        routeId: opts.routeId ?? null,
        score: 55,
        action: "reorder",
      });
    }
  }

  const staleMs = 4 * 60 * 60 * 1000;
  for (const r of rows.slice(0, 15)) {
    if (!r.updated_at) continue;
    const age = now.getTime() - new Date(r.updated_at).getTime();
    if (age > staleMs && (r.status === "Waiting" || r.status === "Queued")) {
      suggestions.push({
        id: `stale-${r.registration_number}`,
        kind: "stale_queue",
        severity: "medium",
        title: `Stale queue entry — ${r.registration_number}`,
        detail: `No update for ${Math.round(age / 3600000)}h. Confirm vehicle is still at the rank.`,
        vehicleReg: r.registration_number,
        routeId: r.route_assignment_id,
        score: 50,
        action: "hold",
      });
    }
  }

  suggestions.sort((a, b) => b.score - a.score);

  return {
    generatedAt: now.toISOString(),
    routeId: opts.routeId ?? null,
    terminalId: opts.terminalId ?? null,
    queueLength,
    suggestions: suggestions.slice(0, 20),
    recommendedNext: recommended,
  };
}
