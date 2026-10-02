import { NextRequest, NextResponse } from "next/server";
import { requireServerRole } from "@/lib/auth/session";
import { listRoutes, createRoute } from "@/lib/admin/routes";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const ALLOWED = ["super-admin", "admin", "fleet-manager"];

export async function GET() {
  try {
    await requireServerRole(ALLOWED);
    return NextResponse.json({ routes: await listRoutes() });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireServerRole(ALLOWED);
    const body = await request.json();
    const result = await createRoute(body);
    if (!result.success) return NextResponse.json({ error: result.error }, { status: 400 });
    return NextResponse.json({ route: result.route });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
