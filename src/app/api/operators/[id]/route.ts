/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { NextRequest } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { requireServerRole } from "@/lib/auth/session";
import { updateOperatorSchema } from "@/lib/operators/validation";
import { getOperatorById } from "@/lib/operators/queries";
import { writeAudit } from "@/lib/domain/audit";
import { AppError } from "@/lib/api/errors";
import { ok, withApiHandler } from "@/lib/api/response";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const ALLOWED_ROLES = ["super-admin", "admin", "fleet-manager"] as const;

type Ctx = { params: Promise<{ id: string }> };

export const GET = withApiHandler(async (_: NextRequest, ctx: Ctx) => {
  await requireServerRole([...ALLOWED_ROLES]);
  const { id } = await ctx.params;
  const operator = await getOperatorById(id);
  if (!operator) throw AppError.notFound("Operator");
  return ok({ operator });
});

export const PATCH = withApiHandler(async (request: NextRequest, ctx: Ctx) => {
  const session = await requireServerRole([...ALLOWED_ROLES]);
  const { id } = await ctx.params;

  const body = await request.json();
  const parsed = updateOperatorSchema.safeParse(body);
  if (!parsed.success) {
    throw AppError.validation("Validation failed", {
      issues: parsed.error.flatten().fieldErrors,
    });
  }

  const admin = createSupabaseAdminClient();
  const input = parsed.data;

  const patch: Record<string, unknown> = {};
  if (input.name !== undefined) patch.name = input.name;
  if (input.companyName !== undefined) patch.company_name = input.companyName;
  if (input.phone !== undefined) patch.phone = input.phone;
  if (input.email !== undefined) patch.email = input.email;
  if (input.nationalId !== undefined)
    patch.national_id = input.nationalId || null;
  if (input.taxNumber !== undefined) patch.tax_number = input.taxNumber || null;
  if (input.association !== undefined)
    patch.association = input.association || null;
  if (input.bankAccountRef !== undefined)
    patch.bank_account_ref = input.bankAccountRef || null;
  if (input.operatorLicenseNumber !== undefined)
    patch.operator_license_number = input.operatorLicenseNumber || null;
  if (input.avatarUrl !== undefined) patch.avatar_url = input.avatarUrl || null;

  if (Object.keys(patch).length === 0) {
    throw AppError.validation("No fields to update");
  }

  const { data: current } = await admin
    .from("fleet_operators")
    .select("name, company_name, auth_user_id")
    .eq("id", id)
    .maybeSingle();

  if (!current) throw AppError.notFound("Operator");

  const { error: updateErr } = await admin
    .from("fleet_operators")
    .update(patch)
    .eq("id", id);

  if (updateErr) {
    throw AppError.internal(`Update failed: ${updateErr.message}`);
  }

  if (input.name !== undefined || input.companyName !== undefined) {
    const cardPatch: Record<string, unknown> = {};
    if (input.name !== undefined) cardPatch.operator_name = input.name;
    if (input.companyName !== undefined)
      cardPatch.company_name = input.companyName;
    if (Object.keys(cardPatch).length > 0) {
      await admin
        .from("operator_master_cards")
        .update(cardPatch)
        .eq("operator_id", id);
    }
  }

  if (input.name !== undefined && current.auth_user_id) {
    try {
      const { data: existing } = await admin.auth.admin.getUserById(
        current.auth_user_id
      );
      await admin.auth.admin.updateUserById(current.auth_user_id, {
        user_metadata: {
          ...(existing?.user?.user_metadata ?? {}),
          full_name: input.name,
        },
      });
    } catch (metaErr) {
      console.warn("[api/operators/[id]] metadata sync failed:", metaErr);
    }
  }

  await writeAudit(admin, {
    action: "operator.update",
    actorId: session.authUserId,
    actorRole: session.role,
    actorName: session.fullName,
    entityType: "operator",
    entityId: id,
    summary: `Updated operator ${id}`,
    after: patch,
  });

  return ok({ success: true });
});

export const DELETE = withApiHandler(async (_: NextRequest, ctx: Ctx) => {
  const session = await requireServerRole([...ALLOWED_ROLES]);
  const { id } = await ctx.params;
  const admin = createSupabaseAdminClient();

  await admin
    .from("operator_master_cards")
    .update({ status: "Frozen" })
    .eq("operator_id", id);

  await admin
    .from("vehicles")
    .update({ owner_operator_id: null })
    .eq("owner_operator_id", id);

  const { data: opRow } = await admin
    .from("fleet_operators")
    .select("auth_user_id, name")
    .eq("id", id)
    .maybeSingle();

  if (opRow?.auth_user_id) {
    try {
      await admin.auth.admin.updateUserById(opRow.auth_user_id, {
        ban_duration: "876000h",
      });
    } catch (banErr) {
      console.warn("[api/operators/[id]] ban failed:", banErr);
    }
  }

  await writeAudit(admin, {
    action: "operator.update",
    actorId: session.authUserId,
    actorRole: session.role,
    actorName: session.fullName,
    entityType: "operator",
    entityId: id,
    summary: `Deactivated operator ${opRow?.name ?? id}`,
  });

  return ok({ success: true });
});
