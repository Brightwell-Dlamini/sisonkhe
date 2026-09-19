/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Marshal account claim flow.
 *
 * Step 1 (POST): Verify identity by national ID + phone.
 * Step 2 (POST): Set username + password, create auth user, link to marshal.
 *
 * We combine both steps into a single endpoint for simplicity:
 *   - Verify first
 *   - Then create
 *   - If creation fails, rollback the auth user
 */

import { NextRequest, NextResponse } from "next/server";
import {
  createSupabaseAdminClient,
  createSupabaseServerClient,
} from "@/lib/supabase/server";
import { resolveUserRole } from "@/lib/auth/roles";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// ---------------------------------------------------------------------------
// Step 1: Verify identity
// ---------------------------------------------------------------------------

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const idNumber = String(body.idNumber ?? "").trim().replace(/\s+/g, "");
    const phone = String(body.phone ?? "").trim();

    if (!idNumber || !phone) {
      return NextResponse.json(
        { error: "National ID and phone number are required." },
        { status: 400 }
      );
    }

    const admin = createSupabaseAdminClient();
    const { data, error } = await admin.rpc("verify_marshal_identity", {
      p_id_number: idNumber,
      p_phone: phone,
    });

    if (error) {
      console.error("[api/auth/claim] verify rpc error:", error);
      return NextResponse.json(
        { error: "Verification service unavailable." },
        { status: 500 }
      );
    }

    const match = Array.isArray(data) ? data[0] : data;
    if (!match) {
      return NextResponse.json(
        {
          error:
            "No marshal found with that National ID and phone number. Check your details or contact your supervisor.",
        },
        { status: 404 }
      );
    }

    if (match.already_claimed) {
      return NextResponse.json(
        {
          error:
            "This account has already been claimed. If you forgot your password, use the password reset flow or contact your supervisor.",
        },
        { status: 409 }
      );
    }

    return NextResponse.json({
      verified: true,
      fullName: match.full_name,
      marshalId: match.marshal_id,
    });
  } catch (err) {
    console.error("[api/auth/claim] error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// ---------------------------------------------------------------------------
// Step 2: Create account
// ---------------------------------------------------------------------------

export async function POST(request: NextRequest) {
  let createdAuthUserId: string | null = null;

  try {
    const body = await request.json();
    const idNumber = String(body.idNumber ?? "").trim().replace(/\s+/g, "");
    const phone = String(body.phone ?? "").trim();
    const username = String(body.username ?? "").trim().toLowerCase();
    const password = String(body.password ?? "");

    // --- Validation ---
    if (!idNumber || !phone || !username || !password) {
      return NextResponse.json(
        { error: "All fields are required." },
        { status: 400 }
      );
    }

    if (!/^[a-z0-9._]{3,32}$/.test(username)) {
      return NextResponse.json(
        {
          error:
            "Username must be 3-32 characters, lowercase letters, numbers, dots or underscores only.",
        },
        { status: 400 }
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters." },
        { status: 400 }
      );
    }

    const admin = createSupabaseAdminClient();

    // --- Re-verify identity (protect against race conditions) ---
    const { data: verifyData, error: verifyErr } = await admin.rpc(
      "verify_marshal_identity",
      { p_id_number: idNumber, p_phone: phone }
    );

    if (verifyErr) throw verifyErr;

    const match = Array.isArray(verifyData) ? verifyData[0] : verifyData;
    if (!match) {
      return NextResponse.json(
        { error: "Identity verification failed." },
        { status: 404 }
      );
    }

    if (match.already_claimed) {
      return NextResponse.json(
        { error: "This account has already been claimed." },
        { status: 409 }
      );
    }

    // --- Check username availability ---
    const { data: existingUsers } = await admin.auth.admin.listUsers();
    const usernameTaken = existingUsers?.users.some(
      (u) => (u.user_metadata?.username ?? "") === username
    );
    if (usernameTaken) {
      return NextResponse.json(
        { error: "That username is already taken. Please choose another." },
        { status: 409 }
      );
    }

    // --- Create the auth user ---
    // We use a synthetic email internally (Supabase requires one).
    // The marshal will never see this email.
    const syntheticEmail = `${match.marshal_id}@marshal.sisonkhe.local`;

    const { data: created, error: createErr } = await admin.auth.admin.createUser({
      email: syntheticEmail,
      password,
      email_confirm: true,
      user_metadata: {
        username,
        full_name: match.full_name,
        role: "marshal",
        marshal_id: match.marshal_id,
      },
    });

    if (createErr || !created.user) {
      console.error("[api/auth/claim] create user error:", createErr);
      return NextResponse.json(
        { error: "Could not create account. Please try again." },
        { status: 500 }
      );
    }

    createdAuthUserId = created.user.id;

    // --- Link marshal ---
    const { data: linked, error: linkErr } = await admin.rpc(
      "link_marshal_auth",
      {
        p_id_number: idNumber,
        p_phone: phone,
        p_auth_user_id: createdAuthUserId,
      }
    );

    if (linkErr || !linked) {
      // Rollback: delete the auth user we just created
      await admin.auth.admin.deleteUser(createdAuthUserId);
      createdAuthUserId = null;

      console.error("[api/auth/claim] link error:", linkErr);
      return NextResponse.json(
        {
          error:
            "Could not link account to marshal record. Please contact your supervisor.",
        },
        { status: 500 }
      );
    }

    // --- Auto sign-in ---
    const supabase = await createSupabaseServerClient();
    const { data: signIn, error: signInErr } =
      await supabase.auth.signInWithPassword({
        email: syntheticEmail,
        password,
      });

    if (signInErr || !signIn.user) {
      // Account was created and linked, but sign-in failed.
      // The marshal can just go to /login and sign in manually.
      return NextResponse.json({
        success: true,
        signedIn: false,
        message:
          "Account created. Please sign in at the login page with your new credentials.",
      });
    }

    const resolved = await resolveUserRole(
      supabase,
      signIn.user.id,
      signIn.user.email ?? null,
      signIn.user.phone ?? null
    );

    return NextResponse.json({
      success: true,
      signedIn: true,
      user: resolved,
    });
  } catch (err) {
    console.error("[api/auth/claim] fatal error:", err);

    // Attempt rollback
    if (createdAuthUserId) {
      try {
        const admin = createSupabaseAdminClient();
        await admin.auth.admin.deleteUser(createdAuthUserId);
      } catch (rollbackErr) {
        console.error("[api/auth/claim] rollback failed:", rollbackErr);
      }
    }

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
