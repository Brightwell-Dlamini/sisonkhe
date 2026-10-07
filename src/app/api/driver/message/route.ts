/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * POST /api/driver/message — driver → marshal via notifications transport.
 */

import type { NextRequest } from "next/server";
import { requireServerRole } from "@/lib/auth/session";
import { getDriverContext } from "@/lib/driver/queries";
import { notifyMarshal, getMarshalForRoute } from "@/lib/driver/notifications";
import { AppError } from "@/lib/api/errors";
import { ok, withApiHandler } from "@/lib/api/response";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const MAX_LEN = 500;

export const POST = withApiHandler(async (request: NextRequest) => {
  const session = await requireServerRole(["driver"]);
  const ctx = await getDriverContext(session.authUserId);
  if (!ctx?.vehicle?.routeId) throw AppError.notFound("Route assignment");

  const body = await request.json().catch(() => ({}));
  const message = String(body.message ?? "").trim();
  if (!message) throw AppError.validation("Message required");
  if (message.length > MAX_LEN) {
    throw AppError.validation(`Message exceeds ${MAX_LEN} characters`);
  }

  const marshal = await getMarshalForRoute(ctx.vehicle.routeId);
  if (!marshal) throw AppError.notFound("Marshal on route");

  const sent = await notifyMarshal(
    marshal.name,
    marshal.phone,
    ctx.fullName,
    ctx.vehicle.registrationNumber,
    message
  );
  if (!sent) throw AppError.internal("Notification failed");

  return ok({ success: true });
});
