/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { NextRequest } from "next/server";
import { requireServerRole } from "@/lib/auth/session";
import { listSnapshots, createSnapshot } from "@/lib/super/snapshots";
import { AppError } from "@/lib/api/errors";
import { ok, withApiHandler } from "@/lib/api/response";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export const GET = withApiHandler(async () => {
  await requireServerRole(["super-admin"]);
  return ok({ snapshots: await listSnapshots() });
});

export const POST = withApiHandler(async (req: NextRequest) => {
  const session = await requireServerRole(["super-admin"]);
  const body = await req.json();
  const result = await createSnapshot(
    body.label ?? "Manual snapshot",
    session.authUserId
  );
  if (!result.success) {
    throw AppError.validation(result.error ?? "Snapshot failed");
  }
  return ok({ success: true, id: result.id }, { status: 201 });
});
