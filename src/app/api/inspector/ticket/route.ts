/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * GET  /api/inspector/ticket  — list caller's tickets
 * POST /api/inspector/ticket  — create a ticket
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth/session";
import { createTicketSchema } from "@/lib/inspector/validation";
import { createTicket, listTicketsForOfficer } from "@/lib/inspector/queries";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  try {
    const session = await getServerSession();
    if (!session || (session.role !== "inspector" && session.role !== "super-admin")) {
      return NextResponse.json({ error: "Inspector access required" }, { status: 403 });
    }

    const tickets = await listTicketsForOfficer(
      session.fullName,
      session.region ?? null,
      50
    );

    return NextResponse.json({ tickets });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[api/inspector/ticket] GET error:", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session || (session.role !== "inspector" && session.role !== "super-admin")) {
      return NextResponse.json({ error: "Inspector access required" }, { status: 403 });
    }

    const body = await request.json();
    const parsed = createTicketSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Validation failed",
          issues: parsed.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const ticket = await createTicket(parsed.data, {
      fullName: session.fullName,
      badgeNumber: session.badgeNumber ?? null,
    });

    return NextResponse.json({ success: true, ticket });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[api/inspector/ticket] POST error:", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
