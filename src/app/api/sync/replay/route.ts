/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * POST /api/sync/replay — client offline outbox → event-log apply.
 * Requires authenticated session; mutations are role-scoped via authorizeSyncEvent.
 */

import type { NextRequest } from "next/server";
import { applyEvents } from "@/lib/sync/server";
import type { SyncEvent } from "@/lib/sync/protocol";
import { requireServerSession } from "@/lib/auth/session";
import { AppError } from "@/lib/api/errors";
import { ok, withApiHandler } from "@/lib/api/response";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

interface ReplayEntry {
  id: string;
  action: "INSERT" | "UPDATE" | "DELETE";
  entityType: string;
  entityId: string;
  payload: Record<string, unknown>;
  idempotencyKey: string;
  clientId: string;
  createdAt: string;
  baseVersion?: number;
}

export const POST = withApiHandler(async (request: NextRequest) => {
  const session = await requireServerSession();

  const body = await request.json();
  const entries: ReplayEntry[] = body.entries ?? [];

  if (!Array.isArray(entries) || entries.length === 0) {
    throw AppError.validation("entries[] required");
  }
  if (entries.length > 50) {
    throw AppError.validation("Maximum 50 entries per batch");
  }

  const clientId = entries[0]?.clientId ?? session.authUserId;

  const events: SyncEvent[] = entries.map((e) => ({
    id: e.id,
    entityType: e.entityType as SyncEvent["entityType"],
    entityId: e.entityId,
    operation: e.action,
    payload: e.payload,
    idempotencyKey: e.idempotencyKey,
    clientId: e.clientId || clientId,
    occurredAt: e.createdAt,
    baseVersion: e.baseVersion,
  }));

  const result = await applyEvents(events, clientId, session);

  return ok({
    accepted: result.accepted.map((id) => {
      const entry = entries.find((e) => e.id === id);
      return entry?.idempotencyKey ?? id;
    }),
    rejected: result.rejected.map((r) => {
      const entry = entries.find((e) => e.id === r.id);
      return {
        idempotencyKey: entry?.idempotencyKey ?? r.id,
        reason: r.reason,
      };
    }),
    latestSeq: result.latestSeq,
  });
});
