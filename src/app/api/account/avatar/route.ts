/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * POST   /api/account/avatar  → upload avatar
 * DELETE /api/account/avatar  → clear avatar
 */

import type { NextRequest } from "next/server";
import { randomBytes } from "crypto";
import { requireServerSession } from "@/lib/auth/session";
import { primaryEntityId } from "@/lib/auth/roles";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { updateMyAvatar } from "@/lib/account/avatar";
import { AppError } from "@/lib/api/errors";
import { ok, withApiHandler } from "@/lib/api/response";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED_TYPES = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/gif",
]);
const BUCKET = "media";

function pickExt(file: File): string {
  const fromName = file.name.split(".").pop()?.toLowerCase();
  if (fromName && /^[a-z0-9]+$/.test(fromName)) return fromName;
  switch (file.type) {
    case "image/png":
      return "png";
    case "image/webp":
      return "webp";
    case "image/gif":
      return "gif";
    default:
      return "jpg";
  }
}

export const POST = withApiHandler(async (request: NextRequest) => {
  const session = await requireServerSession();

  const formData = await request.formData();
  const file = formData.get("file") as File | null;

  if (!file) throw AppError.validation("file field is required");
  if (file.size > MAX_BYTES) {
    throw AppError.validation(
      `File exceeds 5 MB limit (${Math.round(file.size / 1024)} KB)`
    );
  }
  if (!ALLOWED_TYPES.has(file.type)) {
    throw AppError.validation("Only JPEG, PNG, WebP or GIF images are allowed.");
  }

  const ext = pickExt(file);
  const ownerId = primaryEntityId(session).replace(/[^a-zA-Z0-9_-]/g, "");
  const path = `avatars/${ownerId}/${randomBytes(8).toString("hex")}.${ext}`;
  const arrayBuffer = await file.arrayBuffer();

  const admin = createSupabaseAdminClient();
  const { error: uploadErr } = await admin.storage
    .from(BUCKET)
    .upload(path, arrayBuffer, {
      contentType: file.type,
      upsert: true,
    });

  if (uploadErr) {
    console.error("[api/account/avatar] upload error:", uploadErr);
    throw AppError.internal(
      `Upload failed: ${uploadErr.message}. Ensure a public Storage bucket named "${BUCKET}" exists.`
    );
  }

  const { data: urlData } = admin.storage.from(BUCKET).getPublicUrl(path);
  const publicUrl = `${urlData.publicUrl}?v=${Date.now()}`;

  const write = await updateMyAvatar(session, publicUrl);
  if (!write.success) {
    const error = (write as { success: false; error: string }).error;
    throw AppError.internal(error ?? "Avatar write failed");
  }

  return ok({ success: true, url: publicUrl, path });
});

export const DELETE = withApiHandler(async () => {
  const session = await requireServerSession();
  const write = await updateMyAvatar(session, null);
  if (!write.success) {
    const error = (write as { success: false; error: string }).error;
    throw AppError.internal(error ?? "Avatar clear failed");
  }
  return ok({ success: true, url: null });
});
