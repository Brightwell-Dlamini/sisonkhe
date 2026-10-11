/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * One-time claim links for admin-issued accounts.
 * Admin shares a URL; the user sets their own password.
 */

import "server-only";
import { createHash, randomBytes } from "crypto";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { getAppBaseUrl } from "@/lib/appUrl";

/** Default link lifetime */
export const CLAIM_TTL_HOURS = 72;

export type ClaimEntityType = "driver" | "marshal" | "operator" | "staff";

export type CreateClaimInput = {
  authUserId: string;
  username: string;
  role: string;
  entityType: ClaimEntityType;
  entityId?: string;
  createdBy?: string;
  /** Hours until expiry (default 72) */
  ttlHours?: number;
};

export type ClaimRecord = {
  id: string;
  authUserId: string;
  username: string;
  role: string;
  entityType: string;
  entityId: string | null;
  expiresAt: string;
  usedAt: string | null;
};

function hashToken(raw: string): string {
  return createHash("sha256").update(raw, "utf8").digest("hex");
}

/** URL-safe opaque token (~32 chars). */
export function generateClaimToken(): string {
  return randomBytes(24).toString("base64url");
}

export function buildClaimUrl(rawToken: string): string {
  return `${getAppBaseUrl()}/invite/${encodeURIComponent(rawToken)}`;
}

/** Opaque random password used only to invalidate the previous one. */
function randomOpaquePassword(): string {
  return randomBytes(24).toString("base64url") + "Aa1!";
}

/** Resolve display username for an auth user. */
export async function resolveUsernameForAuthUser(
  authUserId: string,
  fallback = "user"
): Promise<string> {
  const admin = createSupabaseAdminClient();
  try {
    const { data } = await admin
      .from("usernames")
      .select("username")
      .eq("auth_user_id", authUserId)
      .maybeSingle();
    if (data?.username) return String(data.username);
  } catch {
    /* table may differ */
  }
  try {
    const { data } = await admin.auth.admin.getUserById(authUserId);
    const meta = data.user?.user_metadata?.username;
    if (typeof meta === "string" && meta.trim()) return meta.trim();
    if (data.user?.email) return data.user.email;
  } catch {
    /* */
  }
  return fallback;
}

/**
 * Rotate password to a random value, force must_change, issue claim link.
 * Prefer returning claimUrl — do not show the opaque password to admins.
 */
export async function reissuePasswordViaClaim(input: {
  authUserId: string;
  role: string;
  entityType: ClaimEntityType;
  entityId?: string;
  createdBy?: string;
  usernameHint?: string;
}): Promise<{ claimUrl: string; expiresAt: string; username: string }> {
  const admin = createSupabaseAdminClient();
  const username =
    input.usernameHint?.trim() ||
    (await resolveUsernameForAuthUser(input.authUserId));

  const { data: userData } = await admin.auth.admin.getUserById(input.authUserId);
  const meta = userData?.user?.user_metadata ?? {};

  const { error: updateErr } = await admin.auth.admin.updateUserById(
    input.authUserId,
    {
      password: randomOpaquePassword(),
      user_metadata: {
        ...meta,
        must_change_password: true,
        password_reissued_at: new Date().toISOString(),
      },
    }
  );

  if (updateErr) {
    throw new Error(`reissuePasswordViaClaim: ${updateErr.message}`);
  }

  const claim = await createClaimLink({
    authUserId: input.authUserId,
    username,
    role: input.role,
    entityType: input.entityType,
    entityId: input.entityId,
    createdBy: input.createdBy,
  });

  return {
    claimUrl: claim.claimUrl,
    expiresAt: claim.expiresAt,
    username,
  };
}

/**
 * Insert a claim token. Returns the raw token (show once) and public URL.
 * Invalidates any unused prior tokens for the same auth user.
 */
