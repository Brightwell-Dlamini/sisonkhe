/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * POST /api/sync/push — accept a batch of SyncEvents from a client.
 * Requires an authenticated session; mutations are role-scoped.
 */

import type { NextRequest } from "next/server";
import { applyEvents } from "@/lib/sync/server";
import type { SyncPushRequest } from "@/lib/sync/protocol";
import { requireServerSession } from "@/lib/auth/session";
import { AppError } from "@/lib/api/errors";
import { ok, withApiHandler } from "@/lib/api/response";
import { log } from "@/lib/observability/log";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export const POST = withApiHandler(async (request: NextRequest) => {
  const session = await requireServerSession();

  let body: SyncPushRequest;
  try {
    body = (await request.json()) as SyncPushRequest;
  } catch {
    throw AppError.validation("Invalid JSON body");
  }

  if (!body || !Array.isArray(body.events) || !body.clientId) {
    throw AppError.validation("Body must include events[] and clientId");
  }
  if (body.events.length === 0) {
    throw AppError.validation("events[] must not be empty");
  }
  if (body.events.length > 50) {
    throw AppError.validation("Maximum 50 events per batch");
  }

  const result = await applyEvents(body.events, body.clientId, session);

  log.info("sync.push", {
    clientId: body.clientId,
    role: session.role,
    eventCount: body.events.length,
    accepted: result.accepted.length,
    rejected: result.rejected.length,
    latestSeq: result.latestSeq,
  });

  if (result.rejected.length > 0) {
    log.warn("sync.push.rejections", {
      clientId: body.clientId,
      reasons: result.rejected.map((r) => r.reason).slice(0, 10).join(" | "),
    });
  }

  return ok(result);
});
