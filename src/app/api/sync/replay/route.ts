/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * POST /api/sync/replay
 * Accepts outbox entries from the client offline engine and applies them
 * via the event-log protocol.
 */

import { NextRequest, NextResponse } from "next/server";
import { applyEvents } from "@/lib/sync/server";
import type { SyncEvent } from "@/lib/sync/protocol";

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

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const entries: ReplayEntry[] = body.entries ?? [];

    if (!Array.isArray(entries) || entries.length === 0) {
      return NextResponse.json(
        { error: "entries[] required" },
        { status: 400 }
      );
    }

    if (entries.length > 50) {
      return NextResponse.json(
        { error: "Maximum 50 entries per batch" },
        { status: 413 }
      );
    }

    const clientId = entries[0]?.clientId ?? "unknown";

    const events: SyncEvent[] = entries.map((e) => ({
      id: e.id,
      entityType: e.entityType as SyncEvent["entityType"],
      entityId: e.entityId,
      operation: e.action,
      payload: e.payload,
      idempotencyKey: e.idempotencyKey,
      clientId: e.clientId,
      occurredAt: e.createdAt,
      baseVersion: e.baseVersion,
    }));

    const result = await applyEvents(events, clientId);

    // Map back to the shape the client offline engine expects
    return NextResponse.json({
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
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[sync/replay]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
