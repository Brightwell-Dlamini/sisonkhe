import { NextRequest, NextResponse } from "next/server";
import { requireServerRole } from "@/lib/auth/session";
import { getYoYView } from "@/lib/admin/yoy";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    await requireServerRole(["super-admin", "admin", "fleet-manager"]);
    const routeId = request.nextUrl.searchParams.get("routeId");
    const year = parseInt(request.nextUrl.searchParams.get("year") ?? "", 10) || new Date().getFullYear();
    const compareYear = parseInt(request.nextUrl.searchParams.get("compareYear") ?? "", 10) || year - 1;
    if (!routeId) return NextResponse.json({ error: "routeId required" }, { status: 400 });

    const view = await getYoYView(routeId, year, compareYear);
    if (!view) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ view });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
