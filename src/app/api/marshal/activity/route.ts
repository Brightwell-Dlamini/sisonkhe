/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth/session";
import { getMarshalContext, getMarshalActivity } from "@/lib/marshal/queries";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session || session.role !== "marshal") {
      return NextResponse.json(
        { error: "Marshal access required" },
        { status: 403 }
      );
    }

    const context = await getMarshalContext(session.authUserId);
    if (!context) {
      return NextResponse.json(
        { error: "Marshal assignment not found" },
        { status: 404 }
      );
    }

    const limitParam = request.nextUrl.searchParams.get("limit");
    const limit = Math.min(50, Math.max(1, Number(limitParam) || 10));

    const activity = await getMarshalActivity(context, limit);
    return NextResponse.json({ activity });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[api/marshal/activity] error:", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
