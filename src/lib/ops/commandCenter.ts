/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Ops command center — single snapshot for rank managers / admins.
 * Aggregates live rank state, money pressure, compliance blockers, invariants.
 */

import "server-only";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { evaluateCompliance } from "@/lib/domain/compliance";
import { runPaymentReconciliation } from "@/lib/payments/reconciliation";
import { auditCardLedgers } from "@/lib/payments/cardLedger";

export interface RankLiveRow {
  registrationNumber: string;
  status: string;
  queuePosition: number;
  routeId: string | null;
  driverId: string | null;
  blocksLoad: boolean;
  blockReasons: string[];
}

export interface CommandCenterSnapshot {
  generatedAt: string;
  region: string | null;
  rank: {
    waiting: number;
    loading: number;
    departed: number;
    delayed: number;
    breakdown: number;
    blockedFromLoad: number;
    vehicles: RankLiveRow[];
  };
  money: {
    stalePendingIntents: number;
    completedWithoutCredit: number;
    pendingRankFees: number;
    cardLedgerDrifts: number;
    highSeverityIssues: number;
  };
  compliance: {
    openInvariantViolations: number;
    expiredPermitInService: number;
    driversPdpExpiredAssigned: number;
  };
  attention: Array<{
    severity: "critical" | "high" | "medium";
    title: string;
    detail: string;
    href?: string;
  }>;
}

