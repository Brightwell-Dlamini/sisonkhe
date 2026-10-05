import { NextRequest, NextResponse } from "next/server";
import { requireServerRole } from "@/lib/auth/session";
import type { AuthRole } from "@/lib/auth/roles";
import { updateRoute, deleteRoute } from "@/lib/admin/routes";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const ALLOWED: AuthRole[] = ["super-admin", "admin", "fleet-manager"];

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireServerRole(ALLOWED);
    const { id } = await params;
    const body = await request.json();
    const result = await updateRoute(id, body);
    if (!result.success)
      return NextResponse.json({ error: result.error }, { status: 400 });
    return NextResponse.json({ success: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function DELETE(
  _: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireServerRole(ALLOWED);
    const { id } = await params;
    const result = await deleteRoute(id);
    if (!result.success)
      return NextResponse.json({ error: result.error }, { status: 400 });
    return NextResponse.json({ success: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
