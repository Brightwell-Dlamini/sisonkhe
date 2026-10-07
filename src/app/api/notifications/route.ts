/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * GET  — list current user's notifications
 * PATCH — mark one or all as read
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth/session";
import {
  listNotificationsForUser,
  countUnread,
  markNotificationRead,
  markAllNotificationsRead,
} from "@/lib/notifications/service";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const limit = Math.min(
      50,
      Math.max(1, Number(request.nextUrl.searchParams.get("limit")) || 20)
    );

    const [notifications, unread] = await Promise.all([
      listNotificationsForUser(session.authUserId, limit),
      countUnread(session.authUserId),
    ]);

    return NextResponse.json({
      notifications,
      unread,
      // Back-compat shape for older clients
      data: notifications.map((n) => ({
        id: n.id,
        timestamp: n.timestamp,
        message: n.message,
        type: n.type,
        status: n.read ? "read" : "unread",
      })),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const all = body.all === true || body.markAll === true;
    const id = typeof body.id === "string" ? body.id : null;

    if (all) {
      await markAllNotificationsRead(session.authUserId);
    } else if (id) {
      await markNotificationRead(session.authUserId, id);
    } else {
      return NextResponse.json(
        { error: "Provide id or all: true" },
        { status: 400 }
      );
    }

    const unread = await countUnread(session.authUserId);
    return NextResponse.json({ success: true, unread });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
