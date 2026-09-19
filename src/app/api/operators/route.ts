/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * GET  /api/operators  — list all operators (staff only)
 * POST /api/operators  — create new operator + master card (staff only)
 */

import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { requireServerRole } from "@/lib/auth/session";
import { createOperatorSchema } from "@/lib/operators/validation";
import { listOperators } from "@/lib/operators/queries";
import {
  generateCvvHash,
  generateMasterCardNumber,
  generateOperatorId,
  generateTempPassword,
  generateUsername,
} from "@/lib/operators/generators";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const ALLOWED_ROLES = ["super-admin", "admin", "fleet-manager"] as const;

// ---------------------------------------------------------------------------
// GET — list
// ---------------------------------------------------------------------------

export async function GET() {
  try {
    await requireServerRole([...ALLOWED_ROLES]);
    const operators = await listOperators();
    return NextResponse.json({ operators });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    const status =
      message === "UNAUTHENTICATED" ? 401 :
      message === "FORBIDDEN" ? 403 : 500;
    console.error("[api/operators] GET error:", err);
    return NextResponse.json({ error: message }, { status });
  }
}

// ---------------------------------------------------------------------------
// POST — create
// ---------------------------------------------------------------------------

export async function POST(request: NextRequest) {
  let createdAuthUserId: string | null = null;

  try {
    await requireServerRole([...ALLOWED_ROLES]);

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

    // --- Email uniqueness in fleet_operators ---
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

    // --- National ID uniqueness ---
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

    // --- Generate operator id, credentials ---
    const operatorId = generateOperatorId();
    const username = await generateUniqueUsername(input.name);
    const tempPassword = generateTempPassword();

    // --- Create auth user ---
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
      console.error("[api/operators] createUser error:", createErr);
      return NextResponse.json({ error: msg }, { status });
    }

    createdAuthUserId = created.user.id;

    // --- Insert operator row ---
    const { error: insertErr } = await admin.from("fleet_operators").insert({
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
    });

    if (insertErr) {
      await admin.auth.admin.deleteUser(createdAuthUserId);
      createdAuthUserId = null;
      console.error("[api/operators] insert error:", insertErr);
      return NextResponse.json(
        { error: `Could not create operator: ${insertErr.message}` },
        { status: 500 }
      );
    }

    // --- Issue Operator Master Card ---
    const cardId = `MCARD-${operatorId.toUpperCase()}`;
    const cardNumber = generateMasterCardNumber(operatorId);
    const cvvHash = generateCvvHash(operatorId);
    const initialBalance = 15000.0; // E 15,000 enterprise seed

    const { error: cardErr } = await admin
      .from("operator_master_cards")
      .insert({
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
      // Non-fatal: operator exists, card can be re-issued
      console.warn("[api/operators] master card issue failed:", cardErr);
    } else {
      // Record the initial seed transaction for the audit trail
      const seedReceipt = `SEED-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`;
      await admin.from("operator_card_transactions").insert({
        id: `tx-seed-${Date.now()}`,
        card_id: cardId,
        timestamp: new Date().toISOString(),
        type: "MASTER_TOP_UP",
        description: `Initial enterprise account seed by ${ALLOWED_ROLES[0]}`,
        category: "Other",
        amount_szl: initialBalance,
        direction: "CREDIT",
        receipt_number: seedReceipt,
        payment_method: "System Seed",
        status: "Completed",
      });
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
      message === "UNAUTHENTICATED" ? 401 :
      message === "FORBIDDEN" ? 403 : 500;

    if (createdAuthUserId) {
      try {
        const admin = createSupabaseAdminClient();
        await admin.auth.admin.deleteUser(createdAuthUserId);
      } catch (rollbackErr) {
        console.error("[api/operators] rollback failed:", rollbackErr);
      }
    }

    console.error("[api/operators] POST error:", err);
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
  } catch (err) {
    console.warn("[api/operators] could not preload usernames:", err);
  }

  return generateUsername(name, taken).toLowerCase();
}
