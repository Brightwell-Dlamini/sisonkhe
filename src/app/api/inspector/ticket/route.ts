/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { NextRequest } from "next/server";
import { requirePermission } from "@/lib/auth/session";
import { createTicketSchema } from "@/lib/inspector/validation";
import { createTicket, listTicketsForOfficer } from "@/lib/inspector/queries";
import { rateLimitAsync } from "@/lib/domain/rateLimit";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import {
  notifyOperatorOfVehicle,
  notifyDriverById,
} from "@/lib/notifications/service";
import { normalizePlate } from "@/lib/domain/identity";
import { AppError } from "@/lib/api/errors";
import { ok, withApiHandler } from "@/lib/api/response";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export const GET = withApiHandler(async () => {
  const session = await requirePermission("inspector.ticket");
  const tickets = await listTicketsForOfficer(
    session.fullName,
    session.authUserId,
    50
  );
  return ok({ tickets });
});

export const POST = withApiHandler(async (request: NextRequest) => {
  const session = await requirePermission("inspector.ticket");

  const rl = await rateLimitAsync(
    `insp-ticket:${session.authUserId}`,
    30,
    60_000
  );
  if (!rl.ok) {
    throw new AppError("RATE_LIMITED", "Ticket rate limit exceeded.", {
      details: { retryAfterSec: rl.retryAfterSec },
    });
  }

  const body = await request.json();
  const parsed = createTicketSchema.safeParse(body);
  if (!parsed.success) {
    throw AppError.validation("Validation failed", {
      issues: parsed.error.flatten().fieldErrors,
    });
  }

  const ticketInput: {
    vehicleReg: string;
    offenseType: string;
    amountSzl: number;
    location?: string;
    notes?: string;
  } = {
    vehicleReg: parsed.data.vehicleReg,
    offenseType: parsed.data.offenseType,
    amountSzl: Number(parsed.data.amountSzl),
    location: parsed.data.location || undefined,
    notes: parsed.data.notes || undefined,
  };

  const ticket = await createTicket(ticketInput, {
    fullName: session.fullName,
    badgeNumber: session.staffId ?? null,
    userId: session.authUserId,
  });

  const plate = normalizePlate(parsed.data.vehicleReg);
  void notifyOperatorOfVehicle(plate, {
    type: "ticket.issue",
    title: "Traffic ticket issued",
    message: `${plate}: ${parsed.data.offenseType} — E${Number(parsed.data.amountSzl).toFixed(2)} (${ticket.ticketNumber}).`,
    href: "/operator",
    entityType: "ticket",
    entityId: ticket.id,
  });

  try {
    const admin = createSupabaseAdminClient();
    const { data: v } = await admin
      .from("vehicles")
      .select("driver_id")
      .eq("registration_number", plate)
      .maybeSingle();
    if (v?.driver_id) {
      void notifyDriverById(v.driver_id as string, {
        type: "ticket.issue",
        title: "Traffic ticket on your vehicle",
        message: `${plate}: ${parsed.data.offenseType}. Speak to your operator.`,
        href: "/driver",
        entityType: "ticket",
        entityId: ticket.id,
      });
    }
  } catch {
    /* non-fatal */
  }

  return ok({ success: true, ticket }, { status: 201 });
});
