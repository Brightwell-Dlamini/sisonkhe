import { NextRequest, NextResponse } from "next/server";
import { requireServerRole } from "@/lib/auth/session";
import {
  listRegionConfigs,
  listTerminals,
  createTerminal,
} from "@/lib/admin/terminals";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  try {
    await requireServerRole(["super-admin", "admin", "fleet-manager"]);
    const [terminals, terminalRecords] = await Promise.all([
      listRegionConfigs(),
      listTerminals(),
    ]);
    return NextResponse.json({ terminals, terminalRecords });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireServerRole(["super-admin", "admin", "fleet-manager"]);
    const body = await request.json();
    const name = String(body.name ?? "").trim();
    const region = String(body.region ?? "").trim();
    if (!name || !region) {
      return NextResponse.json(
        { error: "Name and region are required." },
        { status: 400 }
      );
    }
    const result = await createTerminal({
      region,
      name,
      emergencyNumber: body.emergencyNumber ?? null,
      announcement: body.announcement ?? null,
    });
    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }
    return NextResponse.json({ success: true, terminal: result.terminal });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
