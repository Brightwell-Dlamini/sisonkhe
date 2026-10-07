/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * CSV download — returns raw text/csv, not the JSON envelope.
 */

import { NextRequest, NextResponse } from "next/server";
import { requireServerRole } from "@/lib/auth/session";
import { generateComplianceReport, type ReportType } from "@/lib/admin/reports";
import { AppError } from "@/lib/api/errors";
import { fail } from "@/lib/api/response";

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
      throw AppError.validation("Invalid report type");
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
    return fail(err);
  }
}
