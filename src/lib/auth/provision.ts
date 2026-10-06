/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * The ONE place that creates auth users.
 *
 * Every route that needs to provision a login — staff, marshal, driver,
 * operator — must call provisionAuthUser(). Nothing else may call
 * admin.auth.admin.createUser directly.
 *
 * Guarantees:
 *   - user_metadata.role  is set
 *   - app_metadata.role   is set  (the edge middleware claim)
 *   - if the provided `insertRoleRow` callback throws, the auth user is
 *     deleted — and if that delete fails, the error is surfaced, not
 *     swallowed.
 *
 * This function does not know about specific role tables. The caller passes
 * a callback that inserts the role row. That keeps the module role-agnostic.
 */

import "server-only";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import type { AuthRole } from "./roles";

export type ProvisionInput = {
  email: string;
  password: string;
  role: AuthRole;
  /** Additional user_metadata fields (username, full_name, driver_id, ...). */
  userMetadata?: Record<string, unknown>;
  /** Additional app_metadata fields beyond `role`. Rarely needed. */
  appMetadata?: Record<string, unknown>;
  /**
   * Insert the role-table row. Must throw on failure.
   * Receives the created auth user's id.
   */
  insertRoleRow: (authUserId: string) => Promise<void>;
};

export type ProvisionResult = {
  authUserId: string;
};

export async function provisionAuthUser(
  input: ProvisionInput
): Promise<ProvisionResult> {
  const admin = createSupabaseAdminClient();

  const { data: created, error: createErr } =
    await admin.auth.admin.createUser({
      email: input.email,
      password: input.password,
      email_confirm: true,
      user_metadata: {
        role: input.role,
        ...(input.userMetadata ?? {}),
      },
      app_metadata: {
        role: input.role, // <-- the edge middleware reads this
        ...(input.appMetadata ?? {}),
      },
    });

  if (createErr || !created.user) {
    throw new Error(
      `[provision] createUser failed: ${createErr?.message ?? "no user returned"}`
    );
  }

  const authUserId = created.user.id;

  try {
    await input.insertRoleRow(authUserId);
  } catch (err) {
    // Roll back the auth user. If the rollback itself fails, surface BOTH
    // errors — never swallow. This is the exact leak that produced the two
    // orphan driver accounts found in Phase 0.
    try {
      await admin.auth.admin.deleteUser(authUserId);
    } catch (rollbackErr) {
      const originalMsg = err instanceof Error ? err.message : String(err);
      const rollbackMsg =
        rollbackErr instanceof Error ? rollbackErr.message : String(rollbackErr);
      throw new Error(
        `[provision] role-row insert failed AND rollback failed. ` +
          `auth_user_id=${authUserId} original="${originalMsg}" rollback="${rollbackMsg}"`
      );
    }
    throw err;
  }

  return { authUserId };
}
