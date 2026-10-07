/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { NextRequest } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { requireServerRole } from "@/lib/auth/session";
import { getRankFeeConfig, setRankFeeConfig } from "@/lib/domain/rankFee";
import { AppError } from "@/lib/api/errors";
import { ok, withApiHandler } from "@/lib/api/response";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export const GET = withApiHandler(async () => {
  await requireServerRole(["super-admin", "admin", "fleet-manager"]);
  const admin = createSupabaseAdminClient();
  const config = await getRankFeeConfig(admin);
  return ok(config);
});

export const PATCH = withApiHandler(async (request: NextRequest) => {
  await requireServerRole(["super-admin"]);
  const body = await request.json();
  const config = {
    rankFee: Number(body.rankFee ?? 25),
    splitOperational: Number(body.splitOperational ?? 20),
    splitNRTC: Number(body.splitNRTC ?? 3.5),
    splitMaintenance: Number(body.splitMaintenance ?? 1.5),
  };
  const sum =
    config.splitOperational + config.splitNRTC + config.splitMaintenance;
  if (Math.abs(sum - config.rankFee) > 0.01) {
    throw AppError.validation(
      `Splits must sum to rank fee (got ${sum}, fee ${config.rankFee}).`
    );
  }
  const admin = createSupabaseAdminClient();
  await setRankFeeConfig(admin, config);
  return ok({ success: true, config });
});
