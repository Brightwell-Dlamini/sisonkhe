/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Server-side session helpers.
 */

import { createSupabaseServerClient } from "../supabase/server";
import { resolveUserRole, type ResolvedUser } from "./roles";
import {
  assertPermission,
  regionScopeOrThrow,
  type Permission,
} from "./permissions";

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

/** Require an authenticated user with a specific capability. */
export async function requirePermission(
  permission: Permission
): Promise<ResolvedUser> {
  const session = await requireServerSession();
  assertPermission(session, permission);
  return session;
}

/**
 * Require admin-shell access and return region scope.
 * region = null means national (super-admin).
 */
export async function requireAdminScope(): Promise<{
  user: ResolvedUser;
  region: string | null;
}> {
  const user = await requirePermission("admin.shell");
  const region = regionScopeOrThrow(user);
  return { user, region };
}
