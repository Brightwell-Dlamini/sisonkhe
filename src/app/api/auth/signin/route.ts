/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { NextRequest } from "next/server";
import {
  createSupabaseAdminClient,
  createSupabaseServerClient,
} from "@/lib/supabase/server";
import { looseAdmin, rpcRow } from "@/lib/supabase/rpc";
import { resolveUserRole } from "@/lib/auth/roles";
import { AppError } from "@/lib/api/errors";
import { ok, withApiHandler } from "@/lib/api/response";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function looksLikeEmail(s: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s.trim());
}

function looksLikeNationalId(s: string): boolean {
  return /^\d{13}$/.test(s.trim().replace(/\s+/g, ""));
}

function looksLikePhone(s: string): boolean {
  const cleaned = s.replace(/\s+/g, "");
  if (looksLikeNationalId(s)) return false;
  return /^\+?\d{8,15}$/.test(cleaned);
}

type AuthLookup = { auth_user_id?: string; email?: string };

const GENERIC_AUTH_ERROR = "Invalid credentials";

export const POST = withApiHandler(async (request: NextRequest) => {
  const body = await request.json();
  const identifier = String(body.identifier ?? "").trim();
  const password = String(body.password ?? "");

  // Rate limiting intentionally removed until public rollout.

  if (!identifier || !password) {
    throw AppError.validation("Identifier and password are required");
  }

  const admin = createSupabaseAdminClient();
  const rpc = looseAdmin(admin);

  let targetAuthUserId: string | null = null;
  let targetEmail: string | null = null;

  if (looksLikeEmail(identifier)) {
    const { data, error } = await rpc.rpc("find_auth_user_by_email", {
      p_email: identifier.toLowerCase(),
    });
    if (error) console.error("[signin] find_by_email error:", error);
    const row = rpcRow<AuthLookup>(data);
    if (row?.auth_user_id && row.email) {
      targetAuthUserId = row.auth_user_id;
      targetEmail = row.email;
    }
  } else if (looksLikeNationalId(identifier)) {
    const cleanId = identifier.replace(/\s+/g, "");
    const { data, error } = await rpc.rpc("find_auth_user_by_national_id", {
      p_national_id: cleanId,
    });
    if (error) console.error("[signin] find_by_id error:", error);
    const row = rpcRow<AuthLookup>(data);
    if (row?.auth_user_id && row.email) {
      targetAuthUserId = row.auth_user_id;
      targetEmail = row.email;
    }
  } else if (looksLikePhone(identifier)) {
    const { data, error } = await rpc.rpc("find_auth_user_by_phone", {
      p_phone: identifier,
    });
    if (error) console.error("[signin] find_by_phone error:", error);
    const row = rpcRow<AuthLookup>(data);
    if (row?.auth_user_id && row.email) {
      targetAuthUserId = row.auth_user_id;
      targetEmail = row.email;
    }
  } else {
    const { data, error } = await rpc.rpc("find_auth_user_by_username", {
      p_username: identifier,
    });
    if (error) console.error("[signin] find_by_username error:", error);
    const row = rpcRow<AuthLookup>(data);
    if (row?.auth_user_id && row.email) {
      targetAuthUserId = row.auth_user_id;
      targetEmail = row.email;
    }
  }

  if (!targetAuthUserId || !targetEmail) {
    throw AppError.unauthenticated(GENERIC_AUTH_ERROR);
  }

  const supabase = await createSupabaseServerClient();
  const { data: signIn, error: signInErr } =
    await supabase.auth.signInWithPassword({
      email: targetEmail,
      password,
    });

  if (signInErr || !signIn.user) {
    throw AppError.unauthenticated(GENERIC_AUTH_ERROR);
  }

  const resolved = await resolveUserRole(
    signIn.user.id,
    signIn.user.email ?? null,
    signIn.user.phone ?? null
  );

  if (!resolved) {
    await supabase.auth.signOut();
    throw AppError.forbidden(
      "Account has no assigned role. Please contact your administrator."
    );
  }

  const mustChangePassword = Boolean(
    signIn.user.user_metadata?.must_change_password
  );

  if (resolved.staffId) {
    try {
      await looseAdmin(admin)
        .from("staff")
        .update({ last_login_at: new Date().toISOString() })
        .eq("id", resolved.staffId)
        .select("id");
    } catch (updateErr) {
      console.warn("[signin] staff last_login update failed:", updateErr);
    }
  }

  return ok({
    user: resolved,
    mustChangePassword,
  });
});
