/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Public invite (claim-link) endpoints.
 *   GET  — validate token, return username + expiry
 *   POST — set password, mark token used, sign in
 */

import type { NextRequest } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { resolveUserRole } from "@/lib/auth/roles";
import { peekClaimToken, consumeClaimToken } from "@/lib/auth/claimLink";
import { rateLimitAsync, clientIp } from "@/lib/domain/rateLimit";
import { AppError } from "@/lib/api/errors";
import { ok, withApiHandler } from "@/lib/api/response";
import { logEvent } from "@/lib/ops/telemetry";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type Ctx = { params: Promise<{ token: string }> };

export const GET = withApiHandler(async (request: NextRequest, ctx: Ctx) => {
  const rl = await rateLimitAsync(
    `invite-get:${clientIp(request)}`,
    30,
    15 * 60_000
  );
  if (!rl.ok) {
    throw new AppError("RATE_LIMITED", "Too many attempts. Try again later.", {
      details: { retryAfterSec: rl.retryAfterSec },
    });
  }

  const { token } = await ctx.params;
  const result = await peekClaimToken(decodeURIComponent(token));
  if (result.ok === false) {
    throw AppError.validation(result.reason);
  }

  return ok({
    valid: true,
    username: result.record.username,
    role: result.record.role,
    expiresAt: result.record.expiresAt,
  });
});

export const POST = withApiHandler(async (request: NextRequest, ctx: Ctx) => {
  const rl = await rateLimitAsync(
    `invite-post:${clientIp(request)}`,
    10,
    15 * 60_000
  );
  if (!rl.ok) {
    throw new AppError("RATE_LIMITED", "Too many attempts. Try again later.", {
      details: { retryAfterSec: rl.retryAfterSec },
    });
  }

  const { token } = await ctx.params;
  const body = await request.json().catch(() => ({}));
  const password = String((body as { password?: string }).password ?? "");
  const confirm = String(
    (body as { confirmPassword?: string }).confirmPassword ?? ""
  );

  if (password.length < 8) {
    throw AppError.validation("Password must be at least 8 characters.");
  }
  if (confirm && confirm !== password) {
    throw AppError.validation("Passwords do not match.");
  }

  const consumed = await consumeClaimToken(
    decodeURIComponent(token),
    password
  );
  if (consumed.ok === false) {
    throw AppError.validation(consumed.reason);
  }

  logEvent({
    event: "auth.invite.claimed",
    role: consumed.role,
    username: consumed.username,
  });

  const supabase = await createSupabaseServerClient();
  const { data: signIn, error: signInErr } =
    await supabase.auth.signInWithPassword({
      email: consumed.email,
      password,
    });

  if (signInErr || !signIn.user) {
    return ok({
      success: true,
      signedIn: false,
      username: consumed.username,
      message: "Password set. Please sign in with your username.",
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
    username: consumed.username,
    user: resolved,
  });
});
