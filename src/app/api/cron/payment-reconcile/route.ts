/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Payment reconciliation cron. Authorization: Bearer $CRON_SECRET
 */

import { runPaymentReconciliation } from "@/lib/payments/reconciliation";
import { requireCronSecret } from "@/lib/api/cronAuth";
import { ok, withApiHandler } from "@/lib/api/response";
import { log } from "@/lib/observability/log";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

export const GET = withApiHandler(async (request: Request) => {
  requireCronSecret(request);
  const summary = await runPaymentReconciliation();
  log.info("cron.payment_reconcile.completed", {
    totalIssues: summary.issues.length,
    highSeverity: summary.issues.filter((i) => i.severity === "high").length,
  });
  return ok({ summary });
});
