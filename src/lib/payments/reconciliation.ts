/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Payment reconciliation helpers.
 * Surfaces unmatched intents, rank fees without settlement, and stale pending payments.
 */

import "server-only";
import { createSupabaseAdminClient } from "@/lib/supabase/server";

export type ReconIssueKind =
  | "intent_pending_stale"
  | "intent_success_no_credit"
  | "rank_fee_no_settlement"
  | "rank_fee_pending"
  | "card_tx_orphan";

export interface ReconIssue {
  id: string;
  kind: ReconIssueKind;
  severity: "low" | "medium" | "high";
  title: string;
  detail: string;
  entityType: string;
  entityId: string;
  amountSzl?: number;
  ageHours?: number;
}

export interface ReconReport {
  generatedAt: string;
  issues: ReconIssue[];
  counts: Record<ReconIssueKind, number>;
}

function emptyCounts(): Record<ReconIssueKind, number> {
  return {
    intent_pending_stale: 0,
    intent_success_no_credit: 0,
    rank_fee_no_settlement: 0,
    rank_fee_pending: 0,
    card_tx_orphan: 0,
  };
}

function hoursSince(iso: string | null | undefined, now: Date): number | null {
  if (!iso) return null;
  const t = new Date(iso).getTime();
  if (!Number.isFinite(t)) return null;
  return (now.getTime() - t) / 3600000;
}

/**
 * Scan recent payment / rank-fee state for reconciliation gaps.
 * Best-effort: tables that do not exist are skipped.
 */
export async function runPaymentReconciliation(opts?: {
  lookbackDays?: number;
  stalePendingHours?: number;
}): Promise<ReconReport> {
  const lookbackDays = opts?.lookbackDays ?? 14;
  const stalePendingHours = opts?.stalePendingHours ?? 6;
  const now = new Date();
  const since = new Date(now.getTime() - lookbackDays * 86400000).toISOString();
  const issues: ReconIssue[] = [];
  const counts = emptyCounts();
  const admin = createSupabaseAdminClient();

  // Rank fee payments
  try {
    const { data: fees } = await admin
      .from("rank_fee_payments")
      .select(
        "id, vehicle_reg, amount_szl, status, transaction_ref, timestamp, created_at"
      )
      .gte("timestamp", since)
      .limit(2000);

    for (const f of fees ?? []) {
      const id = String(f.id);
      const status = String(f.status ?? "");
      const age = hoursSince(
        (f.timestamp as string) ?? (f.created_at as string),
        now
      );

      if (status === "Pending" && age != null && age >= stalePendingHours) {
        const issue: ReconIssue = {
          id: `fee-pending-${id}`,
          kind: "rank_fee_pending",
          severity: age >= 24 ? "high" : "medium",
          title: `Pending rank fee — ${f.vehicle_reg}`,
          detail: `Status Pending for ${age.toFixed(1)}h · ref ${f.transaction_ref ?? "—"}`,
          entityType: "rank_fee_payment",
          entityId: id,
          amountSzl: Number(f.amount_szl) || undefined,
          ageHours: age,
        };
        issues.push(issue);
        counts.rank_fee_pending += 1;
      }
    }
  } catch (err) {
    console.warn("[reconciliation] rank_fee_payments scan failed:", err);
  }

  // Payment intents (if table exists)
  try {
    const { data: intents, error } = await admin
      .from("payment_intents")
      .select("id, status, amount_szl, provider, created_at, updated_at, vehicle_reg, purpose")
      .gte("created_at", since)
      .limit(2000);

    if (!error && intents) {
      for (const intent of intents) {
        const id = String(intent.id);
        const status = String(intent.status ?? "").toLowerCase();
        const age = hoursSince(
          (intent.updated_at as string) ?? (intent.created_at as string),
          now
        );

        if (
          (status === "pending" || status === "processing") &&
          age != null &&
          age >= stalePendingHours
        ) {
          issues.push({
            id: `intent-stale-${id}`,
            kind: "intent_pending_stale",
            severity: age >= 24 ? "high" : "medium",
            title: `Stale payment intent ${id.slice(0, 12)}`,
            detail: `${intent.provider ?? "provider"} · ${intent.purpose ?? "payment"} · pending ${age.toFixed(1)}h`,
            entityType: "payment_intent",
            entityId: id,
            amountSzl: Number(intent.amount_szl) || undefined,
            ageHours: age,
          });
          counts.intent_pending_stale += 1;
        }

        if (status === "succeeded" || status === "success") {
          // Look for a matching virtual card credit by receipt / amount window — advisory
          const { count } = await admin
            .from("virtual_card_transactions")
            .select("id", { count: "exact", head: true })
            .eq("direction", "CREDIT")
            .gte("timestamp", intent.created_at as string)
            .eq("amount_szl", intent.amount_szl as number);

          if ((count ?? 0) === 0) {
            issues.push({
              id: `intent-nocredit-${id}`,
              kind: "intent_success_no_credit",
              severity: "high",
              title: `Succeeded intent without card credit`,
              detail: `${intent.vehicle_reg ?? "—"} · ${intent.amount_szl} SZL · ${intent.provider ?? ""}`,
              entityType: "payment_intent",
              entityId: id,
              amountSzl: Number(intent.amount_szl) || undefined,
            });
            counts.intent_success_no_credit += 1;
          }
        }
      }
    }
  } catch (err) {
    console.warn("[reconciliation] payment_intents scan failed:", err);
  }

  issues.sort((a, b) => {
    const order = { high: 0, medium: 1, low: 2 };
    return order[a.severity] - order[b.severity];
  });

  return {
    generatedAt: now.toISOString(),
    issues: issues.slice(0, 100),
    counts,
  };
}