export async function buildCommandCenter(opts?: {
  region?: string | null;
  routeId?: string | null;
}): Promise<CommandCenterSnapshot> {
  const admin = createSupabaseAdminClient();
  const now = new Date();
  const attention: CommandCenterSnapshot["attention"] = [];

  let vehicleQuery = admin
    .from("vehicles")
    .select(
      "registration_number, status, current_queue_position, route_assignment_id, driver_id, permit_status, permit_expiry_date, cof_expiry_date, insurance_expiry, roadworthiness_expiry"
    )
    .neq("status", "Archived")
    .limit(400);

  if (opts?.routeId) {
    vehicleQuery = vehicleQuery.eq("route_assignment_id", opts.routeId);
  }

  const { data: vehicles } = await vehicleQuery;

  const counts = {
    waiting: 0,
    loading: 0,
    departed: 0,
    delayed: 0,
    breakdown: 0,
    blockedFromLoad: 0,
  };

  const live: RankLiveRow[] = [];

  for (const v of vehicles ?? []) {
    const status = String(v.status ?? "Waiting");
    if (status === "Waiting") counts.waiting += 1;
    else if (status === "Loading") counts.loading += 1;
    else if (status === "Departed") counts.departed += 1;
    else if (status === "Delayed") counts.delayed += 1;
    else if (status === "Breakdown") counts.breakdown += 1;

    const report = evaluateCompliance({
      permitStatus: v.permit_status as string | null,
      permitExpiryDate: v.permit_expiry_date as string | null,
      cofExpiryDate: v.cof_expiry_date as string | null,
      insuranceExpiry: v.insurance_expiry as string | null,
      roadworthinessExpiry: v.roadworthiness_expiry as string | null,
      vehicleStatus: status,
      hasDriver: Boolean(v.driver_id),
    });

    const inQueue =
      Number(v.current_queue_position ?? 0) > 0 ||
      ["Waiting", "Loading", "Delayed"].includes(status);

    if (inQueue && report.blocksRankLoad) {
      counts.blockedFromLoad += 1;
    }

    if (inQueue) {
      live.push({
        registrationNumber: String(v.registration_number),
        status,
        queuePosition: Number(v.current_queue_position ?? 0),
        routeId: (v.route_assignment_id as string | null) ?? null,
        driverId: (v.driver_id as string | null) ?? null,
        blocksLoad: report.blocksRankLoad,
        blockReasons: report.reasons,
      });
    }
  }

  live.sort((a, b) => a.queuePosition - b.queuePosition);

  if (counts.blockedFromLoad > 0) {
    attention.push({
      severity: "high",
      title: `${counts.blockedFromLoad} vehicle(s) blocked from load`,
      detail: "Compliance or missing driver prevents rank load.",
      href: "/admin/fleet",
    });
  }

  let stalePendingIntents = 0;
  let completedWithoutCredit = 0;
  let pendingRankFees = 0;
  let highSeverityIssues = 0;
  let cardLedgerDrifts = 0;

  try {
    const recon = await runPaymentReconciliation({
      lookbackDays: 7,
      stalePendingHours: 6,
    });
    stalePendingIntents = recon.counts.intent_pending_stale;
    completedWithoutCredit = recon.counts.intent_success_no_credit;
    pendingRankFees = recon.counts.rank_fee_pending;
    highSeverityIssues = recon.issues.filter((i) => i.severity === "high").length;

    if (completedWithoutCredit > 0) {
      attention.push({
        severity: "critical",
        title: `${completedWithoutCredit} completed payment(s) without card credit`,
        detail: "Money received path incomplete — run reconciliation.",
        href: "/admin/ledger",
      });
    }
    if (stalePendingIntents > 0) {
      attention.push({
        severity: "high",
        title: `${stalePendingIntents} stale payment intent(s)`,
        detail: "Pending/processing longer than 6h.",
        href: "/admin/ledger",
      });
    }
  } catch (err) {
    console.warn("[commandCenter] recon failed:", err);
  }

  try {
    const ledger = await auditCardLedgers({ limit: 200 });
    cardLedgerDrifts = ledger.drifts.length;
    if (cardLedgerDrifts > 0) {
      attention.push({
        severity: "critical",
        title: `${cardLedgerDrifts} card balance drift(s)`,
        detail: "Stored balance does not match transaction history.",
        href: "/admin/ledger",
      });
    }
  } catch (err) {
    console.warn("[commandCenter] card ledger failed:", err);
  }

  let openInvariantViolations = 0;
  let expiredPermitInService = 0;
  let driversPdpExpiredAssigned = 0;

  try {
    const { count } = await admin
      .from("invariant_violations")
      .select("id", { count: "exact", head: true })
      .is("resolved_at", null);
    openInvariantViolations = count ?? 0;

    const { count: permitCount } = await admin
      .from("invariant_violations")
      .select("id", { count: "exact", head: true })
      .is("resolved_at", null)
      .eq("invariant", "ops.expired_permit_in_service");
    expiredPermitInService = permitCount ?? 0;

    const { count: pdpCount } = await admin
      .from("invariant_violations")
      .select("id", { count: "exact", head: true })
      .is("resolved_at", null)
      .eq("invariant", "compliance.driver_pdp_expired");
    driversPdpExpiredAssigned = pdpCount ?? 0;

    if (openInvariantViolations > 0) {
      attention.push({
        severity: openInvariantViolations > 20 ? "critical" : "high",
        title: `${openInvariantViolations} open invariant violation(s)`,
        detail: "Nightly runner still detecting structural issues.",
        href: "/super/invariants",
      });
    }
  } catch {
    /* table may be empty pre-migration */
  }

  // Live scan for expired permit still loading if invariants not yet populated
  if (expiredPermitInService === 0) {
    for (const row of live) {
      if (
        row.blocksLoad &&
        row.blockReasons.some((r) => /permit/i.test(r)) &&
        ["Loading", "Departed"].includes(row.status)
      ) {
        expiredPermitInService += 1;
      }
    }
  }

  attention.sort((a, b) => {
    const rank = { critical: 0, high: 1, medium: 2 };
    return rank[a.severity] - rank[b.severity];
  });

  return {
    generatedAt: now.toISOString(),
    region: opts?.region ?? null,
    rank: {
      ...counts,
      vehicles: live.slice(0, 80),
    },
    money: {
      stalePendingIntents,
      completedWithoutCredit,
      pendingRankFees,
      cardLedgerDrifts,
      highSeverityIssues,
    },
    compliance: {
      openInvariantViolations,
      expiredPermitInService,
      driversPdpExpiredAssigned,
    },
    attention: attention.slice(0, 15),
  };
}
