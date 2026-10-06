/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Username uniqueness without scanning all auth users.
 */

import type { SupabaseClient } from "@supabase/supabase-js";

export async function isUsernameTaken(
  admin: SupabaseClient,
  username: string
): Promise<boolean> {
  const u = username.trim().toLowerCase();
  if (!u) return true;

  try {
    const { data } = await admin
      .from("usernames")
      .select("username")
      .eq("username", u)
      .maybeSingle();
    if (data) return true;
  } catch {
    /* table may not exist yet — fall through */
  }

  // Fallback: scan metadata (capped) only if registry missing
  try {
    const { data } = await admin.auth.admin.listUsers({ perPage: 200 });
    return (data?.users ?? []).some(
      (user) =>
        String(user.user_metadata?.username ?? "").toLowerCase() === u
    );
  } catch {
    return false;
  }
}

export async function claimUsername(
  admin: SupabaseClient,
  username: string,
  authUserId: string,
  role: string
): Promise<void> {
  const u = username.trim().toLowerCase();
  try {
    await admin.from("usernames").upsert(
      {
        username: u,
        auth_user_id: authUserId,
        role,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "username" }
    );
  } catch (err) {
    console.warn("[usernames] claim failed (non-fatal):", err);
  }
}

export async function releaseUsername(
  admin: SupabaseClient,
  username: string
): Promise<void> {
  try {
    await admin
      .from("usernames")
      .delete()
      .eq("username", username.trim().toLowerCase());
  } catch {
    /* */
  }
}
