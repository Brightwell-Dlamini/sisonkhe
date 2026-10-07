/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { NextRequest } from "next/server";
import { requireServerRole } from "@/lib/auth/session";
import { runAssistantQuery } from "@/lib/super/assistant";
import { AppError } from "@/lib/api/errors";
import { ok, withApiHandler } from "@/lib/api/response";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export const POST = withApiHandler(async (req: NextRequest) => {
  const user = await requireServerRole(["super-admin"]);
  const body = await req.json();
  const q = String(body.query ?? "");
  if (!q.trim()) throw AppError.validation("query required");
  return ok(await runAssistantQuery(q, user));
});
