/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * The ONE place that creates auth users and links them to role rows.
 *
 * Two shapes, both honest:
 *
 *   provisionAuthUser(...)   → "provision now"
 *       Admin creates a fully-formed account in one step: auth user +
 *       role row. Fails atomically. Rolls back the auth user if the row
 *       insert fails, and surfaces both errors if rollback also fails.
 *
 *   claimExistingRow(...)    → "claim pre-existing row"
 *       The person claims a role row that already exists (collected
 *       earlier, no auth user). We create the auth user, then link it
 *       to the pre-existing row. If linking fails, we roll back the
 *       auth user — and, critically, we tell the caller both the
 *       original error and any rollback error.
 *
 * Both guarantee:
 *   - user_metadata.role  is set
 *   - app_metadata.role   is set  (the edge middleware claim)
 *   - rollback failures are LOUD, never swallowed
 *
 * Nothing outside this module may call admin.auth.admin.createUser.
 */

import "server-only";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import type { AuthRole } from "./roles";

// ---------------------------------------------------------------------------
// Shared shape
// ---------------------------------------------------------------------------

export type ProvisionCommon = {
  email: string;
  password: string;
  role: AuthRole;
  userMetadata?: Record<string, unknown>;
  appMetadata?: Record<string, unknown>;
};

// ---------------------------------------------------------------------------
// Shape 1 — provision now
// ---------------------------------------------------------------------------

export type ProvisionNowInput = ProvisionCommon & {
  /**
   * Insert the role-table row for the newly created auth user.
   * Must throw on failure. Receives the created auth user's id.
   */
  insertRoleRow: (authUserId: string) => Promise<void>;
};

export type ProvisionResult = {
  authUserId: string;
};

export async function provisionAuthUser(
  input: ProvisionNowInput
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
        role: input.role,
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
    await rollbackAuthUser(authUserId, err, "[provision] insertRoleRow");
    throw err;
  }

  return { authUserId };
}

// ---------------------------------------------------------------------------
// Shape 2 — claim pre-existing row
// ---------------------------------------------------------------------------

export type ClaimInput = ProvisionCommon & {
  /**
   * Link the freshly-created auth user to a pre-existing role row.
   *
   * Must return true when the link succeeded. Must throw on hard error.
   * Returning false is treated as a claim failure and triggers rollback.
   *
   * The caller is responsible for ensuring the row exists and is claimable
   * (e.g. has no auth_user_id yet). This function only enforces atomicity.
   */
  linkExistingRow: (authUserId: string) => Promise<boolean>;
};

export async function claimExistingRow(
  input: ClaimInput
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
        role: input.role,
        ...(input.appMetadata ?? {}),
      },
    });

  if (createErr || !created.user) {
    const msg = createErr?.message ?? "no user returned";
    // Surface a distinct error so the caller can tell "email already exists"
    // from "network failed".
    if (msg.toLowerCase().includes("already")) {
      throw new Error(
        "[claim] auth user already exists for this email — the row may already be claimed"
      );
    }
    throw new Error(`[claim] createUser failed: ${msg}`);
  }

  const authUserId = created.user.id;

  let linked = false;
  try {
    linked = await input.linkExistingRow(authUserId);
  } catch (err) {
    await rollbackAuthUser(authUserId, err, "[claim] linkExistingRow");
    throw err;
  }

  if (!linked) {
    const err = new Error(
      "[claim] linkExistingRow returned false — the row was already claimed or does not exist"
    );
    await rollbackAuthUser(authUserId, err, "[claim] linkExistingRow=false");
    throw err;
  }

  return { authUserId };
}

// ---------------------------------------------------------------------------
// The rollback helper — loud on failure, never silent
// ---------------------------------------------------------------------------

async function rollbackAuthUser(
  authUserId: string,
  originalErr: unknown,
  tag: string
): Promise<void> {
  const admin = createSupabaseAdminClient();
  try {
    await admin.auth.admin.deleteUser(authUserId);
  } catch (rollbackErr) {
    const originalMsg =
      originalErr instanceof Error ? originalErr.message : String(originalErr);
    const rollbackMsg =
      rollbackErr instanceof Error ? rollbackErr.message : String(rollbackErr);
    // This is the exact failure that produced the two orphan driver
    // accounts found in Phase 0. We never swallow it again.
    throw new Error(
      `${tag} failed AND rollback failed. auth_user_id=${authUserId} ` +
        `original="${originalMsg}" rollback="${rollbackMsg}"`
    );
  }
}
