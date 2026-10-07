/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { NextRequest } from "next/server";
import { requireServerRole } from "@/lib/auth/session";
import { listAdverts, createAdvert } from "@/lib/super/adverts";
import { AppError } from "@/lib/api/errors";
import { ok, withApiHandler } from "@/lib/api/response";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export const GET = withApiHandler(async () => {
  await requireServerRole(["super-admin"]);
  return ok({ adverts: await listAdverts() });
});

export const POST = withApiHandler(async (req: NextRequest) => {
  await requireServerRole(["super-admin"]);
  const body = await req.json();
  const result = await createAdvert(body);
  if (!result.success) {
    throw AppError.validation(result.error ?? "Create advert failed");
  }
  return ok({ advert: result.advert }, { status: 201 });
});
