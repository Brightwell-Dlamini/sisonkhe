/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * GET /api/marshal/roster?month=YYYY-MM
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth/session";
import { getMarshalContext } from "@/lib/marshal/queries";
import { computeRouteRoster } from "@/lib/marshal/roster";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session || session.role !== "marshal") {
      return NextResponse.json({ error: "Marshal only" }, { status: 403 });
    }
    const ctx = await getMarshalContext(session.authUserId);
    if (!ctx) {
      return NextResponse.json({ error: "No marshal context" }, { status: 404 });
    }

    const month = request.nextUrl.searchParams.get("month") ?? undefined;
    const roster = await computeRouteRoster(ctx, month);

    if (!roster) {
      return NextResponse.json({ error: "No route assigned" }, { status: 404 });
    }

    return NextResponse.json({ roster });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[api/marshal/roster] error:", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
