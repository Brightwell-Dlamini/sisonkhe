/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Unified financial exception queue for admin surfaces.
 * Combines payment reconciliation issues and card-ledger drifts.
 */

import "server-only";
import { runPaymentReconciliation, type ReconIssue } from "./reconciliation";
import { auditCardLedgers, type CardLedgerDrift } from "./cardLedger";
import { log } from "@/lib/observability/log";

export type ExceptionSeverity = "low" | "medium" | "high";

export interface FinancialException {
  id: string;
  source: "reconciliation" | "card_ledger";
  severity: ExceptionSeverity;
  title: string;
  detail: string;
  entityType: string;
  entityId: string;
  amountSzl?: number;
  ageHours?: number;
}

export interface ExceptionQueueReport {
  generatedAt: string;
  exceptions: FinancialException[];
  counts: {
    high: number;
    medium: number;
    low: number;
    reconciliation: number;
    cardLedger: number;
  };
}

function fromRecon(issue: ReconIssue): FinancialException {
  return {
    id: issue.id,
    source: "reconciliation",
    severity: issue.severity,
    title: issue.title,
    detail: issue.detail,
    entityType: issue.entityType,
    entityId: issue.entityId,
    amountSzl: issue.amountSzl,
    ageHours: issue.ageHours,
  };
}

function fromDrift(drift: CardLedgerDrift): FinancialException {
  const abs = Math.abs(drift.delta);
  const severity: ExceptionSeverity =
    abs >= 50 ? "high" : abs >= 5 ? "medium" : "low";
  return {
    id: `drift-${drift.kind}-${drift.cardId}`,
    source: "card_ledger",
    severity,
    title: `Card balance drift — ${drift.kind} ${drift.entityId}`,
    detail: `Stored ${drift.storedBalance} vs reconstructed ${drift.reconstructedBalance} (Δ ${drift.delta}, ${drift.txCount} txs)`,
    entityType: drift.kind === "vehicle" ? "vehicle_virtual_card" : "operator_master_card",
    entityId: drift.cardId,
    amountSzl: abs,
  };
}

export async function buildExceptionQueue(opts?: {
  includeCardLedger?: boolean;
  reconLookbackDays?: number;
}): Promise<ExceptionQueueReport> {
  const includeCardLedger = opts?.includeCardLedger !== false;

  const recon = await runPaymentReconciliation({
    lookbackDays: opts?.reconLookbackDays ?? 14,
  });

  const exceptions: FinancialException[] = recon.issues.map(fromRecon);

  if (includeCardLedger) {
    const ledger = await auditCardLedgers({ limit: 300 });
    for (const d of ledger.drifts) {
      exceptions.push(fromDrift(d));
    }
  }

  exceptions.sort((a, b) => {
    const order = { high: 0, medium: 1, low: 2 };
    return order[a.severity] - order[b.severity];
  });

  const counts = {
    high: exceptions.filter((e) => e.severity === "high").length,
    medium: exceptions.filter((e) => e.severity === "medium").length,
    low: exceptions.filter((e) => e.severity === "low").length,
    reconciliation: exceptions.filter((e) => e.source === "reconciliation").length,
    cardLedger: exceptions.filter((e) => e.source === "card_ledger").length,
  };

  log.info("exceptions.queue", {
    total: exceptions.length,
    high: counts.high,
    medium: counts.medium,
    low: counts.low,
  });

  return {
    generatedAt: new Date().toISOString(),
    exceptions: exceptions.slice(0, 150),
    counts,
  };
}
