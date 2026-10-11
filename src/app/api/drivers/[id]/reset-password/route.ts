/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * POST — re-issue password via one-time claim link (preferred).
 */

import type { NextRequest } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { requireServerRole } from "@/lib/auth/session";
import { generateTempPassword } from "@/lib/drivers/generators";
import { reissuePasswordViaClaim } from "@/lib/auth/claimLink";
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

  const { data: driverRow, error: fetchErr } = await admin
    .from("drivers")
    .select("auth_user_id, full_name")
    .eq("id", id)
    .maybeSingle();

  if (fetchErr || !driverRow?.auth_user_id) {
    throw AppError.notFound("Driver login account");
  }

  let claimUrl: string | null = null;
  let expiresAt: string | null = null;
  let username: string | null = null;
  let tempPassword: string | undefined;

  try {
    const claim = await reissuePasswordViaClaim({
      authUserId: driverRow.auth_user_id,
      role: "driver",
      entityType: "driver",
      entityId: id,
      createdBy: session.authUserId,
    });
    claimUrl = claim.claimUrl;
    expiresAt = claim.expiresAt;
    username = claim.username;
  } catch (err) {
    console.error("[driver/reset-password] claim failed, password fallback:", err);
    tempPassword = generateTempPassword();
    const { error: updateErr } = await admin.auth.admin.updateUserById(
      driverRow.auth_user_id,
      {
        password: tempPassword,
        user_metadata: { must_change_password: true },
      }
    );
    if (updateErr) {
      throw AppError.internal(`Password reset failed: ${updateErr.message}`);
    }
  }

  await writeAudit(admin, {
    action: "driver.reset_password",
    actorId: session.authUserId,
    actorRole: session.role,
    actorName: session.fullName,
    entityType: "driver",
    entityId: id,
    summary: `Reset password for ${driverRow.full_name}`,
  });

  return ok({
    success: true,
    fullName: driverRow.full_name,
    username,
    claimUrl,
    expiresAt,
    /** Only present if claim table missing */
    tempPassword,
  });
});
