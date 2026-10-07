/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { NextRequest } from "next/server";
import { requireServerRole } from "@/lib/auth/session";
import { updateAdvert, deleteAdvert } from "@/lib/super/adverts";
import { AppError } from "@/lib/api/errors";
import { ok, withApiHandler } from "@/lib/api/response";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type Ctx = { params: Promise<{ id: string }> };

export const PATCH = withApiHandler(async (req: NextRequest, ctx: Ctx) => {
  await requireServerRole(["super-admin"]);
  const { id } = await ctx.params;
  const body = await req.json();
  const result = await updateAdvert(id, body);
  if (!result.success) {
    throw AppError.validation(result.error ?? "Update failed");
  }
  return ok({ success: true });
});

export const DELETE = withApiHandler(async (_: NextRequest, ctx: Ctx) => {
  await requireServerRole(["super-admin"]);
  const { id } = await ctx.params;
  const result = await deleteAdvert(id);
  if (!result.success) {
    throw AppError.validation(result.error ?? "Delete failed");
  }
  return ok({ success: true });
});
