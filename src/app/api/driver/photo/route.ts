/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * POST /api/driver/photo
 * Multipart form-data upload of driver profile picture.
 */

import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { getServerSession } from "@/lib/auth/session";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const MAX_BYTES = 2 * 1024 * 1024; // 2 MB

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session || session.role !== "driver") {
      return NextResponse.json({ error: "Driver only" }, { status: 403 });
    }

    const formData = await request.formData();
    const file = formData.get("photo") as File | null;

    if (!file) {
      return NextResponse.json({ error: "photo field required" }, { status: 400 });
    }

    if (file.size > MAX_BYTES) {
      return NextResponse.json(
        { error: `File exceeds 2MB (${file.size} bytes)` },
        { status: 413 }
      );
    }

    if (!file.type.startsWith("image/")) {
      return NextResponse.json({ error: "Not an image" }, { status: 400 });
    }

    const admin = createSupabaseAdminClient();

    // Path: {authUserId}/{timestamp}.ext
    const ext = file.name.split(".").pop() ?? "jpg";
    const filename = `${session.authUserId}/${Date.now()}.${ext}`;

    const arrayBuffer = await file.arrayBuffer();
    const { error: uploadErr } = await admin.storage
      .from("driver-photos")
      .upload(filename, arrayBuffer, {
        contentType: file.type,
        upsert: true,
      });

    if (uploadErr) {
      console.error("[api/driver/photo] upload error:", uploadErr);
      return NextResponse.json(
        { error: uploadErr.message },
        { status: 500 }
      );
    }

    // Get public URL
    const { data: urlData } = admin.storage
      .from("driver-photos")
      .getPublicUrl(filename);

    const publicUrl = urlData.publicUrl;

    // Update driver row
    const { error: updateErr } = await admin
      .from("drivers")
      .update({ profile_picture_url: publicUrl })
      .eq("auth_user_id", session.authUserId);

    if (updateErr) {
      return NextResponse.json({ error: updateErr.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, url: publicUrl });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[api/driver/photo] error:", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
