/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Server-side session helpers.
 */

import { createSupabaseServerClient } from "../supabase/server";
import { resolveUserRole, type ResolvedUser } from "./roles";

/**
 * Get the current authenticated user resolved to their domain role.
 * Returns null if unauthenticated or if the user has no domain record.
 */
export async function getServerSession(): Promise<ResolvedUser | null> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  return resolveUserRole(supabase, user.id, user.email ?? null, user.phone ?? null);
}

/**
 * Same as getServerSession, but throws if no session. For protected routes.
 */
export async function requireServerSession(): Promise<ResolvedUser> {
  const session = await getServerSession();
  if (!session) {
    throw new Error("UNAUTHENTICATED");
  }
  return session;
}

/**
 * Same as requireServerSession, but also checks role membership.
 */
export async function requireServerRole(
  roles: ResolvedUser["role"][]
): Promise<ResolvedUser> {
  const session = await requireServerSession();
  if (!roles.includes(session.role)) {
    throw new Error("FORBIDDEN");
  }
  return session;
}
