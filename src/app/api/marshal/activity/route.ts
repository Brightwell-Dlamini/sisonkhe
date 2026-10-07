/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { NextRequest } from "next/server";
import { requireServerRole } from "@/lib/auth/session";
import { getMarshalContext, getMarshalActivity } from "@/lib/marshal/queries";
import { AppError } from "@/lib/api/errors";
import { ok, withApiHandler } from "@/lib/api/response";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export const GET = withApiHandler(async (request: NextRequest) => {
  const session = await requireServerRole(["marshal"]);
  const context = await getMarshalContext(session.authUserId);
  if (!context) throw AppError.notFound("Marshal assignment");

  const limitParam = request.nextUrl.searchParams.get("limit");
  const limit = Math.min(50, Math.max(1, Number(limitParam) || 10));
  const activity = await getMarshalActivity(context, limit);
  return ok({ activity });
});
