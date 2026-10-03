import { NextRequest, NextResponse } from "next/server";
import { requireServerRole } from "@/lib/auth/session";
import { listSystemErrors, logSystemError } from "@/lib/super/errors";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  try {
    await requireServerRole(["super-admin"]);
    return NextResponse.json({ errors: await listSystemErrors() });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await requireServerRole(["super-admin"]);
    const body = await req.json();
    return NextResponse.json(await logSystemError(body));
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Error" }, { status: 500 });
  }
}
