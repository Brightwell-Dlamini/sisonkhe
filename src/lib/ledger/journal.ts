/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Double-entry style journal over existing card / rank-fee tables.
 *
 * Design:
 *   - Every money movement is expressed as balanced lines (debit + credit).
 *   - Lines are persisted via operational_audit ("ledger.journal.post").
 *   - No new ledger table required.
 *
 * Card account codes (see src/lib/cards/policy.ts):
 *   card.operator:{operatorId}
 *   card.vehicle:{REG}
 *   cash.{provider}
 *   allocation.operational | allocation.nrtc | allocation.maintenance
 */

import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { writeAudit } from "@/lib/domain/audit";
import { log } from "@/lib/observability/log";

export type JournalDirection = "DEBIT" | "CREDIT";

export interface JournalLine {
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

/** External cash → card (top-up). */
export function topUpJournalLines(opts: {
  provider: string;
  cardAccount: string;
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

/** Operator master → vehicle card transfer. */
export function transferJournalLines(opts: {
  operatorId: string;
  vehicleReg: string;
  amountSzl: number;
}): JournalLine[] {
  return [
    {
      account: `card.operator:${opts.operatorId}`,
      direction: "DEBIT",
      amountSzl: opts.amountSzl,
    },
    {
      account: `card.vehicle:${opts.vehicleReg}`,
      direction: "CREDIT",
      amountSzl: opts.amountSzl,
    },
  ];
}

/**
 * Rank fee paid from vehicle card balance.
 * Dr vehicle card, Cr allocation buckets (must sum to amount).
 */
export function rankFeeJournalLines(opts: {
  amountSzl: number;
  vehicleReg: string;
  splitOperational: number;
  splitNrtc: number;
  splitMaintenance: number;
}): JournalLine[] {
  const {
    amountSzl,
    vehicleReg,
    splitOperational,
    splitNrtc,
    splitMaintenance,
  } = opts;

  const lines: JournalLine[] = [
    {
      account: `card.vehicle:${vehicleReg}`,
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
