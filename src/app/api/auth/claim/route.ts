/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Marshal account claim flow.
 *
 * Step 1 (PUT): Verify identity by national ID + phone.
 * Step 2 (POST): Set username + password, create auth user, link to marshal.
 *
 * Linking strategy (in order):
 *  1. link_marshal_auth(id_number, phone, auth_user_id)  — 0004 signature
 *  2. link_marshal_auth(marshal_id, auth_user_id)        — 0007 signature
 *  3. Direct UPDATE of auth_user_id only via service role
 */

import { NextRequest, NextResponse } from "next/server";
import {
  createSupabaseAdminClient,
  createSupabaseServerClient,
} from "@/lib/supabase/server";
import { resolveUserRole } from "@/lib/auth/roles";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

async function tryLinkMarshal(
  admin: ReturnType<typeof createSupabaseAdminClient>,
  opts: {
    marshalId: string;
    idNumber: string;
    phone: string;
    authUserId: string;
  }
): Promise<{ ok: boolean; method?: string; error?: string }> {
  const { marshalId, idNumber, phone, authUserId } = opts;

  // 1) Identity-based RPC
  {
    const { data, error } = await admin.rpc("link_marshal_auth", {
      p_id_number: idNumber,
      p_phone: phone,
      p_auth_user_id: authUserId,
    });
    if (!error && data === true) {
      return { ok: true, method: "rpc:id+phone" };
    }
    if (error) {
      console.warn("[claim] link_marshal_auth(id,phone,uid) failed:", error.message);
    } else if (data === false) {
      console.warn("[claim] link_marshal_auth(id,phone,uid) returned false");
    }
  }

  // 2) ID-based RPC
  {
    const { data, error } = await admin.rpc("link_marshal_auth", {
      p_marshal_id: marshalId,
      p_auth_user_id: authUserId,
    });
    if (!error && data === true) {
      return { ok: true, method: "rpc:marshal_id" };
    }
    if (error) {
      console.warn("[claim] link_marshal_auth(marshal_id,uid) failed:", error.message);
    } else if (data === false) {
      console.warn("[claim] link_marshal_auth(marshal_id,uid) returned false");
    }
  }

  // 3) Direct UPDATE — only auth_user_id
  {
    const { data: rows, error } = await admin
      .from("marshals")
      .update({ auth_user_id: authUserId })
      .eq("id", marshalId)
      .is("auth_user_id", null)
      .select("id");

    if (!error && rows && rows.length > 0) {
      return { ok: true, method: "update:id" };
    }
    if (error) {
      console.error("[claim] UPDATE by id failed:", error);
      const { data: rows2, error: err2 } = await admin
        .from("marshals")
        .update({ auth_user_id: authUserId })
        .eq("id_number", idNumber)
        .is("auth_user_id", null)
        .select("id");

      if (!err2 && rows2 && rows2.length > 0) {
        return { ok: true, method: "update:id_number" };
      }
      return {
        ok: false,
        error: error.message || err2?.message || "UPDATE failed",
      };
    }
    return {
      ok: false,
      error:
        "No unclaimed marshal row matched. It may already be linked or the ID does not match.",
    };
  }
}

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
        {
          error: "Verification service unavailable.",
          detail: error.message,
        },
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
    console.error("[api/auth/claim] PUT error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  let createdAuthUserId: string | null = null;

  try {
    const body = await request.json();
    const idNumber = String(body.idNumber ?? "").trim().replace(/\s+/g, "");
    const phone = String(body.phone ?? "").trim();
    const username = String(body.username ?? "").trim().toLowerCase();
    const password = String(body.password ?? "");

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

    const { data: verifyData, error: verifyErr } = await admin.rpc(
      "verify_marshal_identity",
      { p_id_number: idNumber, p_phone: phone }
    );

    if (verifyErr) {
      console.error("[api/auth/claim] re-verify error:", verifyErr);
      return NextResponse.json(
        {
          error: "Verification service unavailable.",
          detail: verifyErr.message,
        },
        { status: 500 }
      );
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

    const { data: existingUsers, error: listErr } =
      await admin.auth.admin.listUsers({ perPage: 1000 });

    if (listErr) {
      console.error("[api/auth/claim] list users error:", listErr);
      return NextResponse.json(
        { error: "Could not verify username availability.", detail: listErr.message },
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
      const msg = createErr?.message ?? "Could not create account.";
      if (msg.toLowerCase().includes("already") || msg.toLowerCase().includes("exists")) {
        return NextResponse.json(
          {
            error:
              "An auth account already exists for this marshal (possibly from a failed earlier claim). Ask a supervisor to delete the orphan auth user, or sign in if you already set a password.",
            detail: msg,
          },
          { status: 409 }
        );
      }
      return NextResponse.json(
        { error: "Could not create account. Please try again.", detail: msg },
        { status: 500 }
      );
    }

    createdAuthUserId = created.user.id;

    const linkResult = await tryLinkMarshal(admin, {
      marshalId: match.marshal_id,
      idNumber,
      phone,
      authUserId: createdAuthUserId,
    });

    if (!linkResult.ok) {
      console.error("[api/auth/claim] link failed:", linkResult);
      try {
        await admin.auth.admin.deleteUser(createdAuthUserId);
      } catch {
        /* best-effort */
      }
      createdAuthUserId = null;
      return NextResponse.json(
        {
          error:
            "Could not link account to marshal record. Please contact your supervisor.",
          detail: linkResult.error,
        },
        { status: 500 }
      );
    }

    console.log("[api/auth/claim] linked via", linkResult.method);

    const supabase = await createSupabaseServerClient();
    const { data: signIn, error: signInErr } =
      await supabase.auth.signInWithPassword({
        email: syntheticEmail,
        password,
      });

    if (signInErr || !signIn.user) {
      return NextResponse.json({
        success: true,
        signedIn: false,
        message:
          "Account created. Please sign in at the login page with your new credentials.",
      });
    }

    const resolved = await resolveUserRole(
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
    console.error("[api/auth/claim] POST error:", err);
    if (createdAuthUserId) {
      try {
        const admin = createSupabaseAdminClient();
        await admin.auth.admin.deleteUser(createdAuthUserId);
      } catch {
        /* best-effort cleanup */
      }
    }
    return NextResponse.json(
      {
        error: "Internal server error",
        detail: err instanceof Error ? err.message : String(err),
      },
      { status: 500 }
    );
  }
}
