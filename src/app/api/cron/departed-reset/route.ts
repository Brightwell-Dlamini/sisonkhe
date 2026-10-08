/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Auto-reset stale Departed vehicles. Authorization: Bearer $CRON_SECRET
 */

import { autoResetStaleDeparted } from "@/lib/ops/departedReset";
import { requireCronSecret } from "@/lib/api/cronAuth";
import { ok, withApiHandler } from "@/lib/api/response";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

export const GET = withApiHandler(async (request: Request) => {
  requireCronSecret(request);
  const result = await autoResetStaleDeparted();
  return ok(result);
});
