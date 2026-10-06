/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * POST — admin issues login for an existing unclaimed driver.
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { requireServerRole } from "@/lib/auth/session";
import { claimUsername, isUsernameTaken } from "@/lib/domain/usernames";
import { writeAudit } from "@/lib/domain/audit";
import {
  generateTempPassword,
  generateUsername,
} from "@/lib/drivers/generators";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const bodySchema = z.object({
  username: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^[a-z0-9._]{3,32}$/)
    .optional(),
  password: z.string().min(8).max(72).optional(),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireServerRole([
      "super-admin",
      "admin",
      "fleet-manager",
    ]);
    const { id } = await params;
    const parsed = bodySchema.safeParse(await request.json().catch(() => ({})));
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid body" }, { status: 400 });
    }

    const admin = createSupabaseAdminClient();
    const { data: driver, error } = await admin
      .from("drivers")
      .select("id, full_name, auth_user_id, national_id, phone")
      .eq("id", id)
      .maybeSingle();

    if (error || !driver) {
      return NextResponse.json({ error: "Driver not found" }, { status: 404 });
    }

    if (driver.auth_user_id) {
      return NextResponse.json(
        { error: "This driver already has a login account." },
        { status: 409 }
      );
    }

    const fullName = (driver.full_name as string) || "driver";
    let username = parsed.data.username;
    if (!username) {
      const taken = new Set<string>();
      try {
        const { data } = await admin.from("usernames").select("username").limit(5000);
        for (const r of data ?? []) {
          if (r.username) taken.add(String(r.username).toLowerCase());
        }
      } catch {
        /* */
      }
      username = generateUsername(fullName, taken).toLowerCase();
    }

    if (await isUsernameTaken(admin, username)) {
      return NextResponse.json(
        { error: "Username already taken." },
        { status: 409 }
      );
    }

    const password = parsed.data.password || generateTempPassword();
    const syntheticEmail = `${id}@driver.sisonkhe.local`;

    const { data: created, error: createErr } =
      await admin.auth.admin.createUser({
        email: syntheticEmail,
        password,
        email_confirm: true,
        user_metadata: {
          username,
          full_name: fullName,
          role: "driver",
          driver_id: id,
          must_change_password: !parsed.data.password,
        },
        app_metadata: { role: "driver" },
      });

    if (createErr || !created.user) {
      return NextResponse.json(
        { error: createErr?.message ?? "Could not create auth user" },
        { status: 500 }
      );
    }

    const { error: linkErr } = await admin
      .from("drivers")
      .update({ auth_user_id: created.user.id })
      .eq("id", id)
      .is("auth_user_id", null);

    if (linkErr) {
      await admin.auth.admin.deleteUser(created.user.id);
      return NextResponse.json(
        { error: `Could not link login: ${linkErr.message}` },
        { status: 500 }
      );
    }

    await claimUsername(admin, username, created.user.id, "driver");

    await writeAudit(admin, {
      action: "driver.update",
      actorId: session.authUserId,
      actorRole: session.role,
      actorName: session.fullName,
      entityType: "driver",
      entityId: id,
      summary: `Issued login for driver ${fullName}`,
    });

    return NextResponse.json({
      success: true,
      credentials: {
        username,
        password,
        mustChangePassword: !parsed.data.password,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    const status =
      message === "UNAUTHENTICATED"
        ? 401
        : message === "FORBIDDEN"
          ? 403
          : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
