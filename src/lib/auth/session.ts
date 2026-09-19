/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Server-side session helpers.
 */

import { createSupabaseServerClient } from "../supabase/server";
import { resolveUserRole, type ResolvedUser } from "./roles";

export async function getServerSession(): Promise<ResolvedUser | null> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  return resolveUserRole(user.id, user.email ?? null, user.phone ?? null);
}

export async function requireServerSession(): Promise<ResolvedUser> {
  const session = await getServerSession();
  if (!session) {
    throw new Error("UNAUTHENTICATED");
  }
  return session;
}

export async function requireServerRole(
  roles: ResolvedUser["role"][]
): Promise<ResolvedUser> {
  const session = await requireServerSession();
  if (!roles.includes(session.role)) {
    throw new Error("FORBIDDEN");
  }
  return session;
}
