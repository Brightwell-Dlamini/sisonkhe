import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { requireServerRole } from "@/lib/auth/session";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  try {
    await requireServerRole(["super-admin", "admin", "fleet-manager"]);
    const admin = createSupabaseAdminClient();

    // Read from regions table where it might be stored, or fall back to defaults
    // In our schema we don't have a dedicated system_settings table yet.
    // Return defaults.
    return NextResponse.json({
      rankFee: 25,
      splitOperational: 20,
      splitNRTC: 3.5,
      splitMaintenance: 1.5,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    await requireServerRole(["super-admin"]);
    const body = await request.json();
    // Persist somewhere. For now, this is a placeholder that returns success
    // and stores in a future `system_config` table.
    return NextResponse.json({ success: true, config: body });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
