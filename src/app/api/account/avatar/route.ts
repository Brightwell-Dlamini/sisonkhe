/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * POST   /api/account/avatar  → upload and set the current user's avatar
 * DELETE /api/account/avatar  → clear the current user's avatar
 *
 * Multipart form:
 *   file (required on POST): image/jpeg|png|webp|gif, max 5 MB
 */

import { NextRequest, NextResponse } from "next/server";
import { requireServerSession } from "@/lib/auth/session";
import { primaryEntityId } from "@/lib/auth/roles";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { updateMyAvatar } from "@/lib/account/avatar";

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

export async function POST(request: NextRequest) {
  try {
    const session = await requireServerSession();

    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "file field is required" }, { status: 400 });
    }
    if (file.size > MAX_BYTES) {
      return NextResponse.json(
        { error: `File exceeds 5 MB limit (${Math.round(file.size / 1024)} KB)` },
        { status: 413 }
      );
    }
    if (!ALLOWED_TYPES.has(file.type)) {
      return NextResponse.json(
        { error: "Only JPEG, PNG, WebP or GIF images are allowed." },
        { status: 400 }
      );
    }

    const ext = pickExt(file);
    const ownerId = primaryEntityId(session).replace(/[^a-zA-Z0-9_-]/g, "");
    const path = `avatars/${ownerId}/${Date.now()}.${ext}`;
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
      return NextResponse.json(
        {
          error:
            `Upload failed: ${uploadErr.message}. ` +
            `Ensure a public Storage bucket named "${BUCKET}" exists.`,
        },
        { status: 500 }
      );
    }

    const { data: urlData } = admin.storage.from(BUCKET).getPublicUrl(path);
    // Cache-bust — the same path may be overwritten by a later upload
    const publicUrl = `${urlData.publicUrl}?v=${Date.now()}`;

    const write = await updateMyAvatar(session, publicUrl);
    if (!write.success) {
      return NextResponse.json({ error: write.error }, { status: 500 });
    }

    return NextResponse.json({ success: true, url: publicUrl, path });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    const status =
      msg === "UNAUTHENTICATED" ? 401 : msg === "FORBIDDEN" ? 403 : 500;
    if (status === 500) console.error("[api/account/avatar] error:", err);
    return NextResponse.json({ error: msg }, { status });
  }
}

export async function DELETE() {
  try {
    const session = await requireServerSession();
    const write = await updateMyAvatar(session, null);
    if (!write.success) {
      return NextResponse.json({ error: write.error }, { status: 500 });
    }
    return NextResponse.json({ success: true, url: null });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    const status =
      msg === "UNAUTHENTICATED" ? 401 : msg === "FORBIDDEN" ? 403 : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}

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
