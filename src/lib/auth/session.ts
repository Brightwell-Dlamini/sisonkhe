/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Server-side session helpers.
 *
 * Policy: resolution errors are LOUD. A user whose role cannot be determined
 * is treated as unauthenticated, logged, and never handed a partial identity.
 */

import "server-only";
import { createSupabaseServerClient } from "../supabase/server";
import {
  resolveUserRole,
  RoleResolutionError,
  type AuthRole,
  type ResolvedUser,
} from "./roles";
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

  try {
    return await resolveUserRole(user.id, user.email ?? null, user.phone ?? null);
  } catch (err) {
    if (err instanceof RoleResolutionError) {
      // LOUD. Never silently degrade to "no role".
      console.error("[session] role resolution failed:", {
        code: err.code,
        message: err.message,
        authUserId: user.id,
      });
      return null;
    }
    throw err;
  }
}

export async function requireServerSession(): Promise<ResolvedUser> {
  const session = await getServerSession();
  if (!session) throw new Error("UNAUTHENTICATED");
  return session;
}

export async function requireServerRole(
  roles: AuthRole[]
): Promise<ResolvedUser> {
  const session = await requireServerSession();
  if (!roles.includes(session.role)) {
    throw new Error("FORBIDDEN");
  }
  return session;
}

export async function requirePermission(
  permission: Permission
): Promise<ResolvedUser> {
  const session = await requireServerSession();
  assertPermission(session, permission);
  return session;
}

export async function requireAdminScope(): Promise<{
  user: ResolvedUser;
  region: string | null;
}> {
  const user = await requirePermission("admin.shell");
  const region = regionScopeOrThrow(user);
  return { user, region };
}
