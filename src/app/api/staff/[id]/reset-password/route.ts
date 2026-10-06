/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * POST /api/staff/[id]/reset-password
 * Generates a new temp password and updates the auth user.
 * Returns the temp password once (super-admin only). Audited.
 */

import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { requireServerRole } from "@/lib/auth/session";
import { writeAudit } from "@/lib/domain/audit";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

interface Params {
  params: Promise<{ id: string }>;
}

const LETTERS = "ABCDEFGHJKLMNPQRSTUVWXYZ"; // no I, O
const DIGITS = "23456789"; // no 0, 1

/**
 * Cryptographically random temp password.
 * Format: LLLL-DDDD-LLLL-DDDD  (16 chars + separators)
 */
function generateTempPassword(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);

  const pick = (chars: string, i: number) =>
    chars[bytes[i] % chars.length];

  const l1 = pick(LETTERS, 0) + pick(LETTERS, 1) + pick(LETTERS, 2) + pick(LETTERS, 3);
  const d1 = pick(DIGITS, 4) + pick(DIGITS, 5) + pick(DIGITS, 6) + pick(DIGITS, 7);
  const l2 = pick(LETTERS, 8) + pick(LETTERS, 9) + pick(LETTERS, 10) + pick(LETTERS, 11);
  const d2 = pick(DIGITS, 12) + pick(DIGITS, 13) + pick(DIGITS, 14) + pick(DIGITS, 15);

  return `${l1}-${d1}-${l2}-${d2}`;
}

export async function POST(_: NextRequest, { params }: Params) {
  try {
    const session = await requireServerRole(["super-admin"]);
    const { id } = await params;

    const admin = createSupabaseAdminClient();

    const { data: staffRow, error: fetchErr } = await admin
      .from("staff")
      .select("auth_user_id, full_name, email")
      .eq("id", id)
      .maybeSingle();

    if (fetchErr || !staffRow) {
      return NextResponse.json({ error: "Staff not found" }, { status: 404 });
    }

    const newPassword = generateTempPassword();

    const { error: updateErr } = await admin.auth.admin.updateUserById(
      staffRow.auth_user_id,
      {
        password: newPassword,
        user_metadata: { must_change_password: true },
      }
    );

    if (updateErr) {
      console.error("[api/staff/reset-password] update error:", updateErr);
      return NextResponse.json(
        { error: `Password reset failed: ${updateErr.message}` },
        { status: 500 }
      );
    }

    await writeAudit(admin, {
      action: "staff.reset_password",
      actorId: session.staffId ?? session.authUserId,
      actorRole: "super-admin",
      entityType: "staff",
      entityId: id,
      summary: `Reset password for ${staffRow.full_name}`,
    });

    return NextResponse.json({
      success: true,
      tempPassword: newPassword,
      fullName: staffRow.full_name,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    const status =
      message === "UNAUTHENTICATED" ? 401 :
      message === "FORBIDDEN" ? 403 : 500;
    console.error("[api/staff/reset-password] error:", err);
    return NextResponse.json({ error: message }, { status });
  }
}
