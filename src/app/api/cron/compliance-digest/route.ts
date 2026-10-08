/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Daily compliance digest. Authorization: Bearer $CRON_SECRET
 */

import { runComplianceDigest } from "@/lib/compliance/digest";
import { requireCronSecret } from "@/lib/api/cronAuth";
import { ok, withApiHandler } from "@/lib/api/response";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

export const GET = withApiHandler(async (request: Request) => {
  requireCronSecret(request);
  const summary = await runComplianceDigest();
  return ok({ summary });
});
