import { NextResponse } from "next/server";
import { requireServerRole } from "@/lib/auth/session";
import { getAnalyticsSnapshot } from "@/lib/super/analytics";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  try {
    await requireServerRole(["super-admin"]);
    return NextResponse.json(await getAnalyticsSnapshot());
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Error" }, { status: 500 });
  }
}
