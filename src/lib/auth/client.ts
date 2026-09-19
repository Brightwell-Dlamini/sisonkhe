/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Client-side auth helpers.
 */

"use client";

import { getSupabaseBrowser } from "../supabase/client";

export async function signInWithPassword(
  identifier: string,
  password: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const res = await fetch("/api/auth/signin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ identifier, password }),
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      return { success: false, error: body.error || "Sign in failed" };
    }

    // The route set the session cookie. Refresh local session state.
    const supabase = getSupabaseBrowser();
    await supabase.auth.getUser();

    return { success: true };
  } catch (err) {
    return { success: false, error: "Network error" };
  }
}

export async function signOut(): Promise<void> {
  await fetch("/api/auth/signout", { method: "POST" });
  const supabase = getSupabaseBrowser();
  await supabase.auth.signOut();
}
