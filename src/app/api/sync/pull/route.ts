/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * GET /api/sync/pull?since=<seq>&limit=<n>
 * Requires an authenticated session.
 */

import type { NextRequest } from "next/server";
import { pullEvents } from "@/lib/sync/server";
import { requireServerSession } from "@/lib/auth/session";
import { AppError } from "@/lib/api/errors";
import { ok, withApiHandler } from "@/lib/api/response";
import { log } from "@/lib/observability/log";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export const GET = withApiHandler(async (request: NextRequest) => {
  const session = await requireServerSession();

  const since = Number(request.nextUrl.searchParams.get("since") ?? "0");
  const limit = Math.min(
    Number(request.nextUrl.searchParams.get("limit") ?? "100"),
    200
  );

  if (Number.isNaN(since) || since < 0) {
    throw AppError.validation("Invalid since parameter");
  }

  const result = await pullEvents(since, limit);

  log.info("sync.pull", {
    role: session.role,
    since,
    limit,
    returned: result.events.length,
    latestSeq: result.latestSeq,
    hasMore: result.hasMore,
  });

  return ok(result);
});
