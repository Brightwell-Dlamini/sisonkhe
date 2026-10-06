/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * POST — admin issues login for an existing unclaimed marshal (claim-style).
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { requireServerRole } from "@/lib/auth/session";
import { claimUsername, isUsernameTaken } from "@/lib/domain/usernames";
import { writeAudit } from "@/lib/domain/audit";
import { generateTempPassword } from "@/lib/drivers/generators";

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
    const { data: marshal, error } = await admin
      .from("marshals")
      .select("id, first_name, surname, auth_user_id, id_number, cell_no")
      .eq("id", id)
      .maybeSingle();

    if (error || !marshal) {
      return NextResponse.json({ error: "Marshal not found" }, { status: 404 });
    }

    if (marshal.auth_user_id) {
      return NextResponse.json(
        { error: "This marshal already has a login account." },
        { status: 409 }
      );
    }

    const fullName = `${marshal.first_name ?? ""} ${marshal.surname ?? ""}`.trim();
    const username =
      parsed.data.username ||
      fullName
        .toLowerCase()
        .replace(/[^a-z\s]/g, "")
        .replace(/\s+/g, ".")
        .slice(0, 28) ||
      `marshal.${id.slice(-6)}`;

    if (await isUsernameTaken(admin, username)) {
      return NextResponse.json(
        { error: "Username already taken. Choose another." },
        { status: 409 }
      );
    }

    const password = parsed.data.password || generateTempPassword();
    const syntheticEmail = `${id}@marshal.sisonkhe.local`;

    const { data: created, error: createErr } =
      await admin.auth.admin.createUser({
        email: syntheticEmail,
        password,
        email_confirm: true,
        user_metadata: {
          username,
          full_name: fullName,
          role: "marshal",
          marshal_id: id,
          must_change_password: !parsed.data.password,
        },
        app_metadata: { role: "marshal" },
      });

    if (createErr || !created.user) {
      return NextResponse.json(
        { error: createErr?.message ?? "Could not create auth user" },
        { status: 500 }
      );
    }

    const { error: linkErr } = await admin
      .from("marshals")
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

    await claimUsername(admin, username, created.user.id, "marshal");

    await writeAudit(admin, {
      action: "staff.create",
      actorId: session.authUserId,
      actorRole: session.role,
      actorName: session.fullName,
      entityType: "marshal",
      entityId: id,
      summary: `Issued login for marshal ${fullName}`,
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
