/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { NextRequest } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requireServerSession } from "@/lib/auth/session";
import { AppError } from "@/lib/api/errors";
import { ok, withApiHandler } from "@/lib/api/response";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export const POST = withApiHandler(async (request: NextRequest) => {
  await requireServerSession();

  const body = await request.json();
  const currentPassword = String(body.currentPassword ?? "");
  const newPassword = String(body.newPassword ?? "");

  if (!currentPassword || !newPassword) {
    throw AppError.validation("Current password and new password are required.");
  }
  if (newPassword.length < 8) {
    throw AppError.validation("New password must be at least 8 characters.");
  }
  if (currentPassword === newPassword) {
    throw AppError.validation(
      "New password must be different from the current password."
    );
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: userErr,
  } = await supabase.auth.getUser();

  if (userErr || !user?.email) {
    throw AppError.internal("Could not identify current user.");
  }

  const { error: verifyErr } = await supabase.auth.signInWithPassword({
    email: user.email,
    password: currentPassword,
  });
  if (verifyErr) {
    throw AppError.unauthenticated("Current password is incorrect.");
  }

  const { error: updateErr } = await supabase.auth.updateUser({
    password: newPassword,
  });
  if (updateErr) {
    throw AppError.internal(`Could not update password: ${updateErr.message}`);
  }

  return ok({ success: true });
});
