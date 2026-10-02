/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * GET  /api/marshal/messages — recent messages
 * POST /api/marshal/messages — send a message to a driver
 * Body: { driverId, driverName, driverPhone, message }
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth/session";
import { getMarshalContext } from "@/lib/marshal/queries";
import {
  listDriverMessages,
  sendMessageToDriver,
} from "@/lib/marshal/messages";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  try {
    const session = await getServerSession();
    if (!session || session.role !== "marshal") {
      return NextResponse.json({ error: "Marshal only" }, { status: 403 });
    }
    const ctx = await getMarshalContext(session.authUserId);
    if (!ctx) return NextResponse.json({ error: "No context" }, { status: 404 });

    const messages = await listDriverMessages(ctx.marshalId, 50);
    return NextResponse.json({ messages });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session || session.role !== "marshal") {
      return NextResponse.json({ error: "Marshal only" }, { status: 403 });
    }
    const ctx = await getMarshalContext(session.authUserId);
    if (!ctx) return NextResponse.json({ error: "No context" }, { status: 404 });

    const body = await request.json();
    const driverName = String(body.driverName ?? "").trim();
    const driverPhone = body.driverPhone ? String(body.driverPhone) : null;
    const message = String(body.message ?? "").trim();

    if (!driverName || !message) {
      return NextResponse.json(
        { error: "driverName and message required" },
        { status: 400 }
      );
    }

    const sent = await sendMessageToDriver(
      ctx.fullName,
      driverName,
      driverPhone,
      message
    );

    if (!sent) {
      return NextResponse.json({ error: "Send failed" }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: sent });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
