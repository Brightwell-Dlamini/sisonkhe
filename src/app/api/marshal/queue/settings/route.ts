/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Queue settings for marshal. Defaults until system_settings table lands.
 */

import type { NextRequest } from "next/server";
import { requireServerRole } from "@/lib/auth/session";
import { getMarshalContext } from "@/lib/marshal/queries";
import { AppError } from "@/lib/api/errors";
import { ok, withApiHandler } from "@/lib/api/response";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const DEFAULTS = {
  moveLoadingToBottom: true,
  rankFee: 25,
  splitOperational: 20,
  splitNRTC: 3.5,
  splitMaintenance: 1.5,
} as const;

export const GET = withApiHandler(async () => {
  const session = await requireServerRole(["marshal"]);
  const ctx = await getMarshalContext(session.authUserId);
  if (!ctx) throw AppError.notFound("Marshal context");
  return ok({ ...DEFAULTS });
});

export const POST = withApiHandler(async (request: NextRequest) => {
  await requireServerRole(["marshal"]);
  const body = await request.json();
  // Client-side persistence for now; no-op server store until system_settings.
  return ok({ success: true, settings: body });
});
