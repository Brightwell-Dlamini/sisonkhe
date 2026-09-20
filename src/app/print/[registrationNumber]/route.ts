/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Single permit print view — returns raw HTML.
 * Using a route handler (not a page) so we bypass the Next.js root layout.
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth/session";
import { buildPermitDocument } from "@/lib/printing/permit";
import { renderPermitHtml } from "@/lib/printing/render";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const ALLOWED_ROLES = ["super-admin", "admin", "fleet-manager"];

interface Params {
  params: Promise<{ registrationNumber: string }>;
}

export async function GET(_: NextRequest, { params }: Params) {
  const session = await getServerSession();
  if (!session || !ALLOWED_ROLES.includes(session.role)) {
    return NextResponse.redirect(new URL("/login", process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"));
  }

  const { registrationNumber } = await params;
  const reg = decodeURIComponent(registrationNumber).toUpperCase();
  const doc = await buildPermitDocument(reg);

  if (!doc) {
    return new NextResponse(
      `<!DOCTYPE html><html><body style="font-family:sans-serif;padding:40px"><h1>Permit not found</h1><p>Vehicle <code>${reg}</code> does not exist.</p><a href="/admin/permits/print">← Back to Print Queue</a></body></html>`,
      { status: 404, headers: { "Content-Type": "text/html; charset=utf-8" } }
    );
  }

  const html = await renderPermitHtml(doc);

  return new NextResponse(html, {
    status: 200,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}
