import { NextRequest, NextResponse } from "next/server";
import { requireServerRole } from "@/lib/auth/session";
import { runAssistantQuery } from "@/lib/super/assistant";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const user = await requireServerRole(["super-admin"]);
    const body = await req.json();
    const q = String(body.query ?? "");
    if (!q.trim()) return NextResponse.json({ error: "query required" }, { status: 400 });
    return NextResponse.json(await runAssistantQuery(q, user));
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Error" }, { status: 500 });
  }
}
