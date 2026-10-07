/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { NextRequest } from "next/server";
import { requireServerRole } from "@/lib/auth/session";
import {
  listRegionConfigs,
  listTerminals,
  createTerminal,
} from "@/lib/admin/terminals";
import { AppError } from "@/lib/api/errors";
import { ok, withApiHandler } from "@/lib/api/response";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export const GET = withApiHandler(async () => {
  await requireServerRole(["super-admin", "admin", "fleet-manager"]);
  const [terminals, terminalRecords] = await Promise.all([
    listRegionConfigs(),
    listTerminals(),
  ]);
  return ok({ terminals, terminalRecords });
});

export const POST = withApiHandler(async (request: NextRequest) => {
  await requireServerRole(["super-admin", "admin", "fleet-manager"]);
  const body = await request.json();
  const name = String(body.name ?? "").trim();
  const region = String(body.region ?? "").trim();
  if (!name || !region) {
    throw AppError.validation("Name and region are required.");
  }
  const result = await createTerminal({
    region,
    name,
    emergencyNumber: body.emergencyNumber ?? null,
    announcement: body.announcement ?? null,
  });
  if (!result.success) {
    throw AppError.validation(result.error ?? "Create failed");
  }
  return ok({ terminal: result.terminal }, { status: 201 });
});
