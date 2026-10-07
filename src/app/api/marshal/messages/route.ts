/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * GET  /api/marshal/messages — recent messages
 * POST /api/marshal/messages — send a message to a driver
 */

import type { NextRequest } from "next/server";
import { requireServerRole } from "@/lib/auth/session";
import { getMarshalContext } from "@/lib/marshal/queries";
import {
  listDriverMessages,
  sendMessageToDriver,
} from "@/lib/marshal/messages";
import { AppError } from "@/lib/api/errors";
import { ok, withApiHandler } from "@/lib/api/response";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export const GET = withApiHandler(async () => {
  const session = await requireServerRole(["marshal"]);
  const ctx = await getMarshalContext(session.authUserId);
  if (!ctx) throw AppError.notFound("Marshal context");

  const messages = await listDriverMessages(ctx.marshalId, 50);
  return ok({ messages });
});

export const POST = withApiHandler(async (request: NextRequest) => {
  const session = await requireServerRole(["marshal"]);
  const ctx = await getMarshalContext(session.authUserId);
  if (!ctx) throw AppError.notFound("Marshal context");

  const body = await request.json();
  const driverName = String(body.driverName ?? "").trim();
  const driverPhone = body.driverPhone ? String(body.driverPhone) : null;
  const message = String(body.message ?? "").trim();

  if (!driverName || !message) {
    throw AppError.validation("driverName and message required");
  }

  const sent = await sendMessageToDriver(
    ctx.fullName,
    driverName,
    driverPhone,
    message
  );
  if (!sent) throw AppError.internal("Send failed");

  return ok({ success: true, message: sent });
});
