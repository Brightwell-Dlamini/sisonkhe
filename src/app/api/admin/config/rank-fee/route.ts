/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { NextRequest } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { requirePermission } from "@/lib/auth/session";
import { getRankFeeConfig, setRankFeeConfig } from "@/lib/domain/rankFee";
import { writeAudit } from "@/lib/domain/audit";
import { AppError } from "@/lib/api/errors";
import { ok, withApiHandler } from "@/lib/api/response";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export const GET = withApiHandler(async () => {
  await requirePermission("admin.ops.view");
  const admin = createSupabaseAdminClient();
  const config = await getRankFeeConfig(admin);
  return ok(config);
});

export const PATCH = withApiHandler(async (request: NextRequest) => {
  const user = await requirePermission("admin.config");
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

  await writeAudit(admin, {
    action: "system.config_changed",
    actorId: user.authUserId,
    actorRole: user.role,
    actorName: user.fullName,
    entityType: "system_config",
    entityId: "rank_fee",
    summary: `Rank fee set to ${config.rankFee} SZL`,
    after: config as unknown as Record<string, unknown>,
  });

  return ok({ success: true, config });
});
