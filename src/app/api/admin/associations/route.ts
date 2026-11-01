/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * GET — list associations (region scoped)
 */

import type { NextRequest } from "next/server";
import { requireServerRole } from "@/lib/auth/session";
import { regionScopeOrThrow, assertPermission } from "@/lib/auth/permissions";
import type { AuthRole } from "@/lib/auth/roles";
import { listAssociations } from "@/lib/associations/queries";
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
