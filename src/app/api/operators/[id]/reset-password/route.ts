/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { NextRequest } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { requireServerRole } from "@/lib/auth/session";
import { generateTempPassword } from "@/lib/operators/generators";
import { writeAudit } from "@/lib/domain/audit";
import { AppError } from "@/lib/api/errors";
import { ok, withApiHandler } from "@/lib/api/response";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const ALLOWED_ROLES = ["super-admin", "admin", "fleet-manager"] as const;

type Ctx = { params: Promise<{ id: string }> };

export const POST = withApiHandler(async (_: NextRequest, ctx: Ctx) => {
  const session = await requireServerRole([...ALLOWED_ROLES]);
  const { id } = await ctx.params;

  const admin = createSupabaseAdminClient();

  const { data: opRow, error: fetchErr } = await admin
    .from("fleet_operators")
    .select("auth_user_id, name")
    .eq("id", id)
    .maybeSingle();

  if (fetchErr || !opRow?.auth_user_id) {
    throw AppError.notFound("Operator login account");
  }

  const newPassword = generateTempPassword();

  const { error: updateErr } = await admin.auth.admin.updateUserById(
    opRow.auth_user_id,
    { password: newPassword }
  );

  if (updateErr) {
    throw AppError.internal(`Password reset failed: ${updateErr.message}`);
  }

  await writeAudit(admin, {
    action: "staff.reset_password",
    actorId: session.authUserId,
    actorRole: session.role,
    actorName: session.fullName,
    entityType: "operator",
    entityId: id,
    summary: `Reset password for operator ${opRow.name}`,
  });

  return ok({
    success: true,
    tempPassword: newPassword,
    name: opRow.name,
  });
});