export async function createClaimLink(input: CreateClaimInput): Promise<{
  rawToken: string;
  claimUrl: string;
  expiresAt: string;
}> {
  const admin = createSupabaseAdminClient();
  const rawToken = generateClaimToken();
  const tokenHash = hashToken(rawToken);
  const ttl = input.ttlHours ?? CLAIM_TTL_HOURS;
  const expiresAt = new Date(Date.now() + ttl * 60 * 60 * 1000).toISOString();

  // Expire any open tokens for this user (one active invite)
  await admin
    .from("login_claim_tokens")
    .update({ used_at: new Date().toISOString() })
    .eq("auth_user_id", input.authUserId)
    .is("used_at", null);

  const { error } = await admin.from("login_claim_tokens").insert({
    token_hash: tokenHash,
    auth_user_id: input.authUserId,
    username: input.username,
    role: input.role,
    entity_type: input.entityType,
    entity_id: input.entityId ?? null,
    expires_at: expiresAt,
    created_by: input.createdBy ?? null,
  });

  if (error) {
    throw new Error(`createClaimLink failed: ${error.message}`);
  }

  return {
    rawToken,
    claimUrl: buildClaimUrl(rawToken),
    expiresAt,
  };
}

/** Peek without consuming — for the invite page. */
export async function peekClaimToken(
  rawToken: string
): Promise<{ ok: true; record: ClaimRecord } | { ok: false; reason: string }> {
  if (!rawToken || rawToken.length < 16) {
    return { ok: false, reason: "Invalid link" };
  }

  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("login_claim_tokens")
    .select("*")
    .eq("token_hash", hashToken(rawToken))
    .maybeSingle();

  if (error || !data) {
    return { ok: false, reason: "This invite link is invalid or has been revoked." };
  }

  if (data.used_at) {
    return { ok: false, reason: "This invite link has already been used. Sign in instead." };
  }

  if (new Date(data.expires_at).getTime() < Date.now()) {
    return { ok: false, reason: "This invite link has expired. Ask your admin to issue a new one." };
  }

  return {
    ok: true,
    record: {
      id: data.id,
      authUserId: data.auth_user_id,
      username: data.username,
      role: data.role,
      entityType: data.entity_type,
      entityId: data.entity_id,
      expiresAt: data.expires_at,
      usedAt: data.used_at,
    },
  };
}

/**
 * Consume token: set password, clear must_change_password, mark used.
 * Returns auth email for sign-in.
 */
export async function consumeClaimToken(
  rawToken: string,
  newPassword: string
): Promise<
  | { ok: true; email: string; username: string; role: string; authUserId: string }
  | { ok: false; reason: string }
> {
  const peeked = await peekClaimToken(rawToken);
  if (!peeked.ok) return peeked;

  if (newPassword.length < 8) {
    return { ok: false, reason: "Password must be at least 8 characters." };
  }

  const admin = createSupabaseAdminClient();
  const { record } = peeked;

  const { data: userData, error: userErr } =
    await admin.auth.admin.getUserById(record.authUserId);
  if (userErr || !userData.user) {
    return { ok: false, reason: "Account not found. Contact your administrator." };
  }

  const email = userData.user.email;
  if (!email) {
    return { ok: false, reason: "Account is missing a login email." };
  }

  const { error: updateErr } = await admin.auth.admin.updateUserById(
    record.authUserId,
    {
      password: newPassword,
      user_metadata: {
        ...(userData.user.user_metadata ?? {}),
        must_change_password: false,
        claim_completed_at: new Date().toISOString(),
      },
    }
  );

  if (updateErr) {
    return { ok: false, reason: updateErr.message || "Could not set password." };
  }

  const { error: markErr } = await admin
    .from("login_claim_tokens")
    .update({ used_at: new Date().toISOString() })
    .eq("id", record.id)
    .is("used_at", null);

  if (markErr) {
    console.error("[claimLink] mark used failed:", markErr);
  }

  return {
    ok: true,
    email,
    username: record.username,
    role: record.role,
    authUserId: record.authUserId,
  };
}
