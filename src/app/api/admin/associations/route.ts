/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * GET  — list associations (region scoped)
 * POST — create association
 */

import type { NextRequest } from "next/server";
import { requireServerRole } from "@/lib/auth/session";
import {
  regionScopeOrThrow,
  assertPermission,
} from "@/lib/auth/permissions";
import type { AuthRole } from "@/lib/auth/roles";
import { listAssociations } from "@/lib/associations/queries";
import { createAssociation } from "@/lib/associations/mutations";
import { AppError } from "@/lib/api/errors";
import { ok, withApiHandler } from "@/lib/api/response";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const ALLOWED: AuthRole[] = ["super-admin", "admin", "fleet-manager"];

export const GET = withApiHandler(async (_request: NextRequest) => {
  const user = await requireServerRole(ALLOWED);
  assertPermission(user, "admin.associations.read");
  const regionScope = regionScopeOrThrow(user);

  const associations = await listAssociations(regionScope);

  return ok({ associations, regionScope });
});

export const POST = withApiHandler(async (request: NextRequest) => {
  const user = await requireServerRole(ALLOWED);
  assertPermission(user, "admin.associations.write");
  const regionScope = regionScopeOrThrow(user);

  const body = await request.json();

  if (regionScope) {
    if (body.regionCode && body.regionCode !== regionScope) {
      throw AppError.forbidden(
        `You can only create associations in region ${regionScope}.`
      );
    }
    if (!body.regionCode) {
      body.regionCode = regionScope;
    }
  }

  const result = await createAssociation(body);
  if (!result.success) {
    throw AppError.validation(result.error, result.issues);
  }

  return ok({ association: result.association }, { status: 201 });
});
