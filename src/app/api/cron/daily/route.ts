/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Single daily maintenance bundle for Vercel Hobby (max 2 crons, once/day each).
 * Runs: invariants → payment reconcile → stale payment sweep → departed reset.
 * Authorization: Bearer $CRON_SECRET
 */

import { runInvariantChecks } from "@/lib/invariants/runner";
import { notifyStaff } from "@/lib/notifications/service";
import { runPaymentReconciliation } from "@/lib/payments/reconciliation";
import { sweepStalePaymentIntents } from "@/lib/payments/staleSweep";
import { autoResetStaleDeparted } from "@/lib/ops/departedReset";
import { requireCronSecret } from "@/lib/api/cronAuth";
import { ok, withApiHandler } from "@/lib/api/response";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

export const GET = withApiHandler(async (request: Request) => {
  requireCronSecret(request);

  const results: Record<string, unknown> = {
    ranAt: new Date().toISOString(),
  };

  try {
    const summary = await runInvariantChecks();
    results.invariants = summary;
    const total = Number(summary.total ?? 0);
    if (total > 0) {
      await notifyStaff(
        { roles: ["super-admin"] },
        {
          type: "system",
          title: `Invariant run — ${total} open issue(s)`,
          message: `Money: ${summary.money ?? 0} · Identity: ${summary.identity ?? 0} · Ops: ${summary.operational ?? 0}.`,
          href: "/super/invariants",
          entityType: "invariant_run",
          entityId: summary.run_id ?? summary.ran_at,
        }
      );
    }
  } catch (err) {
    results.invariantsError =
      err instanceof Error ? err.message : "invariants failed";
    console.error("[cron/daily] invariants:", err);
  }

  try {
    results.paymentReconcile = await runPaymentReconciliation();
  } catch (err) {
    results.paymentReconcileError =
      err instanceof Error ? err.message : "reconcile failed";
    console.error("[cron/daily] payment-reconcile:", err);
  }

  try {
    results.paymentStaleSweep = await sweepStalePaymentIntents();
  } catch (err) {
    results.paymentStaleSweepError =
      err instanceof Error ? err.message : "stale sweep failed";
    console.error("[cron/daily] payment-stale-sweep:", err);
  }

  try {
    results.departedReset = await autoResetStaleDeparted();
  } catch (err) {
    results.departedResetError =
      err instanceof Error ? err.message : "departed reset failed";
    console.error("[cron/daily] departed-reset:", err);
  }

  return ok(results);
});
