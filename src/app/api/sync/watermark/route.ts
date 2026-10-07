/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * GET /api/sync/watermark
 */

import { getLatestSeq } from "@/lib/sync/server";
import { ok, withApiHandler } from "@/lib/api/response";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export const GET = withApiHandler(async () => {
  const seq = await getLatestSeq();
  return ok({ seq, ts: Date.now() });
});
