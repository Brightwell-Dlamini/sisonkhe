/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * POST /api/sync/replay
 *
 * Body: { entries: Array<{ id, action, entityType, entityId, payload, idempotencyKey, clientId, createdAt }> }
 *
 * Applies outbox entries against the DB. Idempotent — repeated calls with
 * the same idempotencyKey are no-ops.
 *
 * Returns: { accepted: string[], rejected: Array<{ idempotencyKey, reason }> }
 */

import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { getServerSession } from "@/lib/auth/session";
import { applyDispatchAction, type DispatchAction } from "@/lib/marshal/dispatch";
import { getMarshalContext } from "@/lib/marshal/queries";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

interface Entry {
  id: string;
  action: string;
  entityType: string;
  entityId: string;
  payload: Record<string, unknown>;
  idempotencyKey: string;
  clientId: string;
  createdAt: number;
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const entries: Entry[] = Array.isArray(body.entries) ? body.entries : [];

    if (entries.length === 0) {
      return NextResponse.json({ accepted: [], rejected: [] });
    }
    if (entries.length > 100) {
      return NextResponse.json(
        { error: "Batch too large (max 100)" },
        { status: 413 }
      );
    }

    const admin = createSupabaseAdminClient();
    const accepted: string[] = [];
    const rejected: Array<{ idempotencyKey: string; reason: string }> = [];

    // Load marshal context once (used for dispatch actions)
    let marshalCtx: Awaited<ReturnType<typeof getMarshalContext>> = null;
    if (session.role === "marshal") {
      marshalCtx = await getMarshalContext(session.authUserId);
    }

    for (const entry of entries) {
      // 1. Idempotency check
      const { data: existing } = await admin
        .from("sync_events")
        .select("id")
        .eq("idempotency_key", entry.idempotencyKey)
        .maybeSingle();

      if (existing) {
        // Already applied — acknowledge without re-applying
        accepted.push(entry.idempotencyKey);
        continue;
      }

      // 2. Route the action
      try {
        if (entry.action === "dispatch" && session.role === "marshal" && marshalCtx) {
          const action = entry.payload.action as DispatchAction;
          const reason = entry.payload.reason as string | undefined;
          const result = await applyDispatchAction(
            marshalCtx,
            entry.entityId,
            action,
            reason
          );
          if (!result.success) {
            rejected.push({
              idempotencyKey: entry.idempotencyKey,
              reason: result.error ?? "Dispatch failed",
            });
            continue;
          }
        } else {
          // Unknown action — reject with retriable reason
          rejected.push({
            idempotencyKey: entry.idempotencyKey,
            reason: `Unsupported action: ${entry.action}`,
          });
          continue;
        }

        // 3. Record the applied event
        await admin.from("sync_events").insert({
          id: entry.id,
          entity_type: entry.entityType,
          entity_id: entry.entityId,
          operation: "UPDATE",
          payload: entry.payload,
          idempotency_key: entry.idempotencyKey,
          client_id: entry.clientId,
          occurred_at: new Date(entry.createdAt).toISOString(),
        });

        accepted.push(entry.idempotencyKey);
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Unknown error";
        rejected.push({ idempotencyKey: entry.idempotencyKey, reason: msg });
      }
    }

    return NextResponse.json({ accepted, rejected });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[api/sync/replay] error:", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
