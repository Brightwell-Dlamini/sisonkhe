/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * GET    /api/staff/[id]     — fetch one staff member
 * PATCH  /api/staff/[id]     — update staff member
 * DELETE /api/staff/[id]     — deactivate (soft delete)
 */

import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { requireServerRole } from "@/lib/auth/session";
import { updateStaffSchema } from "@/lib/staff/validation";
import { getStaffById } from "@/lib/staff/queries";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

interface Params {
  params: Promise<{ id: string }>;
}

function errorStatus(message: string): number {
  if (message === "UNAUTHENTICATED") return 401;
  if (message === "FORBIDDEN") return 403;
  if (message.includes("not found")) return 404;
  return 500;
}

// ---------------------------------------------------------------------------
// GET — one
// ---------------------------------------------------------------------------

export async function GET(_: NextRequest, { params }: Params) {
  try {
    await requireServerRole(["super-admin"]);
    const { id } = await params;
    const staff = await getStaffById(id);

    if (!staff) {
      return NextResponse.json({ error: "Staff not found" }, { status: 404 });
    }

    return NextResponse.json({ staff });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[api/staff/[id]] GET error:", err);
    return NextResponse.json({ error: message }, { status: errorStatus(message) });
  }
}

// ---------------------------------------------------------------------------
// PATCH — update
// ---------------------------------------------------------------------------

export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    const session = await requireServerRole(["super-admin"]);
    const { id } = await params;

    const body = await request.json();
    const parsed = updateStaffSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Validation failed",
          issues: parsed.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    // Prevent super-admin from demoting or deactivating themselves
    if (id === session.staffId) {
      const tryingToDeactivate = parsed.data.isActive === false;
      const tryingToChangeRole =
        parsed.data.role !== undefined && parsed.data.role !== session.role;

      if (tryingToDeactivate || tryingToChangeRole) {
        return NextResponse.json(
          {
            error:
              "You cannot change your own role or deactivate your own account.",
          },
          { status: 400 }
        );
      }
    }

    const admin = createSupabaseAdminClient();

    const patch: Record<string, unknown> = {};
    if (parsed.data.fullName !== undefined) patch.full_name = parsed.data.fullName;
    if (parsed.data.phone !== undefined)
      patch.phone = parsed.data.phone || null;
    if (parsed.data.role !== undefined) patch.role = parsed.data.role;
    if (parsed.data.region !== undefined)
      patch.region = parsed.data.region || null;
    if (parsed.data.terminalId !== undefined)
      patch.terminal_id = parsed.data.terminalId || null;
    if (parsed.data.isActive !== undefined) patch.is_active = parsed.data.isActive;

    if (Object.keys(patch).length === 0) {
      return NextResponse.json(
        { error: "No fields to update" },
        { status: 400 }
      );
    }

    const { data, error } = await admin
      .from("staff")
      .update(patch)
      .eq("id", id)
      .select(
        "id, auth_user_id, full_name, email, phone, role, region, terminal_id, is_active, last_login_at, created_at, updated_at"
      )
      .maybeSingle();

    if (error) {
      console.error("[api/staff/[id]] update error:", error);
      return NextResponse.json(
        { error: `Update failed: ${error.message}` },
        { status: 500 }
      );
    }

    if (!data) {
      return NextResponse.json({ error: "Staff not found" }, { status: 404 });
    }

    // Sync metadata on auth user (keeps role in JWT fresh on next refresh)
    if (parsed.data.role !== undefined || parsed.data.fullName !== undefined) {
      try {
        const { data: existing } = await admin.auth.admin.getUserById(
          data.auth_user_id
        );
        await admin.auth.admin.updateUserById(data.auth_user_id, {
          user_metadata: {
            ...(existing?.user?.user_metadata ?? {}),
            ...(parsed.data.role !== undefined ? { role: parsed.data.role } : {}),
            ...(parsed.data.fullName !== undefined
              ? { full_name: parsed.data.fullName }
              : {}),
          },
        });
      } catch (metaErr) {
        console.warn("[api/staff/[id]] metadata sync failed:", metaErr);
        // Non-fatal — staff row is updated
      }
    }

    return NextResponse.json({
      success: true,
      staff: {
        id: data.id,
        authUserId: data.auth_user_id,
        fullName: data.full_name,
        email: data.email,
        phone: data.phone,
        role: data.role,
        region: data.region,
        terminalId: data.terminal_id,
        isActive: data.is_active,
        lastLoginAt: data.last_login_at,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[api/staff/[id]] PATCH error:", err);
    return NextResponse.json({ error: message }, { status: errorStatus(message) });
  }
}

// ---------------------------------------------------------------------------
// DELETE — deactivate (soft)
// ---------------------------------------------------------------------------

export async function DELETE(_: NextRequest, { params }: Params) {
  try {
    const session = await requireServerRole(["super-admin"]);
    const { id } = await params;

    if (id === session.staffId) {
      return NextResponse.json(
        { error: "You cannot deactivate your own account." },
        { status: 400 }
      );
    }

    const admin = createSupabaseAdminClient();

    const { error } = await admin
      .from("staff")
      .update({ is_active: false })
      .eq("id", id);

    if (error) {
      console.error("[api/staff/[id]] deactivate error:", error);
      return NextResponse.json(
        { error: `Deactivate failed: ${error.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[api/staff/[id]] DELETE error:", err);
    return NextResponse.json({ error: message }, { status: errorStatus(message) });
  }
}
