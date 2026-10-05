/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Server-side helpers for self-service avatar updates.
 *
 * Given a ResolvedUser, writes the new avatar URL to the correct table.
 * Throws for unsupported roles.
 */

import "server-only";
import { createSupabaseAdminClient } from "../supabase/server";
import type { ResolvedUser, AuthRole } from "../auth/roles";

const TABLE_FOR_ROLE: Record<AuthRole, { table: string; column: string; id: string } | null> = {
  "super-admin":   { table: "staff",          column: "avatar_url",         id: "staffId" },
  "admin":         { table: "staff",          column: "avatar_url",         id: "staffId" },
  "fleet-manager": { table: "staff",          column: "avatar_url",         id: "staffId" },
  "inspector":     { table: "staff",          column: "avatar_url",         id: "staffId" },
  "marshal":       { table: "marshals",       column: "avatar_url",         id: "marshalId" },
  "driver":        { table: "drivers",        column: "profile_picture_url", id: "driverId" },
  "operator":      { table: "fleet_operators", column: "avatar_url",        id: "operatorId" },
};

export async function updateMyAvatar(
  user: ResolvedUser,
  url: string | null
): Promise<{ success: true; url: string | null } | { success: false; error: string }> {
  const spec = TABLE_FOR_ROLE[user.role];
  if (!spec) {
    return { success: false, error: `Unsupported role: ${user.role}` };
  }

  const rowId = (user as unknown as Record<string, string | undefined>)[spec.id];
  if (!rowId) {
    return { success: false, error: `Missing primary id for role ${user.role}` };
  }

  const admin = createSupabaseAdminClient();
  const { error } = await admin
    .from(spec.table)
    .update({ [spec.column]: url })
    .eq("id", rowId);

  if (error) {
    console.error("[account/avatar] update error:", error);
    return { success: false, error: error.message };
  }

  return { success: true, url };
}
