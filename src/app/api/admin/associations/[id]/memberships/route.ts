/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * GET  — list memberships for an association
 * POST — add membership
 * PATCH — update membership status
 */

import type { NextRequest } from "next/server";
import { requireServerRole } from "@/lib/auth/session";
import {
  regionScopeOrThrow,
  assertPermission,
} from "@/lib/auth/permissions";
import type { AuthRole } from "@/lib/auth/roles";
import {
  getAssociationById,
  listMembershipsForAssociation,
} from "@/lib/associations/queries";
import {
  addMembership,
  updateMembershipStatus,
} from "@/lib/associations/mutations";
import { AppError } from "@/lib/api/errors";
import { ok, withApiHandler } from "@/lib/api/response";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const ALLOWED: AuthRole[] = ["super-admin", "admin", "fleet-manager"];

type Ctx = { params: Promise<{ id: string }> };

export const GET = withApiHandler(
  async (_request: NextRequest, context: Ctx) => {
    const user = await requireServerRole(ALLOWED);
    assertPermission(user, "admin.associations.read");
    const regionScope = regionScopeOrThrow(user);
    const { id } = await context.params;

    const association = await getAssociationById(id, regionScope);
    if (!association) throw AppError.notFound("Association");

    const memberships = await listMembershipsForAssociation(id);
    return ok({ association, memberships });
  }
);

export const POST = withApiHandler(
  async (request: NextRequest, context: Ctx) => {
    const user = await requireServerRole(ALLOWED);
    assertPermission(user, "admin.associations.write");
    const regionScope = regionScopeOrThrow(user);
    const { id } = await context.params;

    const association = await getAssociationById(id, regionScope);
    if (!association) throw AppError.notFound("Association");

    const body = await request.json();
    const result = await addMembership({
      ...body,
      associationId: id,
    });
    if (!result.success) {
      throw AppError.validation(result.error, result.issues);
    }
    return ok({ membership: result.membership }, { status: 201 });
  }
);

export const PATCH = withApiHandler(
  async (request: NextRequest, context: Ctx) => {
    const user = await requireServerRole(ALLOWED);
    assertPermission(user, "admin.associations.write");
    const regionScope = regionScopeOrThrow(user);
    const { id } = await context.params;

    const association = await getAssociationById(id, regionScope);
    if (!association) throw AppError.notFound("Association");

    const body = await request.json();
    const result = await updateMembershipStatus(body);
    if (!result.success) {
      throw AppError.validation(result.error, result.issues);
    }

    // Ensure membership belongs to this association
    if (result.membership.associationId !== id) {
      throw AppError.forbidden("Membership does not belong to this association");
    }

    return ok({ membership: result.membership });
  }
);
