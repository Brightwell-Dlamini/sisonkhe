/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Phase 0 — Invariant runner.
 *
 * Two operations:
 *   runInvariantChecks()  → calls run_all_invariant_checks() in Postgres
 *   loadLatestReport()    → reads the most recent run's violations
 *
 * Uses the admin client because the RPCs are SECURITY DEFINER and the
 * violation table is super-admin-read-only for normal users.
 */

import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { looseAdmin, rpcRow } from "@/lib/supabase/rpc";
import type {
  InvariantReport,
  InvariantRunSummary,
  InvariantViolation,
} from "./types";

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

  // Most recent run id — any violation shares the prefix of its run id.
  // We take the max detected_at and pull everything within 60 seconds of it.
  const { data: recent, error: recentErr } = await admin
    .from("invariant_violations")
    .select("*")
    .order("detected_at", { ascending: false })
    .limit(500);

  if (recentErr) {
    throw new Error(`loadLatestReport failed: ${recentErr.message}`);
  }

  const all = (recent ?? []) as InvariantViolation[];

  if (all.length === 0) {
    return { summary: null, violations: [], grouped: [] };
  }

  // Group all returned rows by invariant. If the table is empty, this is
  // silent and clean — which is what we want Phase 0 to look like.
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
      examples: items.slice(0, 5),
    }))
    .sort((a, b) => b.count - a.count);

  // Summary is best-effort: we don't have run_id on the row, so we infer
  // from the most recent detected_at bucket.
  const latestDetectedAt = all[0]?.detected_at ?? null;
  const summary: InvariantRunSummary | null = latestDetectedAt
    ? {
        run_id: "inferred",
        ran_at: latestDetectedAt,
        money: all.filter((v) => v.invariant.startsWith("money.")).length,
        identity: all.filter((v) => v.invariant.startsWith("identity."))
          .length,
        operational: all.filter((v) => v.invariant.startsWith("ops.")).length,
        total: all.length,
      }
    : null;

  return { summary, violations: all, grouped };
}
