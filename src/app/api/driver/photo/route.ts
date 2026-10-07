/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * POST /api/driver/photo — multipart profile picture upload.
 */

import type { NextRequest } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { requireServerRole } from "@/lib/auth/session";
import { AppError } from "@/lib/api/errors";
import { ok, withApiHandler } from "@/lib/api/response";
import { randomBytes } from "crypto";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const MAX_BYTES = 2 * 1024 * 1024;

export const POST = withApiHandler(async (request: NextRequest) => {
  const session = await requireServerRole(["driver"]);

  const formData = await request.formData();
  const file = formData.get("photo") as File | null;
  if (!file) throw AppError.validation("photo field required");
  if (file.size > MAX_BYTES) {
    throw AppError.validation(`File exceeds 2MB (${file.size} bytes)`);
  }
  if (!file.type.startsWith("image/")) {
    throw AppError.validation("Not an image");
  }

  const admin = createSupabaseAdminClient();
  const ext = (file.name.split(".").pop() ?? "jpg").replace(/[^a-z0-9]/gi, "");
  const filename = `${session.authUserId}/${randomBytes(8).toString("hex")}.${ext || "jpg"}`;

  const arrayBuffer = await file.arrayBuffer();
  const { error: uploadErr } = await admin.storage
    .from("driver-photos")
    .upload(filename, arrayBuffer, {
      contentType: file.type,
      upsert: true,
    });

  if (uploadErr) {
    console.error("[api/driver/photo] upload error:", uploadErr);
    throw AppError.internal(uploadErr.message);
  }

  const { data: urlData } = admin.storage
    .from("driver-photos")
    .getPublicUrl(filename);

  const publicUrl = urlData.publicUrl;

  const { error: updateErr } = await admin
    .from("drivers")
    .update({ profile_picture_url: publicUrl })
    .eq("auth_user_id", session.authUserId);

  if (updateErr) throw AppError.internal(updateErr.message);

  return ok({ success: true, url: publicUrl });
});
