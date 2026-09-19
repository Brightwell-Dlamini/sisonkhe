/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Marshal account claim flow.
 *
 * Step 1 (PUT): Verify identity by national ID + phone.
 * Step 2 (POST): Set username + password, create auth user, link to marshal.
 *
 * The link step uses the admin client (service role) to UPDATE the marshals
 * row directly — no RPC required, RLS bypassed by service role.
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
            "This account has already been claimed. If you forgot your password, contact your supervisor to reset it.",
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

    // --- Re-verify identity (protects against race conditions) ---
    const { data: verifyData, error: verifyErr } = await admin.rpc(
      "verify_marshal_identity",
      { p_id_number: idNumber, p_phone: phone }
    );

    if (verifyErr) {
      console.error("[api/auth/claim] re-verify error:", verifyErr);
      throw verifyErr;
    }

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
    const { data: existingUsers, error: listErr } =
      await admin.auth.admin.listUsers({ perPage: 1000 });

    if (listErr) {
      console.error("[api/auth/claim] list users error:", listErr);
      return NextResponse.json(
        { error: "Could not verify username availability." },
        { status: 500 }
      );
    }

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
    // Supabase Auth requires an email. We use a synthetic one.
    // Marshals never see it — they sign in by username/phone/ID.
    const syntheticEmail = `${match.marshal_id}@marshal.sisonkhe.local`;

    const { data: created, error: createErr } =
      await admin.auth.admin.createUser({
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

    // --- Link marshal: UPDATE directly via admin client ---
    // Uses service role key which bypasses RLS.
    const { error: updateErr, count } = await admin
      .from("marshals")
      .update(
        {
          auth_user_id: createdAuthUserId,
          last_login_at: new Date().toISOString(),
          updated_at: Date.now(),
          server_updated_at: new Date().toISOString(),
        },
        { count: "exact" }
      )
      .eq("id", match.marshal_id)
      .is("auth_user_id", null); // guard against races

    if (updateErr) {
      console.error("[api/auth/claim] link update error:", updateErr);
      await admin.auth.admin.deleteUser(createdAuthUserId);
      createdAuthUserId = null;
      return NextResponse.json(
        {
          error:
            "Could not link account to marshal record. Please contact your supervisor.",
        },
        { status: 500 }
      );
    }

    if (!count || count === 0) {
      // Either the row was already claimed between step 1 and now,
      // or the marshal_id doesn't match (shouldn't happen).
      console.error("[api/auth/claim] link update affected 0 rows");
      await admin.auth.admin.deleteUser(createdAuthUserId);
      createdAuthUserId = null;
      return NextResponse.json(
        {
          error:
            "This account appears to have just been claimed by another device. Please try signing in.",
        },
        { status: 409 }
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
      // Marshal can go to /login and sign in manually.
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

    // Rollback
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
