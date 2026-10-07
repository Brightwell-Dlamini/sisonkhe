/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * GET  — list marshals (region scoped, paginated)
 * POST — identity-row only (no auth). Prefer field portal for demographics.
 *        Issue login via POST /api/admin/marshals/[id]/issue-login
 */

import type { NextRequest } from "next/server";
import { requireServerRole } from "@/lib/auth/session";
import { regionScopeOrThrow } from "@/lib/auth/permissions";
import type { AuthRole } from "@/lib/auth/roles";
import { listMarshals, createMarshal } from "@/lib/admin/marshals";
import { parsePageParams, buildPageMeta } from "@/lib/pagination";
import { AppError } from "@/lib/api/errors";
import { ok, withApiHandler } from "@/lib/api/response";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const ALLOWED: AuthRole[] = ["super-admin", "admin", "fleet-manager"];

export const GET = withApiHandler(async (request: NextRequest) => {
  const user = await requireServerRole(ALLOWED);
  const regionScope = regionScopeOrThrow(user);
  const { page, limit, offset } = parsePageParams(request.nextUrl.searchParams, {
    limit: 50,
    maxLimit: 200,
  });

  const all = await listMarshals(regionScope);
  const total = all.length;
  const marshals = all.slice(offset, offset + limit);

  return ok(
    { marshals, regionScope },
    { meta: buildPageMeta(total, page, limit) }
  );
});

/** Identity row only — does not create a login. Use issue-login for access. */
export const POST = withApiHandler(async (request: NextRequest) => {
  const user = await requireServerRole(ALLOWED);
  const regionScope = regionScopeOrThrow(user);
  const body = await request.json();

  if (regionScope && body.region && body.region !== regionScope) {
    throw AppError.forbidden(
      `You can only create marshals in region ${regionScope}.`
    );
  }
  if (regionScope && !body.region) body.region = regionScope;

  const result = await createMarshal(body);
  if (!result.success) {
    throw AppError.validation(result.error ?? "Create failed");
  }

  return ok(
    {
      marshal: result.marshal,
      note: "Identity saved without login. Call issue-login to create credentials.",
    },
    { status: 201 }
  );
});
