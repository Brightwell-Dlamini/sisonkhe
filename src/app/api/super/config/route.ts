import { NextResponse } from "next/server";
import { requireServerRole } from "@/lib/auth/session";
import { getConfig } from "@/lib/super/config";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  try {
    await requireServerRole(["super-admin"]);
    return NextResponse.json({ config: await getConfig() });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Error" }, { status: 500 });
  }
}
