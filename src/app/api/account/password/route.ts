/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Authenticated user changes their own password and clears must_change_password.
 */

import { NextRequest, NextResponse } from "next/server";
import {
  createSupabaseAdminClient,
  createSupabaseServerClient,
} from "@/lib/supabase/server";
import { getServerSession } from "@/lib/auth/session";
import { rateLimit } from "@/lib/domain/rateLimit";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: "UNAUTHENTICATED" }, { status: 401 });
    }

    const rl = rateLimit(`pwd:${session.authUserId}`, 5, 15 * 60_000);
    if (!rl.ok) {
      return NextResponse.json(
        { error: "Too many password changes. Try later." },
        { status: 429 }
      );
    }

    const body = await request.json();
    const currentPassword = String(body.currentPassword ?? "");
    const newPassword = String(body.newPassword ?? "");

    if (newPassword.length < 8) {
      return NextResponse.json(
        { error: "New password must be at least 8 characters." },
        { status: 400 }
      );
    }

    if (currentPassword === newPassword) {
      return NextResponse.json(
        { error: "New password must differ from the current one." },
        { status: 400 }
      );
    }

    const admin = createSupabaseAdminClient();
    const { data: userData, error: getErr } =
      await admin.auth.admin.getUserById(session.authUserId);

    if (getErr || !userData.user?.email) {
      return NextResponse.json(
        { error: "Could not load account." },
        { status: 500 }
      );
    }

    // Verify current password
    const supabase = await createSupabaseServerClient();
    const { error: verifyErr } = await supabase.auth.signInWithPassword({
      email: userData.user.email,
      password: currentPassword,
    });
    if (verifyErr) {
      return NextResponse.json(
        { error: "Current password is incorrect." },
        { status: 401 }
      );
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

    if (updErr) {
      return NextResponse.json(
        { error: updErr.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, mustChangePassword: false });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
