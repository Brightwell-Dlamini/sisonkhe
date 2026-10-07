/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * GET  — list current user's notifications
 * PATCH — mark one or all as read
 */

import type { NextRequest } from "next/server";
import { requireServerSession } from "@/lib/auth/session";
import {
  listNotificationsForUser,
  countUnread,
  markNotificationRead,
  markAllNotificationsRead,
} from "@/lib/notifications/service";
import { AppError } from "@/lib/api/errors";
import { ok, withApiHandler } from "@/lib/api/response";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export const GET = withApiHandler(async (request: NextRequest) => {
  const session = await requireServerSession();

  const limit = Math.min(
    50,
    Math.max(1, Number(request.nextUrl.searchParams.get("limit")) || 20)
  );

  const [notifications, unread] = await Promise.all([
    listNotificationsForUser(session.authUserId, limit),
    countUnread(session.authUserId),
  ]);

  return ok({
    notifications,
    unread,
    data: notifications.map((n) => ({
      id: n.id,
      timestamp: n.timestamp,
      message: n.message,
      type: n.type,
      status: n.read ? "read" : "unread",
    })),
  });
});

export const PATCH = withApiHandler(async (request: NextRequest) => {
  const session = await requireServerSession();

  const body = await request.json().catch(() => ({}));
  const all = body.all === true || body.markAll === true;
  const id = typeof body.id === "string" ? body.id : null;

  if (all) {
    await markAllNotificationsRead(session.authUserId);
  } else if (id) {
    await markNotificationRead(session.authUserId, id);
  } else {
    throw AppError.validation("Provide id or all: true");
  }

  const unread = await countUnread(session.authUserId);
  return ok({ success: true, unread });
});
