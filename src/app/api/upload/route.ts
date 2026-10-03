/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * POST /api/upload — multipart image upload to Supabase Storage.
 * Form fields: file (required), folder (optional: drivers|operators|adverts|vehicles|general)
 */

import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { getServerSession } from "@/lib/auth/session";

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

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: "UNAUTHENTICATED" }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const folderRaw = String(formData.get("folder") || "general").toLowerCase();
    const folder = ALLOWED_FOLDERS.has(folderRaw) ? folderRaw : "general";

    if (!file) {
      return NextResponse.json({ error: "file field is required" }, { status: 400 });
    }
    if (file.size > MAX_BYTES) {
      return NextResponse.json(
        { error: `File exceeds 5MB limit (${Math.round(file.size / 1024)} KB)` },
        { status: 413 }
      );
    }
    if (!file.type.startsWith("image/")) {
      return NextResponse.json(
        { error: "Only image files are allowed (jpeg, png, webp, gif)." },
        { status: 400 }
      );
    }

    const admin = createSupabaseAdminClient();
    const ext =
      (file.name.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "") ||
      "jpg";
    const safeUser = (session.authUserId || "anon").replace(/[^a-zA-Z0-9_-]/g, "");
    const path = `${folder}/${safeUser}/${Date.now()}.${ext}`;
    const arrayBuffer = await file.arrayBuffer();

    let lastError = "No storage bucket available";
    let publicUrl: string | null = null;
    let usedBucket: string | null = null;

    for (const bucket of BUCKET_CANDIDATES) {
      const { error: uploadErr } = await admin.storage.from(bucket).upload(path, arrayBuffer, {
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
      return NextResponse.json(
        {
          error: `Upload failed: ${lastError}. Create a public Storage bucket named "media" (or "driver-photos") in Supabase.`,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      url: publicUrl,
      bucket: usedBucket,
      path,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[api/upload] error:", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
