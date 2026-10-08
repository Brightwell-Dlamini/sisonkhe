/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Stale payment intent sweep. Authorization: Bearer $CRON_SECRET
 */

import { runStalePaymentSweep } from "@/lib/payments/staleSweep";
import { requireCronSecret } from "@/lib/api/cronAuth";
import { ok, withApiHandler } from "@/lib/api/response";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

export const GET = withApiHandler(async (request: Request) => {
  requireCronSecret(request);
  const summary = await runStalePaymentSweep();
  return ok({ summary });
});
