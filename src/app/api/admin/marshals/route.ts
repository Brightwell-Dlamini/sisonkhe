import { NextRequest, NextResponse } from "next/server";
import { requireServerRole } from "@/lib/auth/session";
import { listMarshals, createMarshal } from "@/lib/admin/marshals";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const ALLOWED = ["super-admin", "admin", "fleet-manager"];

export async function GET() {
  try {
    await requireServerRole(ALLOWED);
    const marshals = await listMarshals();
    return NextResponse.json({ marshals });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Error";
    return NextResponse.json(
      { error: msg },
      { status: msg === "UNAUTHENTICATED" ? 401 : msg === "FORBIDDEN" ? 403 : 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireServerRole(ALLOWED);
    const body = await request.json();
    const result = await createMarshal(body);
    if (!result.success) return NextResponse.json({ error: result.error }, { status: 400 });
    return NextResponse.json({ marshal: result.marshal });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
