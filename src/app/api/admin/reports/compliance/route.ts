import { NextRequest, NextResponse } from "next/server";
import { requireServerRole } from "@/lib/auth/session";
import { generateComplianceReport, type ReportType } from "@/lib/admin/reports";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const VALID: ReportType[] = [
  "expiring-permits",
  "expired-permits",
  "cof-expiry",
  "renewals",
  "fleet-status",
];

export async function GET(request: NextRequest) {
  try {
    await requireServerRole(["super-admin", "admin", "fleet-manager"]);
    const type = request.nextUrl.searchParams.get("type") as ReportType | null;
    if (!type || !VALID.includes(type)) {
      return NextResponse.json({ error: "Invalid report type" }, { status: 400 });
    }

    const { filename, csv } = await generateComplianceReport(type);

    return new NextResponse(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
