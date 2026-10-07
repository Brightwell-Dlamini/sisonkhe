/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * POST /api/upload — multipart image → Supabase Storage.
 */

import type { NextRequest } from "next/server";
import { randomBytes } from "crypto";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { requireServerSession } from "@/lib/auth/session";
import { AppError } from "@/lib/api/errors";
import { ok, withApiHandler } from "@/lib/api/response";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED_FOLDERS = new Set([
  "drivers",
  "operators",
  "adverts",
  "vehicles",
  "general",
]);
const BUCKET_CANDIDATES = ["media", "driver-photos", "uploads"] as const;

export const POST = withApiHandler(async (request: NextRequest) => {
  const session = await requireServerSession();

  const formData = await request.formData();
  const file = formData.get("file") as File | null;
  const folderRaw = String(formData.get("folder") || "general").toLowerCase();
  const folder = ALLOWED_FOLDERS.has(folderRaw) ? folderRaw : "general";

  if (!file) throw AppError.validation("file field is required");
  if (file.size > MAX_BYTES) {
    throw AppError.validation(
      `File exceeds 5MB limit (${Math.round(file.size / 1024)} KB)`
    );
  }
  if (!file.type.startsWith("image/")) {
    throw AppError.validation(
      "Only image files are allowed (jpeg, png, webp, gif)."
    );
  }

  const admin = createSupabaseAdminClient();
  const ext =
    (file.name.split(".").pop() || "jpg")
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "") || "jpg";
  const safeUser = (session.authUserId || "anon").replace(
    /[^a-zA-Z0-9_-]/g,
    ""
  );
  const path = `${folder}/${safeUser}/${randomBytes(8).toString("hex")}.${ext}`;
  const arrayBuffer = await file.arrayBuffer();

  let lastError = "No storage bucket available";
  let publicUrl: string | null = null;
  let usedBucket: string | null = null;

  for (const bucket of BUCKET_CANDIDATES) {
    const { error: uploadErr } = await admin.storage
      .from(bucket)
      .upload(path, arrayBuffer, {
        contentType: file.type,
        upsert: true,
      });
    if (!uploadErr) {
      const { data: urlData } = admin.storage.from(bucket).getPublicUrl(path);
      publicUrl = urlData.publicUrl;
      usedBucket = bucket;
      break;
    }
    lastError = uploadErr.message;
  }

  if (!publicUrl) {
    console.error("[api/upload] all buckets failed:", lastError);
    throw AppError.internal(
      `Upload failed: ${lastError}. Create a public Storage bucket named "media" (or "driver-photos") in Supabase.`
    );
  }

  return ok({
    success: true,
    url: publicUrl,
    bucket: usedBucket,
    path,
  });
});
