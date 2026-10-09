/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Double-entry style journal over existing card / rank-fee tables.
 *
 * Design:
 *   - Every money movement is expressed as balanced lines (debit + credit).
 *   - Lines are persisted as card transactions (or rank_fee_payments) plus
 *     an operational_audit row with action "ledger.journal.post".
 *   - This module does NOT introduce a new ledger table; it enforces
 *     balance invariants in application code so existing schema remains valid.
 *
 * Usage:
 *   await postJournal(admin, {
 *     reference: intent.clientReference,
 *     description: "Vehicle card top-up",
 *     actorId: intent.initiatedBy,
 *     lines: [
 *       { account: "cash.momo", direction: "DEBIT", amountSzl: 100 },
 *       { account: "card.vehicle:ABC123", direction: "CREDIT", amountSzl: 100 },
 *     ],
 *   });
 */

import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { writeAudit } from "@/lib/domain/audit";
import { log } from "@/lib/observability/log";

export type JournalDirection = "DEBIT" | "CREDIT";

export interface JournalLine {
  /** Logical account, e.g. cash.momo, card.vehicle:REG, allocation.operational */
  account: string;
  direction: JournalDirection;
  amountSzl: number;
  meta?: Record<string, unknown>;
}

export interface JournalEntry {
  reference: string;
  description: string;
  actorId?: string | null;
  actorRole?: string | null;
  actorName?: string | null;
  entityType?: string;
  entityId?: string;
  lines: JournalLine[];
  meta?: Record<string, unknown>;
}

export interface JournalPostResult {
  balanced: boolean;
  debitTotal: number;
  creditTotal: number;
  lineCount: number;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/**
 * Validate that debits equal credits (within 0.01 SZL) and amounts are positive.
 */
export function validateJournal(entry: JournalEntry): JournalPostResult {
  if (!entry.lines || entry.lines.length < 2) {
    throw new Error("Journal entry requires at least two lines");
  }

  let debitTotal = 0;
  let creditTotal = 0;

  for (const line of entry.lines) {
    const amt = Number(line.amountSzl);
    if (!Number.isFinite(amt) || amt <= 0) {
      throw new Error(`Invalid journal line amount for account ${line.account}`);
    }
    if (line.direction === "DEBIT") debitTotal += amt;
    else if (line.direction === "CREDIT") creditTotal += amt;
    else throw new Error(`Invalid direction on account ${line.account}`);
  }

  debitTotal = round2(debitTotal);
  creditTotal = round2(creditTotal);
  const balanced = Math.abs(debitTotal - creditTotal) < 0.015;

  if (!balanced) {
    throw new Error(
      `Journal unbalanced: debit ${debitTotal} ≠ credit ${creditTotal} (ref ${entry.reference})`
    );
  }

  return {
    balanced: true,
    debitTotal,
    creditTotal,
    lineCount: entry.lines.length,
  };
}

/**
 * Post a balanced journal entry as an audit record.
 * Callers remain responsible for writing the underlying card / fee rows;
 * this ensures every money movement is accompanied by a balanced, queryable audit trail.
 */
export async function postJournal(
  admin: SupabaseClient,
  entry: JournalEntry
): Promise<JournalPostResult> {
  const result = validateJournal(entry);

  await writeAudit(admin, {
    action: "ledger.journal.post",
    actorId: entry.actorId,
    actorRole: entry.actorRole ?? "system",
    actorName: entry.actorName,
    entityType: entry.entityType ?? "journal",
    entityId: entry.entityId ?? entry.reference,
    summary: entry.description,
    meta: {
      reference: entry.reference,
      debitTotal: result.debitTotal,
      creditTotal: result.creditTotal,
      lineCount: result.lineCount,
      lines: entry.lines.map((l) => ({
        account: l.account,
        direction: l.direction,
        amountSzl: l.amountSzl,
      })),
      ...entry.meta,
    },
  });

  log.info("ledger.journal.posted", {
    reference: entry.reference,
    debitTotal: result.debitTotal,
    creditTotal: result.creditTotal,
    lines: result.lineCount,
  });

  return result;
}

/**
 * Convenience: balanced top-up journal (external cash → card liability).
 */
export function topUpJournalLines(opts: {
  provider: string;
  cardAccount: string; // e.g. card.vehicle:REG or card.operator:ID
  amountSzl: number;
}): JournalLine[] {
  return [
    {
      account: `cash.${opts.provider}`,
      direction: "DEBIT",
      amountSzl: opts.amountSzl,
    },
    {
      account: opts.cardAccount,
      direction: "CREDIT",
      amountSzl: opts.amountSzl,
    },
  ];
}

/**
 * Convenience: rank-fee collection with allocation split.
 */
export function rankFeeJournalLines(opts: {
  amountSzl: number;
  vehicleReg: string;
  splitOperational: number;
  splitNrtc: number;
  splitMaintenance: number;
}): JournalLine[] {
  const { amountSzl, vehicleReg, splitOperational, splitNrtc, splitMaintenance } =
    opts;
  const lines: JournalLine[] = [
    {
      account: `receivable.rank_fee:${vehicleReg}`,
      direction: "DEBIT",
      amountSzl,
    },
  ];
  if (splitOperational > 0) {
    lines.push({
      account: "allocation.operational",
      direction: "CREDIT",
      amountSzl: splitOperational,
    });
  }
  if (splitNrtc > 0) {
    lines.push({
      account: "allocation.nrtc",
      direction: "CREDIT",
      amountSzl: splitNrtc,
    });
  }
  if (splitMaintenance > 0) {
    lines.push({
      account: "allocation.maintenance",
      direction: "CREDIT",
      amountSzl: splitMaintenance,
    });
  }
  return lines;
}
