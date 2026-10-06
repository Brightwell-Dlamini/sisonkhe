/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
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
import { nextReceiptNumber } from "@/lib/domain/serials";

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
  let createdAuthUserId: string | null = null;

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
    const tempPassword = generateTempPassword();

    const { data: created, error: createErr } =
      await admin.auth.admin.createUser({
        email: input.email,
        password: tempPassword,
        email_confirm: true,
        user_metadata: {
          username,
          full_name: input.name,
          role: "operator",
          operator_id: operatorId,
        },
      });

    if (createErr || !created.user) {
      const msg = createErr?.message ?? "Failed to create auth user";
      const status = msg.toLowerCase().includes("already") ? 409 : 500;
      return NextResponse.json({ error: msg }, { status });
    }

    createdAuthUserId = created.user.id;

    const region =
      (input as { region?: string }).region || regionScope || null;

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
      await admin.auth.admin.deleteUser(createdAuthUserId);
      createdAuthUserId = null;
      return NextResponse.json(
        { error: `Could not create operator: ${insertErr.message}` },
        { status: 500 }
      );
    }

    const cardId = `MCARD-${operatorId.toUpperCase()}`;
    const cardNumber = generateMasterCardNumber(operatorId);
    const cvvHash = generateCvvHash(operatorId);
    // Money truth: start at 0 — fund via real top-up
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
      },
      masterCard: {
        cardNumber,
        initialBalance,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    const status =
      message === "UNAUTHENTICATED"
        ? 401
        : message === "FORBIDDEN" || message === "REGION_REQUIRED"
          ? 403
          : 500;

    if (createdAuthUserId) {
      try {
        const admin = createSupabaseAdminClient();
        await admin.auth.admin.deleteUser(createdAuthUserId);
      } catch {
        /* */
      }
    }

    return NextResponse.json({ error: message }, { status });
  }
}

async function generateUniqueUsername(name: string): Promise<string> {
  const admin = createSupabaseAdminClient();
  const taken = new Set<string>();
  try {
    const { data } = await admin.auth.admin.listUsers({ perPage: 1000 });
    for (const u of data?.users ?? []) {
      const uname = u.user_metadata?.username as string | undefined;
      if (uname) taken.add(uname.toLowerCase());
    }
  } catch {
    /* */
  }
  return generateUsername(name, taken).toLowerCase();
}
