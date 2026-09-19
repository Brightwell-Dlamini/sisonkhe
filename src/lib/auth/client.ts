/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Client-side auth helpers.
 */

"use client";

import { getSupabaseBrowser } from "../supabase/client";
import type { ResolvedUser } from "./roles";

export async function signInWithPassword(
  identifier: string,
  password: string
): Promise<{ success: boolean; error?: string; user?: ResolvedUser }> {
  try {
    const res = await fetch("/api/auth/signin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ identifier, password }),
    });

    const body = await res.json().catch(() => ({}));

    if (!res.ok) {
      return { success: false, error: body.error || "Sign in failed" };
    }

    // Session cookie is set by the route. Refresh local Supabase client state.
    const supabase = getSupabaseBrowser();
    await supabase.auth.getUser();

    return { success: true, user: body.user as ResolvedUser | undefined };
  } catch {
    return { success: false, error: "Network error" };
  }
}

export async function signOut(): Promise<void> {
  await fetch("/api/auth/signout", { method: "POST" });
  const supabase = getSupabaseBrowser();
  await supabase.auth.signOut();
}

/** Default landing path for each role after login. */
export function homePathForRole(role: string | undefined | null): string {
  switch (role) {
    case "marshal":
      return "/marshal";
    case "driver":
      return "/driver";
    case "operator":
      return "/operator";
    case "super-admin":
    case "admin":
    case "fleet-manager":
    case "inspector":
      return "/admin";
    default:
      return "/";
  }
}
