/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { NextRequest } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { requireServerRole } from "@/lib/auth/session";
import { updateStaffSchema } from "@/lib/staff/validation";
import { getStaffById } from "@/lib/staff/queries";
import { writeAudit } from "@/lib/domain/audit";
import { AppError } from "@/lib/api/errors";
import { ok, withApiHandler } from "@/lib/api/response";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type Ctx = { params: Promise<{ id: string }> };

export const GET = withApiHandler(async (_: NextRequest, ctx: Ctx) => {
  await requireServerRole(["super-admin"]);
  const { id } = await ctx.params;
  const staff = await getStaffById(id);
  if (!staff) throw AppError.notFound("Staff");
  return ok({ staff });
});

export const PATCH = withApiHandler(async (request: NextRequest, ctx: Ctx) => {
  const session = await requireServerRole(["super-admin"]);
  const { id } = await ctx.params;

  const body = await request.json();
  const parsed = updateStaffSchema.safeParse(body);
  if (!parsed.success) {
    throw AppError.validation("Validation failed", {
      issues: parsed.error.flatten().fieldErrors,
    });
  }

  if (id === session.staffId) {
    const tryingToDeactivate = parsed.data.isActive === false;
    const tryingToChangeRole =
      parsed.data.role !== undefined && parsed.data.role !== session.role;

    if (tryingToDeactivate || tryingToChangeRole) {
      throw AppError.validation(
        "You cannot change your own role or deactivate your own account."
      );
    }
  }

  const admin = createSupabaseAdminClient();

  const patch: Record<string, unknown> = {};
  if (parsed.data.fullName !== undefined)
    patch.full_name = parsed.data.fullName;
  if (parsed.data.phone !== undefined) patch.phone = parsed.data.phone || null;
  if (parsed.data.role !== undefined) patch.role = parsed.data.role;
  if (parsed.data.region !== undefined)
    patch.region = parsed.data.region || null;
  if (parsed.data.terminalId !== undefined)
    patch.terminal_id = parsed.data.terminalId || null;
  if (parsed.data.isActive !== undefined)
    patch.is_active = parsed.data.isActive;

  if (Object.keys(patch).length === 0) {
    throw AppError.validation("No fields to update");
  }

  const { data, error } = await admin
    .from("staff")
    .update(patch)
    .eq("id", id)
    .select(
      "id, auth_user_id, full_name, email, phone, role, region, terminal_id, is_active, last_login_at, created_at, updated_at"
    )
    .maybeSingle();

  if (error) {
    throw AppError.internal(`Update failed: ${error.message}`);
  }
  if (!data) throw AppError.notFound("Staff");

  if (
    parsed.data.role !== undefined ||
    parsed.data.fullName !== undefined ||
    parsed.data.isActive !== undefined
  ) {
    let priorRole: string | undefined;
    try {
      const { data: existing } = await admin.auth.admin.getUserById(
        data.auth_user_id
      );
      priorRole = existing?.user?.app_metadata?.role as string | undefined;

      await admin.auth.admin.updateUserById(data.auth_user_id, {
        user_metadata: {
          ...(existing?.user?.user_metadata ?? {}),
          ...(parsed.data.role !== undefined ? { role: parsed.data.role } : {}),
          ...(parsed.data.fullName !== undefined
            ? { full_name: parsed.data.fullName }
            : {}),
        },
        app_metadata: {
          ...(existing?.user?.app_metadata ?? {}),
          ...(parsed.data.role !== undefined ? { role: parsed.data.role } : {}),
        },
      });
    } catch (metaErr) {
      console.error("[api/staff/[id]] metadata sync failed:", metaErr);
      if (priorRole !== undefined) {
        await admin.from("staff").update({ role: priorRole }).eq("id", id);
      }
      throw AppError.internal(
        "Role updated in DB but auth metadata sync failed. Reverted."
      );
    }
  }

  await writeAudit(admin, {
    action: "staff.update",
    actorId: session.staffId ?? session.authUserId,
    actorRole: "super-admin",
    entityType: "staff",
    entityId: id,
    summary: `Updated staff ${data.full_name}`,
    meta: { fields: Object.keys(patch) },
  });

  return ok({
    success: true,
    staff: {
      id: data.id,
      authUserId: data.auth_user_id,
      fullName: data.full_name,
      email: data.email,
      phone: data.phone,
      role: data.role,
      region: data.region,
      terminalId: data.terminal_id,
      isActive: data.is_active,
      lastLoginAt: data.last_login_at,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    },
  });
});

export const DELETE = withApiHandler(async (_: NextRequest, ctx: Ctx) => {
  const session = await requireServerRole(["super-admin"]);
  const { id } = await ctx.params;

  if (id === session.staffId) {
    throw AppError.validation("You cannot deactivate your own account.");
  }

  const admin = createSupabaseAdminClient();

  const { data: row, error: fetchErr } = await admin
    .from("staff")
    .select("auth_user_id, full_name")
    .eq("id", id)
    .maybeSingle();

  if (fetchErr || !row) throw AppError.notFound("Staff");

  const { error } = await admin
    .from("staff")
    .update({ is_active: false })
    .eq("id", id);

  if (error) {
    throw AppError.internal(`Deactivate failed: ${error.message}`);
  }

  try {
    const { data: existing } = await admin.auth.admin.getUserById(
      row.auth_user_id
    );
    await admin.auth.admin.updateUserById(row.auth_user_id, {
      app_metadata: {
        ...(existing?.user?.app_metadata ?? {}),
        role: null,
        deactivated: true,
      },
    });
  } catch (metaErr) {
    console.warn("[api/staff/[id]] deactivation metadata sync failed:", metaErr);
  }

  await writeAudit(admin, {
    action: "staff.deactivate",
    actorId: session.staffId ?? session.authUserId,
    actorRole: "super-admin",
    entityType: "staff",
    entityId: id,
    summary: `Deactivated staff ${row.full_name}`,
  });

  return ok({ success: true });
});
