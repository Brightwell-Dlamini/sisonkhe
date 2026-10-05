/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * POST /api/sync/push
 * Accept a batch of SyncEvents from a client.
 */

import { NextRequest, NextResponse } from "next/server";
import { applyEvents } from "@/lib/sync/server";
import type { SyncPushRequest } from "@/lib/sync/protocol";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as SyncPushRequest;

    if (!body || !Array.isArray(body.events) || !body.clientId) {
      return NextResponse.json(
        { error: "Body must include events[] and clientId" },
        { status: 400 }
      );
    }

    if (body.events.length > 50) {
      return NextResponse.json(
        { error: "Maximum 50 events per batch" },
        { status: 413 }
      );
    }

    const result = await applyEvents(body.events, body.clientId);
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[sync/push]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
