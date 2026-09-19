/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * GET  /api/staff       — list all staff (super-admin only)
 * POST /api/staff       — create a new staff member (super-admin only)
 */

import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { requireServerRole } from "@/lib/auth/session";
import { createStaffSchema } from "@/lib/staff/validation";
import { listStaff } from "@/lib/staff/queries";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// ---------------------------------------------------------------------------
// GET — list
// ---------------------------------------------------------------------------

export async function GET() {
  try {
    await requireServerRole(["super-admin"]);
    const staff = await listStaff();
    return NextResponse.json({ staff });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    const status =
      message === "UNAUTHENTICATED" ? 401 :
      message === "FORBIDDEN" ? 403 : 500;
    console.error("[api/staff] GET error:", err);
    return NextResponse.json({ error: message }, { status });
  }
}

// ---------------------------------------------------------------------------
// POST — create
// ---------------------------------------------------------------------------

export async function POST(request: NextRequest) {
  let createdAuthUserId: string | null = null;

  try {
    await requireServerRole(["super-admin"]);

    const body = await request.json();
    const parsed = createStaffSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Validation failed",
          issues: parsed.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const { fullName, email, phone, role, region, terminalId, password } =
      parsed.data;

    const admin = createSupabaseAdminClient();

    // --- Check email uniqueness ---
    const { data: existing } = await admin
      .from("staff")
      .select("id")
      .eq("email", email)
      .maybeSingle();

    if (existing) {
      return NextResponse.json(
        { error: "A staff member with that email already exists." },
        { status: 409 }
      );
    }

    // --- Create auth user ---
    const { data: created, error: createErr } =
      await admin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: {
          full_name: fullName,
          role,
        },
      });

    if (createErr || !created.user) {
      // Surface duplicate email errors clearly
      const msg = createErr?.message ?? "Failed to create auth user";
      const status = msg.toLowerCase().includes("already") ? 409 : 500;
      console.error("[api/staff] createUser error:", createErr);
      return NextResponse.json({ error: msg }, { status });
    }

    createdAuthUserId = created.user.id;

    // --- Insert staff row ---
    const staffId = `staff-${crypto.randomUUID()}`;

    const { data: staffRow, error: insertErr } = await admin
      .from("staff")
      .insert({
        id: staffId,
        auth_user_id: createdAuthUserId,
        full_name: fullName,
        email,
        phone: phone || null,
        role,
        region: region || null,
        terminal_id: terminalId || null,
        is_active: true,
      })
      .select(
        "id, auth_user_id, full_name, email, phone, role, region, terminal_id, is_active, last_login_at, created_at, updated_at"
      )
      .single();

    if (insertErr || !staffRow) {
      // Rollback auth user
      await admin.auth.admin.deleteUser(createdAuthUserId);
      createdAuthUserId = null;

      console.error("[api/staff] insert error:", insertErr);
      return NextResponse.json(
        { error: `Failed to create staff record: ${insertErr?.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      staff: {
        id: staffRow.id,
        authUserId: staffRow.auth_user_id,
        fullName: staffRow.full_name,
        email: staffRow.email,
        phone: staffRow.phone,
        role: staffRow.role,
        region: staffRow.region,
        terminalId: staffRow.terminal_id,
        isActive: staffRow.is_active,
        lastLoginAt: staffRow.last_login_at,
        createdAt: staffRow.created_at,
        updatedAt: staffRow.updated_at,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    const status =
      message === "UNAUTHENTICATED" ? 401 :
      message === "FORBIDDEN" ? 403 : 500;

    // Rollback on catastrophic failure
    if (createdAuthUserId) {
      try {
        const admin = createSupabaseAdminClient();
        await admin.auth.admin.deleteUser(createdAuthUserId);
      } catch (rollbackErr) {
        console.error("[api/staff] rollback failed:", rollbackErr);
      }
    }

    console.error("[api/staff] POST error:", err);
    return NextResponse.json({ error: message }, { status });
  }
}
