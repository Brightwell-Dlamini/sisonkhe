/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Batch permit print view.
 *
 * Query param: ?regs=HSD%20101%20BM,MSD%20601%20MZ (comma-separated)
 * Or POST with body { regs: string[] } if the list is long.
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth/session";
import { buildPermitDocument } from "@/lib/printing/permit";
import { renderBatchPermitHtml } from "@/lib/printing/batch";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const ALLOWED_ROLES = ["super-admin", "admin", "fleet-manager"];
const MAX_BATCH = 50;

export async function GET(request: NextRequest) {
  const session = await getServerSession();
  if (!session || !ALLOWED_ROLES.includes(session.role)) {
    return NextResponse.redirect(
      new URL("/login", process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000")
    );
  }

  const regsParam = request.nextUrl.searchParams.get("regs") ?? "";
  const regs = regsParam
    .split(",")
    .map((r) => decodeURIComponent(r).trim().toUpperCase())
    .filter((r) => r.length > 0)
    .slice(0, MAX_BATCH);

  if (regs.length === 0) {
    return new NextResponse(
      `<!DOCTYPE html><html><body style="font-family:sans-serif;padding:40px"><h1>No vehicles selected</h1><a href="/admin/permits/print">← Back to Print Queue</a></body></html>`,
      { status: 400, headers: { "Content-Type": "text/html; charset=utf-8" } }
    );
  }

  const docs = (
    await Promise.all(regs.map((r) => buildPermitDocument(r)))
  ).filter((d): d is NonNullable<typeof d> => d !== null);

  if (docs.length === 0) {
    return new NextResponse(
      `<!DOCTYPE html><html><body style="font-family:sans-serif;padding:40px"><h1>No valid vehicles found</h1><a href="/admin/permits/print">← Back</a></body></html>`,
      { status: 404, headers: { "Content-Type": "text/html; charset=utf-8" } }
    );
  }

  const html = await renderBatchPermitHtml(docs);

  return new NextResponse(html, {
    status: 200,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}
