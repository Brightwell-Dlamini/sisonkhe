/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

"use client";

import { getSupabaseBrowser } from "../supabase/client";
import type { ResolvedUser } from "./roles";

export async function signInWithPassword(
  identifier: string,
  password: string
): Promise<{
  success: boolean;
  error?: string;
  user?: ResolvedUser;
  mustChangePassword?: boolean;
}> {
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

    const supabase = getSupabaseBrowser();
    await supabase.auth.getUser();

    return {
      success: true,
      user: body.user as ResolvedUser | undefined,
      mustChangePassword: Boolean(body.mustChangePassword),
    };
  } catch {
    return { success: false, error: "Network error" };
  }
}

export async function changePassword(
  currentPassword: string,
  newPassword: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const res = await fetch("/api/account/password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ currentPassword, newPassword }),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      return { success: false, error: body.error || "Password change failed" };
    }
    return { success: true };
  } catch {
    return { success: false, error: "Network error" };
  }
}

export async function signOut(): Promise<void> {
  await fetch("/api/auth/signout", { method: "POST" });
  const supabase = getSupabaseBrowser();
  await supabase.auth.signOut();
}

export function homePathForRole(role: string | undefined | null): string {
  switch (role) {
    case "marshal":
      return "/marshal";
    case "driver":
      return "/driver";
    case "operator":
      return "/operator/renewals";
    case "inspector":
      return "/inspector/scan";
    case "super-admin":
    case "admin":
    case "fleet-manager":
      return "/admin";
    default:
      return "/";
  }
}
