/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Card ledger integrity.
 * Reconstructs expected balance from completed transactions and compares
 * to the stored balance_szl. Observation-only — never mutates balances.
 */

import "server-only";
import { createSupabaseAdminClient } from "@/lib/supabase/server";

export type CardLedgerKind = "vehicle" | "operator";

export interface CardLedgerDrift {
  kind: CardLedgerKind;
  cardId: string;
  entityId: string;
  storedBalance: number;
  reconstructedBalance: number;
  delta: number;
  txCount: number;
}

export interface CardLedgerReport {
  generatedAt: string;
  scanned: { vehicle: number; operator: number };
  drifts: CardLedgerDrift[];
}

function reconstruct(
  txs: Array<{ amount_szl: unknown; direction: unknown; status?: unknown }>
): { balance: number; count: number } {
  let balance = 0;
  let count = 0;
  for (const t of txs) {
    if (String(t.status ?? "Completed") !== "Completed") continue;
    const amt = Number(t.amount_szl) || 0;
    if (amt <= 0) continue;
    count += 1;
    if (String(t.direction) === "CREDIT") balance += amt;
    else if (String(t.direction) === "DEBIT") balance -= amt;
  }
  return { balance: Math.round(balance * 100) / 100, count };
}

export async function auditCardLedgers(opts?: {
  toleranceSzl?: number;
  limit?: number;
}): Promise<CardLedgerReport> {
  const tolerance = opts?.toleranceSzl ?? 0.01;
  const limit = opts?.limit ?? 500;
  const admin = createSupabaseAdminClient();
  const drifts: CardLedgerDrift[] = [];
  let vehicleScanned = 0;
  let operatorScanned = 0;

  const { data: vehicleCards } = await admin
    .from("vehicle_virtual_cards")
    .select("id, vehicle_reg, balance_szl")
    .limit(limit);

  for (const card of vehicleCards ?? []) {
    vehicleScanned += 1;
    const { data: txs } = await admin
      .from("virtual_card_transactions")
      .select("amount_szl, direction, status")
      .eq("card_id", card.id as string)
      .limit(5000);

    const { balance, count } = reconstruct(txs ?? []);
    const stored = Number(card.balance_szl) || 0;
    const delta = Math.round((stored - balance) * 100) / 100;
    if (Math.abs(delta) > tolerance) {
      drifts.push({
        kind: "vehicle",
        cardId: String(card.id),
        entityId: String(card.vehicle_reg),
        storedBalance: stored,
        reconstructedBalance: balance,
        delta,
        txCount: count,
      });
    }
  }

  const { data: masterCards } = await admin
    .from("operator_master_cards")
    .select("id, operator_id, balance_szl")
    .limit(limit);

  for (const card of masterCards ?? []) {
    operatorScanned += 1;
    const { data: txs } = await admin
      .from("operator_card_transactions")
      .select("amount_szl, direction, status")
      .eq("card_id", card.id as string)
      .limit(5000);

    const { balance, count } = reconstruct(txs ?? []);
    const stored = Number(card.balance_szl) || 0;
    const delta = Math.round((stored - balance) * 100) / 100;
    if (Math.abs(delta) > tolerance) {
      drifts.push({
        kind: "operator",
        cardId: String(card.id),
        entityId: String(card.operator_id),
        storedBalance: stored,
        reconstructedBalance: balance,
        delta,
        txCount: count,
      });
    }
  }

  drifts.sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));

  return {
    generatedAt: new Date().toISOString(),
    scanned: { vehicle: vehicleScanned, operator: operatorScanned },
    drifts,
  };
}
