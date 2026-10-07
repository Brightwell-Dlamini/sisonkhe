/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { NextRequest } from "next/server";
import { requireServerRole } from "@/lib/auth/session";
import { listSystemErrors, logSystemError } from "@/lib/super/errors";
import { ok, withApiHandler } from "@/lib/api/response";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export const GET = withApiHandler(async () => {
  await requireServerRole(["super-admin"]);
  return ok({ errors: await listSystemErrors() });
});

export const POST = withApiHandler(async (req: NextRequest) => {
  await requireServerRole(["super-admin"]);
  const body = await req.json();
  return ok(await logSystemError(body), { status: 201 });
});
