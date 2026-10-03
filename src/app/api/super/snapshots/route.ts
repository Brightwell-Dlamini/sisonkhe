import { NextRequest, NextResponse } from "next/server";
import { requireServerRole } from "@/lib/auth/session";
import { listSnapshots, createSnapshot } from "@/lib/super/snapshots";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  try {
    await requireServerRole(["super-admin"]);
    return NextResponse.json({ snapshots: await listSnapshots() });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireServerRole(["super-admin"]);
    const body = await req.json();
    const result = await createSnapshot(body.label ?? `Manual snapshot`, session.authUserId);
    if (!result.success) return NextResponse.json({ error: result.error }, { status: 400 });
    return NextResponse.json({ success: true, id: result.id });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Error" }, { status: 500 });
  }
}
