/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Driver claim flow. Two phases, mirroring /api/auth/claim (marshals):
 *
 *   PUT  /api/auth/claim/driver  — verify identity (national ID + phone)
 *   POST /api/auth/claim/driver  — create auth user, link to existing row
 *
 * The driver row must already exist (via /api/register/driver).
 * The link is done by claimExistingRow, which sets claimed_at and
 * guarantees atomic rollback if the link fails.
 */

import { NextRequest, NextResponse } from "next/server";
import {
  createSupabaseAdminClient,
  createSupabaseServerClient,
} from "@/lib/supabase/server";
import { resolveUserRole } from "@/lib/auth/roles";
import { rateLimit } from "@/lib/domain/rateLimit";
import { isUsernameTaken, claimUsername } from "@/lib/domain/usernames";
import { writeAudit } from "@/lib/domain/audit";
import { claimExistingRow } from "@/lib/auth/provision";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function clientIp(request: NextRequest): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown"
  );
}

// ---------------------------------------------------------------------------
// PUT — verify identity
// ---------------------------------------------------------------------------

export async function PUT(request: NextRequest) {
  try {
    const rl = rateLimit(`claim-driver:${clientIp(request)}`, 15, 15 * 60_000);
    if (!rl.ok) {
      return NextResponse.json(
        { error: "Too many attempts. Try again later." },
        { status: 429 }
      );
    }

    const body = await request.json();
    const nationalId = String(body.nationalId ?? "").trim().replace(/\s+/g, "");
    const phone = String(body.phone ?? "").trim();

    if (!nationalId || !phone) {
      return NextResponse.json(
        { error: "National ID and phone number are required." },
        { status: 400 }
      );
    }

    const admin = createSupabaseAdminClient();
    const { data: driver } = await admin
      .from("drivers")
      .select("id, full_name, auth_user_id, status")
      .eq("national_id", nationalId)
      .eq("phone", phone)
      .maybeSingle();

    if (!driver) {
      return NextResponse.json(
        {
          error:
            "No driver found with that National ID and phone number. Register first at /register/driver.",
        },
        { status: 404 }
      );
    }

    if (driver.auth_user_id) {
      return NextResponse.json(
        {
          error:
            "This account has already been claimed. If you forgot your password, contact your supervisor to reset it.",
        },
        { status: 409 }
      );
    }

    if (driver.status === "Suspended") {
      return NextResponse.json(
        { error: "This driver profile is suspended. Contact your supervisor." },
        { status: 403 }
      );
    }

    return NextResponse.json({
      verified: true,
      fullName: driver.full_name,
      driverId: driver.id,
    });
  } catch (err) {
    console.error("[api/auth/claim/driver] PUT error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// ---------------------------------------------------------------------------
// POST — claim
// ---------------------------------------------------------------------------

export async function POST(request: NextRequest) {
  try {
    const rl = rateLimit(
      `claim-driver-post:${clientIp(request)}`,
      10,
      15 * 60_000
    );
    if (!rl.ok) {
      return NextResponse.json(
        { error: "Too many attempts. Try again later." },
        { status: 429 }
      );
    }

    const body = await request.json();
    const nationalId = String(body.nationalId ?? "").trim().replace(/\s+/g, "");
    const phone = String(body.phone ?? "").trim();
    const username = String(body.username ?? "").trim().toLowerCase();
    const password = String(body.password ?? "");

    if (!nationalId || !phone || !username || !password) {
      return NextResponse.json(
        { error: "All fields are required." },
        { status: 400 }
      );
    }

    if (!/^[a-z0-9._]{3,32}$/.test(username)) {
      return NextResponse.json(
        {
          error:
            "Username must be 3-32 characters, lowercase letters, numbers, dots or underscores only.",
        },
        { status: 400 }
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters." },
        { status: 400 }
      );
    }

    const admin = createSupabaseAdminClient();

    const { data: driver } = await admin
      .from("drivers")
      .select("id, full_name, auth_user_id, status")
      .eq("national_id", nationalId)
      .eq("phone", phone)
      .maybeSingle();

    if (!driver) {
      return NextResponse.json(
        { error: "Identity verification failed." },
        { status: 404 }
      );
    }

    if (driver.auth_user_id) {
      return NextResponse.json(
        { error: "This account has already been claimed." },
        { status: 409 }
      );
    }

    if (driver.status === "Suspended") {
      return NextResponse.json(
        { error: "This driver profile is suspended." },
        { status: 403 }
      );
    }

    if (await isUsernameTaken(admin, username)) {
      return NextResponse.json(
        { error: "That username is already taken. Please choose another." },
        { status: 409 }
      );
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
        // Atomic link — only succeeds if the row still has no auth_user_id.
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
      action: "claim.success",
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
      return NextResponse.json({
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

    return NextResponse.json({
      success: true,
      signedIn: true,
      user: resolved,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    const status = message.toLowerCase().includes("already") ? 409 : 500;
    console.error("[api/auth/claim/driver] POST error:", err);
    return NextResponse.json({ error: message }, { status });
  }
}
