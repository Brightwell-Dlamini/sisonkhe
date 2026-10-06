/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Marshal claim flow. One link path. One audit trail. No archaeology.
 */

import { NextRequest, NextResponse } from "next/server";
import {
  createSupabaseAdminClient,
  createSupabaseServerClient,
} from "@/lib/supabase/server";
import { looseAdmin, rpcRow } from "@/lib/supabase/rpc";
import { resolveUserRole } from "@/lib/auth/roles";
import { rateLimit } from "@/lib/domain/rateLimit";
import { isUsernameTaken, claimUsername } from "@/lib/domain/usernames";
import { writeAudit } from "@/lib/domain/audit";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function clientIp(request: NextRequest): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown"
  );
}

/**
 * Link a marshal row to an auth user. Exactly one strategy:
 * the current link_marshal_auth(text, text, uuid) signature.
 *
 * Returns true only when the row is linked to THIS auth user.
 * Idempotent: a second call for the same (idNumber, phone, authUserId) returns true.
 */
async function linkMarshal(
  admin: ReturnType<typeof createSupabaseAdminClient>,
  opts: { idNumber: string; phone: string; authUserId: string }
): Promise<boolean> {
  const loose = looseAdmin(admin);
  const { data, error } = await loose.rpc("link_marshal_auth", {
    p_id_number: opts.idNumber,
    p_phone: opts.phone,
    p_auth_user_id: opts.authUserId,
  });
  if (error) {
    console.error("[claim] link_marshal_auth RPC error:", error);
    return false;
  }
  return data === true;
}

export async function PUT(request: NextRequest) {
  try {
    const rl = rateLimit(`claim:${clientIp(request)}`, 15, 15 * 60_000);
    if (!rl.ok) {
      return NextResponse.json(
        { error: "Too many attempts. Try again later." },
        { status: 429 }
      );
    }

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
    const { data, error } = await looseAdmin(admin).rpc(
      "verify_marshal_identity",
      { p_id_number: idNumber, p_phone: phone }
    );

    if (error) {
      console.error("[claim] verify_marshal_identity error:", error);
      return NextResponse.json(
        { error: "Verification service unavailable." },
        { status: 500 }
      );
    }

    const row = rpcRow<{
      already_claimed?: boolean;
      full_name?: string;
      marshal_id?: string;
    }>(data);

    if (!row) {
      return NextResponse.json(
        {
          error:
            "No marshal found with that National ID and phone number. Check your details or contact your supervisor.",
        },
        { status: 404 }
      );
    }

    if (row.already_claimed) {
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
      fullName: row.full_name,
      marshalId: row.marshal_id,
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
    const rl = rateLimit(`claim-post:${clientIp(request)}`, 10, 15 * 60_000);
    if (!rl.ok) {
      return NextResponse.json(
        { error: "Too many attempts. Try again later." },
        { status: 429 }
      );
    }

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
    const loose = looseAdmin(admin);

    const { data: verifyData, error: verifyErr } = await loose.rpc(
      "verify_marshal_identity",
      { p_id_number: idNumber, p_phone: phone }
    );

    if (verifyErr) {
      return NextResponse.json(
        { error: "Verification service unavailable." },
        { status: 500 }
      );
    }

    const match = rpcRow<{
      already_claimed?: boolean;
      full_name?: string;
      marshal_id: string;
    }>(verifyData);

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

    if (await isUsernameTaken(admin, username)) {
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
          must_change_password: false,
        },
        app_metadata: {
          role: "marshal", // read by edge middleware
        },
      });

    if (createErr || !created.user) {
      const msg = createErr?.message ?? "Could not create account.";
      if (
        msg.toLowerCase().includes("already") ||
        msg.toLowerCase().includes("exists")
      ) {
        return NextResponse.json(
          {
            error:
              "An auth account already exists for this marshal. Ask a supervisor to reset, or sign in.",
          },
          { status: 409 }
        );
      }
      return NextResponse.json(
        { error: "Could not create account. Please try again." },
        { status: 500 }
      );
    }

    createdAuthUserId = created.user.id;

    const linked = await linkMarshal(admin, {
      idNumber,
      phone,
      authUserId: createdAuthUserId,
    });

    if (!linked) {
      try {
        await admin.auth.admin.deleteUser(createdAuthUserId);
      } catch {
        /* best effort */
      }
      createdAuthUserId = null;

      await writeAudit(admin, {
        action: "claim.link_failed",
        actorId: created.user.id,
        actorRole: "marshal",
        entityType: "marshals",
        entityId: match.marshal_id,
        summary: `Claim link failed for marshal ${match.marshal_id}`,
      });

      return NextResponse.json(
        {
          error:
            "Could not link account to marshal record. Please contact your supervisor.",
        },
        { status: 500 }
      );
    }

    await claimUsername(admin, username, created.user.id, "marshal");

    await writeAudit(admin, {
      action: "claim.success",
      actorId: created.user.id,
      actorRole: "marshal",
      entityType: "marshals",
      entityId: match.marshal_id,
      summary: `Marshal ${match.marshal_id} claimed account`,
    });

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
        /* best effort */
      }
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
