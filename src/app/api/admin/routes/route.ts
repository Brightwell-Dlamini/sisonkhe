/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { NextRequest } from "next/server";
import { requireServerRole } from "@/lib/auth/session";
import { regionScopeOrThrow } from "@/lib/auth/permissions";
import type { AuthRole } from "@/lib/auth/roles";
import { listRoutes, createRoute } from "@/lib/admin/routes";
import { AppError } from "@/lib/api/errors";
import { ok, withApiHandler } from "@/lib/api/response";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const ALLOWED: AuthRole[] = ["super-admin", "admin", "fleet-manager"];

export const GET = withApiHandler(async () => {
  const user = await requireServerRole(ALLOWED);
  const regionScope = regionScopeOrThrow(user);
  const routes = await listRoutes(regionScope);
  return ok({ routes, regionScope });
});

export const POST = withApiHandler(async (request: NextRequest) => {
  const user = await requireServerRole(ALLOWED);
  const regionScope = regionScopeOrThrow(user);
  const body = await request.json();

  if (regionScope && body.region && body.region !== regionScope) {
    throw AppError.forbidden(`You can only create routes in region ${regionScope}.`);
  }
  if (regionScope && !body.region) body.region = regionScope;

  const result = await createRoute(body);
  if (!result.success) {
    throw AppError.validation(result.error ?? "Create failed");
  }
  return ok({ route: result.route }, { status: 201 });
});
