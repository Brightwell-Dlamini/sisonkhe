import { NextRequest, NextResponse } from "next/server";
import { requireServerRole } from "@/lib/auth/session";
import { getRotationView } from "@/lib/admin/rotation";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    await requireServerRole(["super-admin", "admin", "fleet-manager"]);
    const routeId = request.nextUrl.searchParams.get("routeId");
    const month = request.nextUrl.searchParams.get("month") ?? undefined;
    if (!routeId) return NextResponse.json({ error: "routeId required" }, { status: 400 });

    const view = await getRotationView(routeId, month);
    if (!view) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ view });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
