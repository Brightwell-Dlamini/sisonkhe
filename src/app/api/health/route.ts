/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * GET /api/health — liveness / deep system health.
 * ?deep=1 runs expanded checks (DB, sync, invariants, redis).
 */

import type { NextRequest } from "next/server";
import { buildSystemHealth } from "@/lib/system/health";
import { ok, withApiHandler } from "@/lib/api/response";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export const GET = withApiHandler(async (request: NextRequest) => {
  const deep = request.nextUrl.searchParams.get("deep") === "1";

  if (!deep) {
    return ok({
      status: "ok",
      service: "Sisonkhe In Transit",
      timestamp: new Date().toISOString(),
    });
  }

  const report = await buildSystemHealth();
  return ok(report, {
    status: report.status === "down" ? 503 : 200,
  });
});
