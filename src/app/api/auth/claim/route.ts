/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Marshal claim flow.
 *   PUT  — verify identity
 *   POST — create auth user, link to existing marshal row
 */

import type { NextRequest } from "next/server";
import {
  createSupabaseAdminClient,
  createSupabaseServerClient,
} from "@/lib/supabase/server";
import { looseAdmin, rpcRow } from "@/lib/supabase/rpc";
import { resolveUserRole } from "@/lib/auth/roles";
import { rateLimitAsync } from "@/lib/domain/rateLimit";
import { isUsernameTaken, claimUsername } from "@/lib/domain/usernames";
import { writeAudit } from "@/lib/domain/audit";
import { claimExistingRow } from "@/lib/auth/provision";
import { AppError } from "@/lib/api/errors";
import { ok, withApiHandler } from "@/lib/api/response";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function clientIp(request: NextRequest): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown"
  );
}

export const PUT = withApiHandler(async (request: NextRequest) => {
  const rl = await rateLimitAsync(`claim:${clientIp(request)}`, 15, 15 * 60_000);
  if (!rl.ok) {
    throw new AppError("RATE_LIMITED", "Too many attempts. Try again later.", {
      details: { retryAfterSec: rl.retryAfterSec },
    });
  }

  const body = await request.json();
  const idNumber = String(body.idNumber ?? "").trim().replace(/\s+/g, "");
  const phone = String(body.phone ?? "").trim();

  if (!idNumber || !phone) {
    throw AppError.validation("National ID and phone number are required.");
  }

  const admin = createSupabaseAdminClient();
  const { data, error } = await looseAdmin(admin).rpc("verify_marshal_identity", {
    p_id_number: idNumber,
    p_phone: phone,
  });

  if (error) {
    console.error("[claim] verify_marshal_identity error:", error);
    throw AppError.internal("Verification service unavailable.");
  }

  const row = rpcRow<{
    already_claimed?: boolean;
    full_name?: string;
    marshal_id?: string;
  }>(data);

  if (!row) {
    throw AppError.notFound(
      "Marshal with that National ID and phone number"
    );
  }

  if (row.already_claimed) {
    throw AppError.conflict(
      "This account has already been claimed. If you forgot your password, contact your supervisor to reset it."
    );
  }

  return ok({
    verified: true,
    fullName: row.full_name,
    marshalId: row.marshal_id,
  });
});

export const POST = withApiHandler(async (request: NextRequest) => {
  const rl = await rateLimitAsync(
    `claim-post:${clientIp(request)}`,
    10,
    15 * 60_000
  );
  if (!rl.ok) {
    throw new AppError("RATE_LIMITED", "Too many attempts. Try again later.", {
      details: { retryAfterSec: rl.retryAfterSec },
    });
  }

  const body = await request.json();
  const idNumber = String(body.idNumber ?? "").trim().replace(/\s+/g, "");
  const phone = String(body.phone ?? "").trim();
  const username = String(body.username ?? "").trim().toLowerCase();
  const password = String(body.password ?? "");

  if (!idNumber || !phone || !username || !password) {
    throw AppError.validation("All fields are required.");
  }

  if (!/^[a-z0-9._]{3,32}$/.test(username)) {
    throw AppError.validation(
      "Username must be 3-32 characters, lowercase letters, numbers, dots or underscores only."
    );
  }

  if (password.length < 8) {
    throw AppError.validation("Password must be at least 8 characters.");
  }

  const admin = createSupabaseAdminClient();
  const loose = looseAdmin(admin);

  const { data: verifyData, error: verifyErr } = await loose.rpc(
    "verify_marshal_identity",
    { p_id_number: idNumber, p_phone: phone }
  );

  if (verifyErr) {
    throw AppError.internal("Verification service unavailable.");
  }

  const match = rpcRow<{
    already_claimed?: boolean;
    full_name?: string;
    marshal_id: string;
  }>(verifyData);

  if (!match) throw AppError.notFound("Identity match");
  if (match.already_claimed) {
    throw AppError.conflict("This account has already been claimed.");
  }

  if (await isUsernameTaken(admin, username)) {
    throw AppError.conflict("That username is already taken. Please choose another.");
  }

  const marshalId = match.marshal_id;
  const syntheticEmail = `${marshalId}@marshal.sisonkhe.local`;

  const { authUserId } = await claimExistingRow({
    email: syntheticEmail,
    password,
    role: "marshal",
    userMetadata: {
      username,
      full_name: match.full_name,
      marshal_id: marshalId,
      must_change_password: false,
    },
    linkExistingRow: async (createdAuthUserId) => {
      const { data, error } = await loose.rpc("link_marshal_auth", {
        p_id_number: idNumber,
        p_phone: phone,
        p_auth_user_id: createdAuthUserId,
      });
      if (error) {
        throw new Error(`link_marshal_auth failed: ${error.message}`);
      }
      return data === true;
    },
  });

  await claimUsername(admin, username, authUserId, "marshal");

  await writeAudit(admin, {
    action: "marshal.claim.success",
    actorId: authUserId,
    actorRole: "marshal",
    entityType: "marshals",
    entityId: marshalId,
    summary: `Marshal ${marshalId} claimed account`,
  });

  const supabase = await createSupabaseServerClient();
  const { data: signIn, error: signInErr } =
    await supabase.auth.signInWithPassword({
      email: syntheticEmail,
      password,
    });

  if (signInErr || !signIn.user) {
    return ok({
      success: true,
      signedIn: false,
      message:
        "Account created. Please sign in at the login page with your new credentials.",
    });
  }

  const resolved = await resolveUserRole(
    signIn.user.id,
    signIn.user.email ?? null,
    signIn.user.phone ?? null
  );

  return ok({
    success: true,
    signedIn: true,
    user: resolved,
  });
});
