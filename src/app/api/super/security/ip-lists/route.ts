/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { NextRequest } from "next/server";
import { requireServerRole } from "@/lib/auth/session";
import { getIpLists, setIpLists } from "@/lib/super/security";
import { AppError } from "@/lib/api/errors";
import { ok, withApiHandler } from "@/lib/api/response";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export const GET = withApiHandler(async () => {
  await requireServerRole(["super-admin"]);
  return ok(await getIpLists());
});

export const POST = withApiHandler(async (req: NextRequest) => {
  await requireServerRole(["super-admin"]);
  const body = await req.json();
  const result = await setIpLists(body);
  if (!result.success) {
    throw AppError.validation(result.error ?? "IP list update failed");
  }
  return ok({ success: true });
});
