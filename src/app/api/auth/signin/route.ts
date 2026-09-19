/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Sign in by: username OR phone OR national ID + password.
 *
 * Flow:
 *   1. Client sends { identifier, password }
 *   2. Server determines identifier type
 *   3. Uses RPC helpers to find the auth user
 *   4. Signs in with password via Supabase
 *   5. Resolves role
 */

import { NextRequest, NextResponse } from "next/server";
import {
  createSupabaseAdminClient,
  createSupabaseServerClient,
} from "@/lib/supabase/server";
import { resolveUserRole } from "@/lib/auth/roles";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function looksLikeEmail(s: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s.trim());
}

function looksLikePhone(s: string): boolean {
  const cleaned = s.replace(/\s+/g, "");
  return /^\+?\d{8,15}$/.test(cleaned) && !looksLikeNationalId(s);
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

    // --- Resolve identifier → auth user ---
    let targetAuthUserId: string | null = null;
    let targetEmail: string | null = null;

    if (looksLikeEmail(identifier)) {
      const { data, error } = await admin.rpc("find_auth_user_by_email", {
        p_email: identifier.toLowerCase(),
      });
      if (error) console.error("[signin] find_by_email error:", error);
      const row = Array.isArray(data) ? data[0] : data;
      if (row) {
        targetAuthUserId = row.auth_user_id;
        targetEmail = row.email;
      }
    } else if (looksLikeNationalId(identifier)) {
      const cleanId = identifier.replace(/\s+/g, "");
      const { data, error } = await admin.rpc("find_auth_user_by_national_id", {
        p_national_id: cleanId,
      });
      if (error) console.error("[signin] find_by_id error:", error);
      const row = Array.isArray(data) ? data[0] : data;
      if (row) {
        targetAuthUserId = row.auth_user_id;
        targetEmail = row.email;
      }
    } else if (looksLikePhone(identifier)) {
      const { data, error } = await admin.rpc("find_auth_user_by_phone", {
        p_phone: identifier,
      });
      if (error) console.error("[signin] find_by_phone error:", error);
      const row = Array.isArray(data) ? data[0] : data;
      if (row) {
        targetAuthUserId = row.auth_user_id;
        targetEmail = row.email;
      }
    } else {
      // Username
      const { data, error } = await admin.rpc("find_auth_user_by_username", {
        p_username: identifier,
      });
      if (error) console.error("[signin] find_by_username error:", error);
      const row = Array.isArray(data) ? data[0] : data;
      if (row) {
        targetAuthUserId = row.auth_user_id;
        targetEmail = row.email;
      }
    }

    if (!targetAuthUserId || !targetEmail) {
      return NextResponse.json(
        { error: "No account found for that identifier" },
        { status: 401 }
      );
    }

    // --- Sign in with password ---
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

    // --- Resolve role ---
    const resolved = await resolveUserRole(
      supabase,
      signIn.user.id,
      signIn.user.email ?? null,
      signIn.user.phone ?? null
    );

    if (!resolved) {
      await supabase.auth.signOut();
      return NextResponse.json(
        {
          error:
            "Account has no assigned role. Please contact your administrator.",
        },
        { status: 403 }
      );
    }

    // --- Update last_login_at on domain record ---
    try {
      if (resolved.role === "marshal" && resolved.marshalId) {
        await admin
          .from("marshals")
          .update({ last_login_at: new Date().toISOString() })
          .eq("id", resolved.marshalId);
      } else if (resolved.staffId) {
        await admin
          .from("staff")
          .update({ last_login_at: new Date().toISOString() })
          .eq("id", resolved.staffId);
      }
    } catch (updateErr) {
      // Non-critical — don't fail sign-in over this
      console.warn("[signin] last_login update failed:", updateErr);
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
