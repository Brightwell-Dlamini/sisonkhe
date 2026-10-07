/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { NextRequest } from "next/server";
import { requireServerRole } from "@/lib/auth/session";
import type { AuthRole } from "@/lib/auth/roles";
import {
  getMarshalById,
  updateMarshal,
  deactivateMarshal,
} from "@/lib/admin/marshals";
import { notifyMarshalById } from "@/lib/notifications/service";
import { AppError } from "@/lib/api/errors";
import { ok, withApiHandler } from "@/lib/api/response";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const ALLOWED: AuthRole[] = ["super-admin", "admin", "fleet-manager"];

type Ctx = { params: Promise<{ id: string }> };

export const GET = withApiHandler(async (_: NextRequest, ctx: Ctx) => {
  await requireServerRole(ALLOWED);
  const { id } = await ctx.params;
  const marshal = await getMarshalById(id);
  if (!marshal) throw AppError.notFound("Marshal");
  return ok({ marshal });
});

export const PATCH = withApiHandler(async (request: NextRequest, ctx: Ctx) => {
  await requireServerRole(ALLOWED);
  const { id } = await ctx.params;
  const body = await request.json();
  const result = await updateMarshal(id, body);
  if (!result.success) {
    throw AppError.validation(result.error ?? "Update failed");
  }

  if (body.region || body.assignedRouteId !== undefined || body.terminalName) {
    const parts: string[] = [];
    if (body.region) parts.push(`region ${body.region}`);
    if (body.terminalName) parts.push(`terminal ${body.terminalName}`);
    if (body.assignedRouteId) parts.push("a fixed corridor route");
    else if (body.assignedRouteId === null) parts.push("no fixed route");

    void notifyMarshalById(id, {
      type: "marshal.route",
      title: "Rank post updated",
      message:
        parts.length > 0
          ? `Your assignment was updated: ${parts.join(", ")}.`
          : "Your rank assignment was updated by admin.",
      href: "/marshal",
      entityType: "marshal",
      entityId: id,
    });
  }

  return ok({ success: true });
});

export const DELETE = withApiHandler(async (_: NextRequest, ctx: Ctx) => {
  await requireServerRole(ALLOWED);
  const { id } = await ctx.params;
  const result = await deactivateMarshal(id);
  if (!result.success) {
    throw AppError.validation(result.error ?? "Deactivate failed");
  }

  void notifyMarshalById(id, {
    type: "marshal.route",
    title: "Account deactivated",
    message: "Your marshal account was deactivated. Contact rank admin.",
    href: "/login",
    entityType: "marshal",
    entityId: id,
  });

  return ok({ success: true });
});
