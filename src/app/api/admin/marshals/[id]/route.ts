import { NextRequest, NextResponse } from "next/server";
import { requireServerRole } from "@/lib/auth/session";
import type { AuthRole } from "@/lib/auth/roles";
import {
  getMarshalById,
  updateMarshal,
  deactivateMarshal,
} from "@/lib/admin/marshals";
import { notifyMarshalById } from "@/lib/notifications/service";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const ALLOWED: AuthRole[] = ["super-admin", "admin", "fleet-manager"];

export async function GET(
  _: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireServerRole(ALLOWED);
    const { id } = await params;
    const marshal = await getMarshalById(id);
    if (!marshal)
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ marshal });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireServerRole(ALLOWED);
    const { id } = await params;
    const body = await request.json();
    const result = await updateMarshal(id, body);
    if (!result.success)
      return NextResponse.json({ error: result.error }, { status: 400 });

    if (body.region || body.assignedRouteId !== undefined || body.terminalName) {
      const parts: string[] = [];
      if (body.region) parts.push(`region ${body.region}`);
      if (body.terminalName) parts.push(`terminal ${body.terminalName}`);
      if (body.assignedRouteId)
        parts.push("a fixed corridor route");
      else if (body.assignedRouteId === null)
        parts.push("no fixed route");

      void notifyMarshalById(id, {
        type: "marshal.route",
        title: "Rank post updated",
        message:
          parts.length > 0
            ? `Your assignment was updated: ${parts.join(", ")}.`
            : "Your rank assignment was updated by admin.",
        href: "/marshal",
        entityType: "marshal",
        entityId: id,
      });
    }

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
    const result = await deactivateMarshal(id);
    if (!result.success)
      return NextResponse.json({ error: result.error }, { status: 400 });

    void notifyMarshalById(id, {
      type: "marshal.route",
      title: "Account deactivated",
      message: "Your marshal account was deactivated. Contact rank admin.",
      href: "/login",
      entityType: "marshal",
      entityId: id,
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
