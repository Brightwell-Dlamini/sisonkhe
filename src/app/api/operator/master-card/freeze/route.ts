/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * POST /api/operator/master-card/freeze — toggle Active ↔ Frozen.
 */

import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { requireServerRole } from "@/lib/auth/session";
import { AppError } from "@/lib/api/errors";
import { ok, withApiHandler } from "@/lib/api/response";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export const POST = withApiHandler(async () => {
  const session = await requireServerRole(["operator"]);
  if (!session.operatorId) throw AppError.forbidden("Operator profile required");

  const admin = createSupabaseAdminClient();
  const { data: card } = await admin
    .from("operator_master_cards")
    .select("id, status")
    .eq("operator_id", session.operatorId)
    .maybeSingle();

  if (!card) throw AppError.notFound("Master card");

  const nextStatus = card.status === "Active" ? "Frozen" : "Active";
  const { error } = await admin
    .from("operator_master_cards")
    .update({ status: nextStatus })
    .eq("id", card.id as string);

  if (error) throw AppError.internal(error.message);

  return ok({ success: true, status: nextStatus });
});
