/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { requireServerRole } from "@/lib/auth/session";
import { updateOperatorSchema } from "@/lib/operators/validation";
import { getOperatorById } from "@/lib/operators/queries";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const ALLOWED_ROLES = ["super-admin", "admin", "fleet-manager"] as const;

interface Params {
  params: Promise<{ id: string }>;
}

function errorStatus(message: string): number {
  if (message === "UNAUTHENTICATED") return 401;
  if (message === "FORBIDDEN") return 403;
  if (message.includes("not found")) return 404;
  return 500;
}

export async function GET(_: NextRequest, { params }: Params) {
  try {
    await requireServerRole([...ALLOWED_ROLES]);
    const { id } = await params;
    const operator = await getOperatorById(id);
    if (!operator) {
      return NextResponse.json({ error: "Operator not found" }, { status: 404 });
    }
    return NextResponse.json({ operator });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[api/operators/[id]] GET error:", err);
    return NextResponse.json(
      { error: message },
      { status: errorStatus(message) }
    );
  }
}

export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    await requireServerRole([...ALLOWED_ROLES]);
    const { id } = await params;

    const body = await request.json();
    const parsed = updateOperatorSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Validation failed",
          issues: parsed.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const admin = createSupabaseAdminClient();
    const input = parsed.data;

    const patch: Record<string, unknown> = {};
    if (input.name !== undefined) patch.name = input.name;
    if (input.companyName !== undefined) patch.company_name = input.companyName;
    if (input.phone !== undefined) patch.phone = input.phone;
    if (input.email !== undefined) patch.email = input.email;
    if (input.nationalId !== undefined)
      patch.national_id = input.nationalId || null;
    if (input.taxNumber !== undefined) patch.tax_number = input.taxNumber || null;
    if (input.association !== undefined)
      patch.association = input.association || null;
    if (input.bankAccountRef !== undefined)
      patch.bank_account_ref = input.bankAccountRef || null;
    if (input.operatorLicenseNumber !== undefined)
      patch.operator_license_number = input.operatorLicenseNumber || null;
    if (input.avatarUrl !== undefined)
      patch.avatar_url = input.avatarUrl || null;

    if (Object.keys(patch).length === 0) {
      return NextResponse.json(
        { error: "No fields to update" },
        { status: 400 }
      );
    }

    // Sync card display fields if name or company changed
    const { data: current } = await admin
      .from("fleet_operators")
      .select("name, company_name, auth_user_id")
      .eq("id", id)
      .maybeSingle();

    if (!current) {
      return NextResponse.json({ error: "Operator not found" }, { status: 404 });
    }

    const { error: updateErr } = await admin
      .from("fleet_operators")
      .update(patch)
      .eq("id", id);

    if (updateErr) {
      return NextResponse.json(
        { error: `Update failed: ${updateErr.message}` },
        { status: 500 }
      );
    }

    // Sync master card display
    if (input.name !== undefined || input.companyName !== undefined) {
      const cardPatch: Record<string, unknown> = {};
      if (input.name !== undefined) cardPatch.operator_name = input.name;
      if (input.companyName !== undefined) cardPatch.company_name = input.companyName;
      if (Object.keys(cardPatch).length > 0) {
        await admin
          .from("operator_master_cards")
          .update(cardPatch)
          .eq("operator_id", id);
      }
    }

    // Sync auth metadata (full_name)
    if (input.name !== undefined && current.auth_user_id) {
      try {
        const { data: existing } = await admin.auth.admin.getUserById(
          current.auth_user_id
        );
        await admin.auth.admin.updateUserById(current.auth_user_id, {
          user_metadata: {
            ...(existing?.user?.user_metadata ?? {}),
            full_name: input.name,
          },
        });
      } catch (metaErr) {
        console.warn("[api/operators/[id]] metadata sync failed:", metaErr);
      }
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[api/operators/[id]] PATCH error:", err);
    return NextResponse.json(
      { error: message },
      { status: errorStatus(message) }
    );
  }
}

export async function DELETE(_: NextRequest, { params }: Params) {
  try {
    await requireServerRole([...ALLOWED_ROLES]);
    const { id } = await params;

    const admin = createSupabaseAdminClient();

    // Freeze the master card
    await admin
      .from("operator_master_cards")
      .update({ status: "Frozen" })
      .eq("operator_id", id);

    // Unassign vehicles owned by this operator
    await admin
      .from("vehicles")
      .update({ owner_operator_id: null })
      .eq("owner_operator_id", id);

    // Deactivate auth user (can't be deleted cleanly without losing FK refs)
    const { data: opRow } = await admin
      .from("fleet_operators")
      .select("auth_user_id")
      .eq("id", id)
      .maybeSingle();

    if (opRow?.auth_user_id) {
      try {
        // Ban the user for ~100 years — this prevents login while keeping the row
        await admin.auth.admin.updateUserById(opRow.auth_user_id, {
          ban_duration: "876000h",
        });
      } catch (banErr) {
        console.warn("[api/operators/[id]] ban failed:", banErr);
      }
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[api/operators/[id]] DELETE error:", err);
    return NextResponse.json(
      { error: message },
      { status: errorStatus(message) }
    );
  }
}
