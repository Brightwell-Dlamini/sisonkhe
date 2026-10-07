/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { NextRequest } from "next/server";
import { requireServerRole } from "@/lib/auth/session";
import type { AuthRole } from "@/lib/auth/roles";
import { updateRoute, deleteRoute } from "@/lib/admin/routes";
import { AppError } from "@/lib/api/errors";
import { ok, withApiHandler } from "@/lib/api/response";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const ALLOWED: AuthRole[] = ["super-admin", "admin", "fleet-manager"];

type Ctx = { params: Promise<{ id: string }> };

export const PATCH = withApiHandler(async (request: NextRequest, ctx: Ctx) => {
  await requireServerRole(ALLOWED);
  const { id } = await ctx.params;
  const body = await request.json();
  const result = await updateRoute(id, body);
  if (!result.success) {
    throw AppError.validation(result.error ?? "Update failed");
  }
  return ok({ success: true });
});

export const DELETE = withApiHandler(async (_: NextRequest, ctx: Ctx) => {
  await requireServerRole(ALLOWED);
  const { id } = await ctx.params;
  const result = await deleteRoute(id);
  if (!result.success) {
    throw AppError.conflict(result.error ?? "Delete failed");
  }
  return ok({ success: true });
});
