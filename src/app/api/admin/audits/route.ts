import { NextResponse } from "next/server";
import { requireServerRole } from "@/lib/auth/session";
import { listAuditEntries } from "@/lib/admin/audits";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  try {
    await requireServerRole(["super-admin", "admin"]);
    return NextResponse.json({ entries: await listAuditEntries(200) });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
