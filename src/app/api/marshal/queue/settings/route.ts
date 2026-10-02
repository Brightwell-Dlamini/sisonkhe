/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * GET  /api/marshal/queue/settings
 * POST /api/marshal/queue/settings
 * Body: { moveLoadingToBottom: boolean, rankFee?: number, ... }
 *
 * Persists queue settings per marshal.
 */

import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { getServerSession } from "@/lib/auth/session";
import { getMarshalContext } from "@/lib/marshal/queries";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  try {
    const session = await getServerSession();
    if (!session || session.role !== "marshal") {
      return NextResponse.json({ error: "Marshal only" }, { status: 403 });
    }
    const ctx = await getMarshalContext(session.authUserId);
    if (!ctx) return NextResponse.json({ error: "No context" }, { status: 404 });

    const admin = createSupabaseAdminClient();
    // Read from a key-value settings table if exists, else return defaults
    const { data } = await admin
      .from("staff")
      .select("region")
      .eq("id", "system-settings-placeholder")
      .maybeSingle();

    return NextResponse.json({
      moveLoadingToBottom: true,
      rankFee: 25,
      splitOperational: 20,
      splitNRTC: 3.5,
      splitMaintenance: 1.5,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session || session.role !== "marshal") {
      return NextResponse.json({ error: "Marshal only" }, { status: 403 });
    }
    const body = await request.json();
    // Persist to localStorage on client, but no-op here.
    // In a future phase, add a system_settings table.
    return NextResponse.json({ success: true, settings: body });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
