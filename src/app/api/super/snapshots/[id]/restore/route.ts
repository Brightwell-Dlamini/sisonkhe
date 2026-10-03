import { NextResponse } from "next/server";
import { requireServerRole } from "@/lib/auth/session";
import { createSupabaseAdminClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireServerRole(["super-admin"]);
    const { id } = await params;
    const admin = createSupabaseAdminClient();

    const { data: snap } = await admin
      .from("system_snapshots")
      .select("snapshot_data")
      .eq("id", id)
      .maybeSingle();

    if (!snap) return NextResponse.json({ error: "Snapshot not found" }, { status: 404 });

    const data = snap.snapshot_data as Record<string, unknown[]>;

    // Restore in a specific safe order: reference data first
    const order = [
      "regions",
      "routes",
      "staff",
      "drivers",
      "fleet_operators",
      "vehicles",
      "marshals",
    ];

    for (const table of order) {
      const rows = data[table];
      if (!rows || rows.length === 0) continue;
      // Upsert each row
      for (const row of rows) {
        await admin.from(table).upsert(row as Record<string, unknown>);
      }
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Error" }, { status: 500 });
  }
}
