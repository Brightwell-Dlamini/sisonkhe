/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Driver claim flow.
 *   PUT  — verify identity
 *   POST — create auth user, link to existing driver row
 */

import type { NextRequest } from "next/server";
import {
  createSupabaseAdminClient,
  createSupabaseServerClient,
} from "@/lib/supabase/server";
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
  const rl = await rateLimitAsync(
    `claim-driver:${clientIp(request)}`,
    15,
    15 * 60_000
  );
  if (!rl.ok) {
    throw new AppError("RATE_LIMITED", "Too many attempts. Try again later.", {
      details: { retryAfterSec: rl.retryAfterSec },
    });
  }

  const body = await request.json();
  const nationalId = String(body.nationalId ?? "").trim().replace(/\s+/g, "");
  const phone = String(body.phone ?? "").trim();

  if (!nationalId || !phone) {
    throw AppError.validation("National ID and phone number are required.");
  }

  const admin = createSupabaseAdminClient();
  const { data: driver } = await admin
    .from("drivers")
    .select("id, full_name, auth_user_id, status")
    .eq("national_id", nationalId)
    .eq("phone", phone)
    .maybeSingle();

  if (!driver) {
    throw AppError.notFound(
      "Driver with that National ID and phone number"
    );
  }

  if (driver.auth_user_id) {
    throw AppError.conflict(
      "This account has already been claimed. If you forgot your password, contact your supervisor to reset it."
    );
  }

  if (driver.status === "Suspended") {
    throw AppError.forbidden(
      "This driver profile is suspended. Contact your supervisor."
    );
  }

  return ok({
    verified: true,
    fullName: driver.full_name,
    driverId: driver.id,
  });
});

export const POST = withApiHandler(async (request: NextRequest) => {
  const rl = await rateLimitAsync(
    `claim-driver-post:${clientIp(request)}`,
    10,
    15 * 60_000
  );
  if (!rl.ok) {
    throw new AppError("RATE_LIMITED", "Too many attempts. Try again later.", {
      details: { retryAfterSec: rl.retryAfterSec },
    });
  }

  const body = await request.json();
  const nationalId = String(body.nationalId ?? "").trim().replace(/\s+/g, "");
  const phone = String(body.phone ?? "").trim();
  const username = String(body.username ?? "").trim().toLowerCase();
  const password = String(body.password ?? "");

  if (!nationalId || !phone || !username || !password) {
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

  const { data: driver } = await admin
    .from("drivers")
    .select("id, full_name, auth_user_id, status")
    .eq("national_id", nationalId)
    .eq("phone", phone)
    .maybeSingle();

  if (!driver) throw AppError.notFound("Identity match");
  if (driver.auth_user_id) {
    throw AppError.conflict("This account has already been claimed.");
  }
  if (driver.status === "Suspended") {
    throw AppError.forbidden("This driver profile is suspended.");
  }

  if (await isUsernameTaken(admin, username)) {
    throw AppError.conflict("That username is already taken. Please choose another.");
  }

  const driverId = driver.id as string;
  const syntheticEmail = `${driverId}@driver.sisonkhe.local`;

  const { authUserId } = await claimExistingRow({
    email: syntheticEmail,
    password,
    role: "driver",
    userMetadata: {
      username,
      full_name: driver.full_name,
      driver_id: driverId,
      must_change_password: false,
    },
    linkExistingRow: async (createdAuthUserId) => {
      const { data, error } = await admin
        .from("drivers")
        .update({
          auth_user_id: createdAuthUserId,
          claimed_at: new Date().toISOString(),
        })
        .eq("id", driverId)
        .is("auth_user_id", null)
        .select("id");

      if (error) {
        throw new Error(`driver link failed: ${error.message}`);
      }
      return Array.isArray(data) && data.length > 0;
    },
  });

  await claimUsername(admin, username, authUserId, "driver");

  await writeAudit(admin, {
    action: "driver.claim.success",
    actorId: authUserId,
    actorRole: "driver",
    entityType: "drivers",
    entityId: driverId,
    summary: `Driver ${driverId} claimed account`,
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
