/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { requireServerRole } from "@/lib/auth/session";
import { generateTempPassword } from "@/lib/operators/generators";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const ALLOWED_ROLES = ["super-admin", "admin", "fleet-manager"] as const;

interface Params {
  params: Promise<{ id: string }>;
}

export async function POST(_: NextRequest, { params }: Params) {
  try {
    await requireServerRole([...ALLOWED_ROLES]);
    const { id } = await params;

    const admin = createSupabaseAdminClient();

    const { data: opRow, error: fetchErr } = await admin
      .from("fleet_operators")
      .select("auth_user_id, name")
      .eq("id", id)
      .maybeSingle();

    if (fetchErr || !opRow?.auth_user_id) {
      return NextResponse.json(
        { error: "Operator not found or has no login account" },
        { status: 404 }
      );
    }

    const newPassword = generateTempPassword();

    const { error: updateErr } = await admin.auth.admin.updateUserById(
      opRow.auth_user_id,
      { password: newPassword }
    );

    if (updateErr) {
      return NextResponse.json(
        { error: `Password reset failed: ${updateErr.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      tempPassword: newPassword,
      name: opRow.name,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    const status =
      message === "UNAUTHENTICATED" ? 401 :
      message === "FORBIDDEN" ? 403 : 500;
    console.error("[api/operators/reset-password] error:", err);
    return NextResponse.json({ error: message }, { status });
  }
}
