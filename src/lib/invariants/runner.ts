/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Invariant runner.
 *   runInvariantChecks()  → Postgres run_all_invariant_checks()
 *   loadLatestReport()    → open violations, grouped, with severity
 */

import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { looseAdmin, rpcRow } from "@/lib/supabase/rpc";
import type {
  InvariantReport,
  InvariantRunSummary,
  InvariantViolation,
} from "./types";
import { invariantSeverity } from "./types";

export async function runInvariantChecks(): Promise<InvariantRunSummary> {
  const admin = createSupabaseAdminClient();
  const db = looseAdmin(admin);

  const { data, error } = await db.rpc("run_all_invariant_checks");

  if (error) {
    throw new Error(`run_all_invariant_checks failed: ${error.message}`);
  }

  const row = rpcRow<InvariantRunSummary>(data);
  if (!row) {
    throw new Error("run_all_invariant_checks returned no summary");
  }
  return row;
}

export async function loadLatestReport(): Promise<InvariantReport> {
  const admin = createSupabaseAdminClient();

  // Prefer unresolved (still open) violations; fall back to recent history.
  const { data: openRows, error: openErr } = await admin
    .from("invariant_violations")
    .select("*")
    .is("resolved_at", null)
    .order("last_seen_at", { ascending: false })
    .limit(500);

  if (openErr) {
    throw new Error(`loadLatestReport failed: ${openErr.message}`);
  }

  let all = (openRows ?? []) as InvariantViolation[];

  if (all.length === 0) {
    const { data: recent, error: recentErr } = await admin
      .from("invariant_violations")
      .select("*")
      .order("detected_at", { ascending: false })
      .limit(100);

    if (recentErr) {
      throw new Error(`loadLatestReport history failed: ${recentErr.message}`);
    }
    all = (recent ?? []) as InvariantViolation[];
  }

  if (all.length === 0) {
    return { summary: null, violations: [], grouped: [] };
  }

  const byInvariant = new Map<string, InvariantViolation[]>();
  for (const v of all) {
    const arr = byInvariant.get(v.invariant) ?? [];
    arr.push(v);
    byInvariant.set(v.invariant, arr);
  }

  const grouped = Array.from(byInvariant.entries())
    .map(([invariant, items]) => ({
      invariant,
      count: items.length,
      severity: invariantSeverity(invariant),
      examples: items.slice(0, 5),
    }))
    .sort((a, b) => {
      const rank = { critical: 0, high: 1, medium: 2, low: 3 };
      const sr = rank[a.severity] - rank[b.severity];
      if (sr !== 0) return sr;
      return b.count - a.count;
    });

  const open = all.filter((v) => !v.resolved_at);
  const latestSeen =
    open
      .map((v) => v.last_seen_at ?? v.detected_at)
      .sort()
      .at(-1) ?? all[0]?.detected_at ?? null;

  const summary: InvariantRunSummary | null = latestSeen
    ? {
        run_id: "open",
        ran_at: latestSeen,
        money: open.filter((v) => v.invariant.startsWith("money.")).length,
        identity: open.filter((v) => v.invariant.startsWith("identity.")).length,
        operational: open.filter((v) => v.invariant.startsWith("ops.")).length,
        authority: open.filter((v) => v.invariant.startsWith("authority.")).length,
        compliance: open.filter((v) =>
          v.invariant.startsWith("compliance.")
        ).length,
        total: open.length,
      }
    : null;

  return { summary, violations: all, grouped };
}
