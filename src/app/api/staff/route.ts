/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * GET  /api/staff — list (super-admin)
 * POST /api/staff — create staff + auth
 */

import type { NextRequest } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { requireServerRole } from "@/lib/auth/session";
import { createStaffSchema } from "@/lib/staff/validation";
import { listStaff } from "@/lib/staff/queries";
import { writeAudit } from "@/lib/domain/audit";
import { provisionAuthUser } from "@/lib/auth/provision";
import { AppError } from "@/lib/api/errors";
import { ok, withApiHandler } from "@/lib/api/response";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export const GET = withApiHandler(async () => {
  await requireServerRole(["super-admin"]);
  const staff = await listStaff();
  return ok({ staff });
});

export const POST = withApiHandler(async (request: NextRequest) => {
  const session = await requireServerRole(["super-admin"]);

  const body = await request.json();
  const parsed = createStaffSchema.safeParse(body);
  if (!parsed.success) {
    throw AppError.validation("Validation failed", {
      issues: parsed.error.flatten().fieldErrors,
    });
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
    throw AppError.conflict("A staff member with that email already exists.");
  }

  const staffId = `staff-${crypto.randomUUID()}`;

  const { authUserId } = await provisionAuthUser({
    email,
    password,
    role,
    userMetadata: { full_name: fullName },
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

  return ok(
    {
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
    },
    { status: 201 }
  );
});
