/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * POST /api/staff/[id]/reset-password
 * Generates a new temp password and updates the auth user.
 * Returns the temp password to the caller (super-admin only).
 */

import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { requireServerRole } from "@/lib/auth/session";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

interface Params {
  params: Promise<{ id: string }>;
}

function generateTempPassword(): string {
  // 4 words-style but compact: 3 letters + 4 digits + 3 letters + 4 digits
  const letters = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  const digits = "23456789";
  const pick = (chars: string, n: number) =>
    Array.from({ length: n }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
  return `${pick(letters, 3)}${pick(digits, 4)}${pick(letters, 3)}${pick(digits, 4)}`;
}

export async function POST(_: NextRequest, { params }: Params) {
  try {
    await requireServerRole(["super-admin"]);
    const { id } = await params;

    const admin = createSupabaseAdminClient();

    const { data: staffRow, error: fetchErr } = await admin
      .from("staff")
      .select("auth_user_id, full_name")
      .eq("id", id)
      .maybeSingle();

    if (fetchErr || !staffRow) {
      return NextResponse.json({ error: "Staff not found" }, { status: 404 });
    }

    const newPassword = generateTempPassword();

    const { error: updateErr } = await admin.auth.admin.updateUserById(
      staffRow.auth_user_id,
      { password: newPassword }
    );

    if (updateErr) {
      console.error("[api/staff/reset-password] update error:", updateErr);
      return NextResponse.json(
        { error: `Password reset failed: ${updateErr.message}` },
        { status: 500 }
      );
    }

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
