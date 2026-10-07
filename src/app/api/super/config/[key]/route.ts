/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { NextRequest } from "next/server";
import { requireServerRole } from "@/lib/auth/session";
import { setConfigKey } from "@/lib/super/config";
import { AppError } from "@/lib/api/errors";
import { ok, withApiHandler } from "@/lib/api/response";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type Ctx = { params: Promise<{ key: string }> };

export const PATCH = withApiHandler(async (req: NextRequest, ctx: Ctx) => {
  await requireServerRole(["super-admin"]);
  const { key } = await ctx.params;
  const body = await req.json();
  const result = await setConfigKey(key, body.value);
  if (!result.success) {
    throw AppError.validation(result.error ?? "Config update failed");
  }
  return ok({ success: true });
});
