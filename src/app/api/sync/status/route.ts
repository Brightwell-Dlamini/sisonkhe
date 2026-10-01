/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * GET /api/sync/status  — lightweight heartbeat + latest seq.
 */

import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  try {
    const admin = createSupabaseAdminClient();
    const { data } = await admin
      .from("sync_events")
      .select("seq")
      .order("seq", { ascending: false })
      .limit(1)
      .maybeSingle();

    return NextResponse.json({
      ok: true,
      serverSeq: data?.seq ?? 0,
      serverTime: new Date().toISOString(),
    });
  } catch (err) {
    return NextResponse.json(
      { ok: false, serverTime: new Date().toISOString() },
      { status: 500 }
    );
  }
}
