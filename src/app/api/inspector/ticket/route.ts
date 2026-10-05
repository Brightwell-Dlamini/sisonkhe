/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * GET  /api/inspector/ticket  — list caller's tickets
 * POST /api/inspector/ticket  — create a ticket
 */

import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth/session";
import { createTicketSchema } from "@/lib/inspector/validation";
import { createTicket, listTicketsForOfficer } from "@/lib/inspector/queries";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  try {
    const session = await requirePermission("inspector.ticket");

    const tickets = await listTicketsForOfficer(
      session.fullName,
      session.region ?? null,
      50
    );

    return NextResponse.json({ tickets });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    const status =
      message === "UNAUTHENTICATED"
        ? 401
        : message === "FORBIDDEN"
          ? 403
          : 500;
    console.error("[api/inspector/ticket] GET error:", err);
    return NextResponse.json({ error: message }, { status });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requirePermission("inspector.ticket");

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
      badgeNumber: session.staffId ?? null,
    });

    return NextResponse.json({ success: true, ticket });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    const status =
      message === "UNAUTHENTICATED"
        ? 401
        : message === "FORBIDDEN"
          ? 403
          : 500;
    console.error("[api/inspector/ticket] POST error:", err);
    return NextResponse.json({ error: message }, { status });
  }
}
