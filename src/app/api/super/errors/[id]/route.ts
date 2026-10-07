/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { NextRequest } from "next/server";
import { requireServerRole } from "@/lib/auth/session";
import { updateErrorStatus } from "@/lib/super/errors";
import { AppError } from "@/lib/api/errors";
import { ok, withApiHandler } from "@/lib/api/response";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type Ctx = { params: Promise<{ id: string }> };

export const PATCH = withApiHandler(async (req: NextRequest, ctx: Ctx) => {
  await requireServerRole(["super-admin"]);
  const { id } = await ctx.params;
  const body = await req.json();
  const result = await updateErrorStatus(id, body.status);
  if (!result.success) {
    throw AppError.validation(result.error ?? "Status update failed");
  }
  return ok({ success: true });
});
