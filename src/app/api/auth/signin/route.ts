/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Sign in by: username OR phone OR national ID + password.
 *
 * Flow:
 *   1. Client sends { identifier, password }
 *   2. Server determines identifier type (phone, national ID, or username)
 *   3. For username: we look up the corresponding auth.users row via staff/marshals/drivers/operators
 *   4. For phone/ID: we look up the domain row, then auth.users
 *   5. Sign in with password via Supabase
 */

import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { resolveUserRole } from "@/lib/auth/roles";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function looksLikePhone(s: string): boolean {
  return /^\+?[\d\s]{8,15}$/.test(s.trim());
}

function looksLikeNationalId(s: string): boolean {
  return /^\d{13}$/.test(s.trim().replace(/\s+/g, ""));
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const identifier = String(body.identifier ?? "").trim();
    const password = String(body.password ?? "");

    if (!identifier || !password) {
      return NextResponse.json(
        { error: "Identifier and password are required" },
        { status: 400 }
      );
    }

    const admin = createSupabaseAdminClient();

    // 1. Resolve identifier → auth user id
    let targetAuthUserId: string | null = null;
    let targetEmail: string | null = null;

    // Check if it's an email (contains @)
    if (identifier.includes("@")) {
      targetEmail = identifier.toLowerCase();
    } else if (looksLikeNationalId(identifier)) {
      // Look up by national ID
      const cleanId = identifier.replace(/\s+/g, "");
      const { data: marshal } = await admin
        .from("marshals")
        .select("auth_user_id")
        .eq("id_number", cleanId)
        .maybeSingle();
      if (marshal?.auth_user_id) targetAuthUserId = marshal.auth_user_id;

      if (!targetAuthUserId) {
        const { data: driver } = await admin
          .from("drivers")
          .select("auth_user_id")
          .eq("national_id", cleanId)
          .maybeSingle();
        if (driver?.auth_user_id) targetAuthUserId = driver.auth_user_id;
      }
    } else if (looksLikePhone(identifier)) {
      // Look up by phone (marshal cell/whatsapp, driver phone, operator phone)
      const cleanPhone = identifier.replace(/\s+/g, "");
      const { data: marshal } = await admin
        .from("marshals")
        .select("auth_user_id")
        .or(`cell_no.eq.${cleanPhone},whatsapp_no.eq.${cleanPhone}`)
        .maybeSingle();
      if (marshal?.auth_user_id) targetAuthUserId = marshal.auth_user_id;

      if (!targetAuthUserId) {
        const { data: driver } = await admin
          .from("drivers")
          .select("auth_user_id")
          .eq("phone", identifier)
          .maybeSingle();
        if (driver?.auth_user_id) targetAuthUserId = driver.auth_user_id;
      }
    } else {
      // Username. We store usernames in auth.users.user_metadata.username
      const { data: users } = await admin.auth.admin.listUsers();
      const match = users?.users.find(
        (u) => (u.user_metadata?.username ?? "") === identifier.toLowerCase()
      );
      if (match) {
        targetAuthUserId = match.id;
        targetEmail = match.email ?? null;
      }
    }

    if (!targetAuthUserId) {
      return NextResponse.json(
        { error: "No account found for that identifier" },
        { status: 401 }
      );
    }

    // 2. Get email for sign-in (Supabase requires email)
    if (!targetEmail) {
      const { data: userData, error: userErr } =
        await admin.auth.admin.getUserById(targetAuthUserId);
      if (userErr || !userData.user?.email) {
        return NextResponse.json(
          { error: "Account has no email — contact support" },
          { status: 500 }
        );
      }
      targetEmail = userData.user.email;
    }

    // 3. Sign in with password via the user-scoped client (sets cookies)
    const supabase = await createSupabaseServerClient();
    const { data: signIn, error: signInErr } =
      await supabase.auth.signInWithPassword({
        email: targetEmail,
        password,
      });

    if (signInErr || !signIn.user) {
      return NextResponse.json(
        { error: "Invalid credentials" },
        { status: 401 }
      );
    }

    // 4. Resolve role for the response
    const resolved = await resolveUserRole(
      supabase,
      signIn.user.id,
      signIn.user.email ?? null,
      signIn.user.phone ?? null
    );

    if (!resolved) {
      await supabase.auth.signOut();
      return NextResponse.json(
        { error: "Account has no assigned role. Contact administrator." },
        { status: 403 }
      );
    }

    // 5. Update last_login_at on the domain record
    if (resolved.role === "marshal" && resolved.marshalId) {
      await admin
        .from("marshals")
        .update({ last_login_at: new Date().toISOString() })
        .eq("id", resolved.marshalId);
    } else if (resolved.role === "driver" && resolved.driverId) {
      // drivers table doesn't have last_login_at — skip
    } else if (resolved.staffId) {
      await admin
        .from("staff")
        .update({ last_login_at: new Date().toISOString() })
        .eq("id", resolved.staffId);
    }

    return NextResponse.json({ user: resolved });
  } catch (err) {
    console.error("[api/auth/signin] error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
