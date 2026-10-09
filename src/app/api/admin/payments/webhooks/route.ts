/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Recent payment webhook deliveries for ops.
 */

import type { NextRequest } from "next/server";
import { requireServerSession } from "@/lib/auth/session";
import { listRecentWebhookEvents } from "@/lib/payments/webhookEvents";
import { ok, withApiHandler } from "@/lib/api/response";
import { AppError } from "@/lib/api/errors";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export const GET = withApiHandler(async (request: NextRequest) => {
  const session = await requireServerSession(request);
  const role = session.role ?? "";
  if (!["admin", "super-admin", "fleet-manager"].includes(role)) {
    throw AppError.forbidden("Admin only");
  }

  const events = await listRecentWebhookEvents(50);
  return ok({ events, generatedAt: new Date().toISOString() });
});
