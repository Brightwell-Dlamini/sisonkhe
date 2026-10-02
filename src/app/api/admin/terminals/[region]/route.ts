import { NextRequest, NextResponse } from "next/server";
import { requireServerRole } from "@/lib/auth/session";
import { updateRegionConfig } from "@/lib/admin/terminals";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ region: string }> }) {
  try {
    await requireServerRole(["super-admin", "admin", "fleet-manager"]);
    const { region } = await params;
    const body = await request.json();
    const result = await updateRegionConfig(region, body);
    if (!result.success) return NextResponse.json({ error: result.error }, { status: 400 });
    return NextResponse.json({ success: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
