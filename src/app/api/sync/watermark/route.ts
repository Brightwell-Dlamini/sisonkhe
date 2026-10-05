/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * GET /api/sync/watermark
 * Lightweight latest sequence number for polling clients.
 */

import { NextResponse } from "next/server";
import { getLatestSeq } from "@/lib/sync/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  try {
    const seq = await getLatestSeq();
    return NextResponse.json({ seq, ts: Date.now() });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[sync/watermark]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
