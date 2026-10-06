/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * GET  /api/operators   — list operators (admin / fleet-manager / super-admin)
 * POST /api/operators   — create operator + master card (same roles)
 *
 * Operators are provisioned in one step: auth user + fleet_operators row,
 * via provisionAuthUser. Master card issuance is a follow-up and is
 * non-fatal if it fails (the operator is usable without a card; a super-admin
 * can issue one later).
 */

import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { requireServerRole } from "@/lib/auth/session";
import { regionScopeOrThrow } from "@/lib/auth/permissions";
import { createOperatorSchema } from "@/lib/operators/validation";
import { listOperators } from "@/lib/operators/queries";
import {
  generateCvvHash,
  generateMasterCardNumber,
  generateOperatorId,
  generateTempPassword,
  generateUsername,
} from "@/lib/operators/generators";
import { claimUsername, isUsernameTaken } from "@/lib/domain/usernames";
import { provisionAuthUser } from "@/lib/auth/provision";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const ALLOWED_ROLES = ["super-admin", "admin", "fleet-manager"] as const;

export async function GET() {
  try {
    const user = await requireServerRole([...ALLOWED_ROLES]);
    const regionScope = regionScopeOrThrow(user);
    const operators = await listOperators(regionScope);
    return NextResponse.json({ operators, regionScope });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    const status =
      message === "UNAUTHENTICATED"
        ? 401
        : message === "FORBIDDEN" || message === "REGION_REQUIRED"
          ? 403
          : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireServerRole([...ALLOWED_ROLES]);
    const regionScope = regionScopeOrThrow(user);

    const body = await request.json();
    const parsed = createOperatorSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Validation failed",
          issues: parsed.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const input = parsed.data;
    const admin = createSupabaseAdminClient();

    const { data: emailClash } = await admin
      .from("fleet_operators")
      .select("id")
      .eq("email", input.email)
      .maybeSingle();

    if (emailClash) {
      return NextResponse.json(
        { error: "An operator with that email already exists." },
        { status: 409 }
      );
    }

    if (input.nationalId) {
      const { data: idClash } = await admin
        .from("fleet_operators")
        .select("id")
        .eq("national_id", input.nationalId)
        .maybeSingle();

      if (idClash) {
        return NextResponse.json(
          { error: "An operator with that National ID already exists." },
          { status: 409 }
        );
      }
    }

    const operatorId = generateOperatorId();
    const username = await generateUniqueUsername(input.name);

    if (await isUsernameTaken(admin, username)) {
      return NextResponse.json(
        { error: "Username collision — retry." },
        { status: 409 }
      );
    }

    const tempPassword = generateTempPassword();
    const region =
      (input as { region?: string }).region || regionScope || null;

    const { authUserId } = await provisionAuthUser({
      email: input.email,
      password: tempPassword,
      role: "operator",
      userMetadata: {
        username,
        full_name: input.name,
        operator_id: operatorId,
        must_change_password: true,
      },
      insertRoleRow: async (createdAuthUserId) => {
        const insertPayload: Record<string, unknown> = {
          id: operatorId,
          name: input.name,
          company_name: input.companyName,
          phone: input.phone,
          email: input.email,
          national_id: input.nationalId || null,
          tax_number: input.taxNumber || null,
          association: input.association || null,
          avatar_url: input.avatarUrl || null,
          bank_account_ref: input.bankAccountRef || null,
          operator_license_number: input.operatorLicenseNumber || null,
          auth_user_id: createdAuthUserId,
        };
        if (region) insertPayload.region = region;

        const { error: insertErr } = await admin
          .from("fleet_operators")
          .insert(insertPayload);

        if (insertErr) {
          throw new Error(`operator insert failed: ${insertErr.message}`);
        }
      },
    });

    await claimUsername(admin, username, authUserId, "operator");

    // Master card: non-fatal. If it fails, the operator still exists and can
    // be issued a card later by a super-admin.
    const cardId = `MCARD-${operatorId.toUpperCase()}`;
    const cardNumber = generateMasterCardNumber(operatorId);
    const cvvHash = generateCvvHash(operatorId);
    const initialBalance = 0;

    const { error: cardErr } = await admin.from("operator_master_cards").insert({
      id: cardId,
      card_number: cardNumber,
      cvv_hash: cvvHash,
      expiry_date: "12/29",
      operator_id: operatorId,
      operator_name: input.name,
      company_name: input.companyName,
      balance_szl: initialBalance,
      status: "Active",
      card_tier: "Enterprise Master Concession",
      daily_transfer_limit_szl: 25000.0,
    });

    if (cardErr) {
      console.warn("[api/operators] master card issue failed:", cardErr);
    }

    return NextResponse.json({
      success: true,
      operatorId,
      credentials: {
        username,
        password: tempPassword,
        email: input.email,
        mustChangePassword: true,
      },
      masterCard: {
        cardNumber,
        initialBalance,
        issued: !cardErr,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    const status =
      message === "UNAUTHENTICATED"
        ? 401
        : message === "FORBIDDEN" || message === "REGION_REQUIRED"
          ? 403
          : message.toLowerCase().includes("already")
            ? 409
            : 500;

    console.error("[api/operators] POST error:", err);
    return NextResponse.json({ error: message }, { status });
  }
}

async function generateUniqueUsername(name: string): Promise<string> {
  const admin = createSupabaseAdminClient();
  const taken = new Set<string>();
  try {
    const { data } = await admin.from("usernames").select("username").limit(5000);
    for (const r of data ?? []) {
      if (r.username) taken.add(String(r.username).toLowerCase());
    }
  } catch {
    try {
      const { data } = await admin.auth.admin.listUsers({ perPage: 200 });
      for (const u of data?.users ?? []) {
        const uname = u.user_metadata?.username as string | undefined;
        if (uname) taken.add(uname.toLowerCase());
      }
    } catch {
      /* */
    }
  }
  return generateUsername(name, taken).toLowerCase();
}
