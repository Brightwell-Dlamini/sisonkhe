/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * GET  /api/staff   — list all staff (super-admin only)
 * POST /api/staff   — create a new staff member (super-admin only)
 *
 * On create:
 *   - creates the auth user with app_metadata.role (read by edge middleware)
 *   - inserts the staff row
 *   - audits the action
 *   - rolls back the auth user if the staff row fails
 */

import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { requireServerRole } from "@/lib/auth/session";
import { createStaffSchema } from "@/lib/staff/validation";
import { listStaff } from "@/lib/staff/queries";
import { writeAudit } from "@/lib/domain/audit";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function statusFor(message: string): number {
  if (message === "UNAUTHENTICATED") return 401;
  if (message === "FORBIDDEN") return 403;
  return 500;
}

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
    console.error("[api/staff] GET error:", err);
    return NextResponse.json({ error: message }, { status: statusFor(message) });
  }
}

// ---------------------------------------------------------------------------
// POST — create
// ---------------------------------------------------------------------------

export async function POST(request: NextRequest) {
  let createdAuthUserId: string | null = null;

  try {
    const session = await requireServerRole(["super-admin"]);

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

    // Email uniqueness (soft check — DB unique index is the real guard)
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

    // Create auth user WITH app_metadata.role — read by middleware.
    const { data: created, error: createErr } =
      await admin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: {
          full_name: fullName,
          role,
        },
        app_metadata: {
          role, // <-- the JWT claim the edge reads
        },
      });

    if (createErr || !created.user) {
      const msg = createErr?.message ?? "Failed to create auth user";
      const status = msg.toLowerCase().includes("already") ? 409 : 500;
      console.error("[api/staff] createUser error:", createErr);
      return NextResponse.json({ error: msg }, { status });
    }

    createdAuthUserId = created.user.id;

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
      await admin.auth.admin.deleteUser(createdAuthUserId);
      createdAuthUserId = null;

      console.error("[api/staff] insert error:", insertErr);
      return NextResponse.json(
        { error: `Failed to create staff record: ${insertErr?.message}` },
        { status: 500 }
      );
    }

    await writeAudit(admin, {
      action: "staff.create",
      actorId: session.staffId ?? session.authUserId,
      actorRole: "super-admin",
      entityType: "staff",
      entityId: staffRow.id,
      summary: `Created ${role} ${fullName}`,
    });

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
      credentials: { email, password },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";

    if (createdAuthUserId) {
      try {
        const admin = createSupabaseAdminClient();
        await admin.auth.admin.deleteUser(createdAuthUserId);
      } catch (rollbackErr) {
        console.error("[api/staff] rollback failed:", rollbackErr);
      }
    }

    console.error("[api/staff] POST error:", err);
    return NextResponse.json({ error: message }, { status: statusFor(message) });
  }
}
