import { NextResponse } from "next/server";
import { requireServerRole } from "@/lib/auth/session";
import { listRegionConfigs } from "@/lib/admin/terminals";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  try {
    await requireServerRole(["super-admin", "admin", "fleet-manager"]);
    return NextResponse.json({ terminals: await listRegionConfigs() });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
