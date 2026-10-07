/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Authenticated user changes password and clears must_change_password.
 */

import type { NextRequest } from "next/server";
import {
  createSupabaseAdminClient,
  createSupabaseServerClient,
} from "@/lib/supabase/server";
import { requireServerSession } from "@/lib/auth/session";
import { rateLimitAsync } from "@/lib/domain/rateLimit";
import { AppError } from "@/lib/api/errors";
import { ok, withApiHandler } from "@/lib/api/response";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export const POST = withApiHandler(async (request: NextRequest) => {
  const session = await requireServerSession();

  const rl = await rateLimitAsync(`pwd:${session.authUserId}`, 5, 15 * 60_000);
  if (!rl.ok) {
    throw new AppError("RATE_LIMITED", "Too many password changes. Try later.", {
      details: { retryAfterSec: rl.retryAfterSec },
    });
  }

  const body = await request.json();
  const currentPassword = String(body.currentPassword ?? "");
  const newPassword = String(body.newPassword ?? "");

  if (newPassword.length < 8) {
    throw AppError.validation("New password must be at least 8 characters.");
  }
  if (currentPassword === newPassword) {
    throw AppError.validation("New password must differ from the current one.");
  }

  const admin = createSupabaseAdminClient();
  const { data: userData, error: getErr } =
    await admin.auth.admin.getUserById(session.authUserId);

  if (getErr || !userData.user?.email) {
    throw AppError.internal("Could not load account.");
  }

  const supabase = await createSupabaseServerClient();
  const { error: verifyErr } = await supabase.auth.signInWithPassword({
    email: userData.user.email,
    password: currentPassword,
  });
  if (verifyErr) {
    throw AppError.unauthenticated("Current password is incorrect.");
  }

  const { error: updErr } = await admin.auth.admin.updateUserById(
    session.authUserId,
    {
      password: newPassword,
      user_metadata: {
        ...(userData.user.user_metadata ?? {}),
        must_change_password: false,
      },
    }
  );

  if (updErr) throw AppError.internal(updErr.message);

  return ok({ success: true, mustChangePassword: false });
});
