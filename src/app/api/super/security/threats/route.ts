import { NextResponse } from "next/server";
import { requireServerRole } from "@/lib/auth/session";
import { listThreats } from "@/lib/super/security";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  try {
    await requireServerRole(["super-admin"]);
    return NextResponse.json({ threats: await listThreats() });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Error" }, { status: 500 });
  }
}
