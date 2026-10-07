/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { NextRequest } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { requireServerRole } from "@/lib/auth/session";
import { writeAudit } from "@/lib/domain/audit";
import { AppError } from "@/lib/api/errors";
import { ok, withApiHandler } from "@/lib/api/response";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type Ctx = { params: Promise<{ id: string }> };

const LETTERS = "ABCDEFGHJKLMNPQRSTUVWXYZ";
const DIGITS = "23456789";

function generateTempPassword(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  const pick = (chars: string, i: number) => chars[bytes[i] % chars.length];
  const l1 =
    pick(LETTERS, 0) + pick(LETTERS, 1) + pick(LETTERS, 2) + pick(LETTERS, 3);
  const d1 = pick(DIGITS, 4) + pick(DIGITS, 5) + pick(DIGITS, 6) + pick(DIGITS, 7);
  const l2 =
    pick(LETTERS, 8) + pick(LETTERS, 9) + pick(LETTERS, 10) + pick(LETTERS, 11);
  const d2 =
    pick(DIGITS, 12) + pick(DIGITS, 13) + pick(DIGITS, 14) + pick(DIGITS, 15);
  return `${l1}-${d1}-${l2}-${d2}`;
}

export const POST = withApiHandler(async (_: NextRequest, ctx: Ctx) => {
  const session = await requireServerRole(["super-admin"]);
  const { id } = await ctx.params;

  const admin = createSupabaseAdminClient();

  const { data: staffRow, error: fetchErr } = await admin
    .from("staff")
    .select("auth_user_id, full_name, email")
    .eq("id", id)
    .maybeSingle();

  if (fetchErr || !staffRow) throw AppError.notFound("Staff");

  const newPassword = generateTempPassword();

  const { error: updateErr } = await admin.auth.admin.updateUserById(
    staffRow.auth_user_id,
    {
      password: newPassword,
      user_metadata: { must_change_password: true },
    }
  );

  if (updateErr) {
    throw AppError.internal(`Password reset failed: ${updateErr.message}`);
  }

  await writeAudit(admin, {
    action: "staff.reset_password",
    actorId: session.staffId ?? session.authUserId,
    actorRole: "super-admin",
    entityType: "staff",
    entityId: id,
    summary: `Reset password for ${staffRow.full_name}`,
  });

  return ok({
    success: true,
    tempPassword: newPassword,
    fullName: staffRow.full_name,
  });
});
