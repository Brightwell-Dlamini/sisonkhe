/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * GET /api/marshal/terminal
 *
 * Returns the calling marshal's context, visible vehicles, and summary stats.
 * One call, one screen's worth of data.
 */

import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth/session";
import {
  getMarshalContext,
  listVehiclesForMarshal,
  getMarshalSummary,
} from "@/lib/marshal/queries";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
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

    const [vehicles, summary] = await Promise.all([
      listVehiclesForMarshal(context),
      getMarshalSummary(context),
    ]);

    return NextResponse.json({
      context,
      vehicles,
      summary,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[api/marshal/terminal] error:", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
