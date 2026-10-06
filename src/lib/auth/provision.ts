/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * The ONE place that creates auth users and links them to role rows.
 */

import "server-only";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import type { AuthRole } from "./roles";

export type ProvisionCommon = {
  email: string;
  password: string;
  role: AuthRole;
  userMetadata?: Record<string, unknown>;
  appMetadata?: Record<string, unknown>;
  /** Default true for admin-issued accounts */
  mustChangePassword?: boolean;
};

export type ProvisionNowInput = ProvisionCommon & {
  insertRoleRow: (authUserId: string) => Promise<void>;
};

export type ProvisionResult = {
  authUserId: string;
};

export async function provisionAuthUser(
  input: ProvisionNowInput
): Promise<ProvisionResult> {
  const admin = createSupabaseAdminClient();
  const mustChange =
    input.mustChangePassword !== undefined ? input.mustChangePassword : true;

  const { data: created, error: createErr } =
    await admin.auth.admin.createUser({
      email: input.email,
      password: input.password,
      email_confirm: true,
      user_metadata: {
        role: input.role,
        must_change_password: mustChange,
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

export type ClaimInput = ProvisionCommon & {
  linkExistingRow: (authUserId: string) => Promise<boolean>;
};

export async function claimExistingRow(
  input: ClaimInput
): Promise<ProvisionResult> {
  const admin = createSupabaseAdminClient();
  const mustChange =
    input.mustChangePassword !== undefined ? input.mustChangePassword : false;

  const { data: created, error: createErr } =
    await admin.auth.admin.createUser({
      email: input.email,
      password: input.password,
      email_confirm: true,
      user_metadata: {
        role: input.role,
        must_change_password: mustChange,
        ...(input.userMetadata ?? {}),
      },
      app_metadata: {
        role: input.role,
        ...(input.appMetadata ?? {}),
      },
    });

  if (createErr || !created.user) {
    const msg = createErr?.message ?? "no user returned";
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
    throw new Error(
      `${tag} failed AND rollback failed. auth_user_id=${authUserId} ` +
        `original="${originalMsg}" rollback="${rollbackMsg}"`
    );
  }
}
