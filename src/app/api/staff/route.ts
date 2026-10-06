/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * GET  /api/staff   — list all staff (super-admin only)
 * POST /api/staff   — create a new staff member (super-admin only)
 *
 * Staff are never pre-registered. Every staff member is provisioned in
 * one step: auth user + staff row. Both app_metadata.role and
 * user_metadata.role are set by provisionAuthUser.
 */

import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { requireServerRole } from "@/lib/auth/session";
import { createStaffSchema } from "@/lib/staff/validation";
import { listStaff } from "@/lib/staff/queries";
import { writeAudit } from "@/lib/domain/audit";
import { provisionAuthUser } from "@/lib/auth/provision";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function statusFor(message: string): number {
  if (message === "UNAUTHENTICATED") return 401;
  if (message === "FORBIDDEN") return 403;
  if (message.toLowerCase().includes("already")) return 409;
  return 500;
}

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

export async function POST(request: NextRequest) {
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

    const staffId = `staff-${crypto.randomUUID()}`;

    const { authUserId } = await provisionAuthUser({
      email,
      password,
      role,
      userMetadata: {
        full_name: fullName,
      },
      insertRoleRow: async (createdAuthUserId) => {
        const { error: insertErr } = await admin.from("staff").insert({
          id: staffId,
          auth_user_id: createdAuthUserId,
          full_name: fullName,
          email,
          phone: phone || null,
          role,
          region: region || null,
          terminal_id: terminalId || null,
          is_active: true,
        });

        if (insertErr) {
          throw new Error(`staff insert failed: ${insertErr.message}`);
        }
      },
    });

    const { data: staffRow } = await admin
      .from("staff")
      .select(
        "id, auth_user_id, full_name, email, phone, role, region, terminal_id, is_active, last_login_at, created_at, updated_at"
      )
      .eq("auth_user_id", authUserId)
      .single();

    await writeAudit(admin, {
      action: "staff.create",
      actorId: session.staffId ?? session.authUserId,
      actorRole: "super-admin",
      entityType: "staff",
      entityId: staffId,
      summary: `Created ${role} ${fullName}`,
    });

    return NextResponse.json({
      success: true,
      staff: staffRow
        ? {
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
          }
        : { id: staffId, authUserId, email },
      credentials: { email, password },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[api/staff] POST error:", err);
    return NextResponse.json({ error: message }, { status: statusFor(message) });
  }
}
