/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Auto-reset vehicles stuck in Departed beyond the soft policy window.
 */

import "server-only";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { shouldAutoResetDeparted } from "@/lib/domain/compliance";
import { writeAudit } from "@/lib/domain/audit";
import { looseAdmin } from "@/lib/supabase/rpc";

export interface DepartedResetResult {
  scanned: number;
  reset: number;
  vehicles: string[];
}

export async function autoResetStaleDeparted(opts?: {
  limit?: number;
}): Promise<DepartedResetResult> {
  const limit = opts?.limit ?? 100;
  const admin = createSupabaseAdminClient();
  const now = Date.now();

  const { data: rows, error } = await admin
    .from("vehicles")
    .select(
      "registration_number, status, updated_at, route_assignment_id, current_queue_position"
    )
    .eq("status", "Departed")
    .limit(limit);

  if (error) {
    throw new Error(`departed reset query failed: ${error.message}`);
  }

  const vehicles: string[] = [];

  for (const row of rows ?? []) {
    if (
      !shouldAutoResetDeparted(
        row.status as string,
        row.updated_at as string | null,
        now
      )
    ) {
      continue;
    }

    const reg = String(row.registration_number);
    const routeId = row.route_assignment_id as string | null;
    const pos = Number(row.current_queue_position ?? 0);

    const { data: updated } = await admin
      .from("vehicles")
      .update({
        status: "Waiting",
        current_queue_position: 0,
        updated_at: new Date().toISOString(),
      })
      .eq("registration_number", reg)
      .eq("status", "Departed")
      .select("registration_number")
      .maybeSingle();

    if (!updated) continue;

    if (routeId && pos > 0) {
      try {
        await looseAdmin(admin).rpc("shift_queue_forward", {
          p_route_id: routeId,
          p_from_position: pos,
        });
      } catch (err) {
        console.warn("[departedReset] shift_queue_forward failed:", err);
      }
    }

    vehicles.push(reg);
    await writeAudit(admin, {
      action: "vehicle.auto_reset_departed",
      actorId: "system",
      actorRole: "system",
      entityType: "vehicle",
      entityId: reg,
      summary: `Auto-reset ${reg} from Departed → Waiting after dwell policy`,
    });
  }

  return {
    scanned: rows?.length ?? 0,
    reset: vehicles.length,
    vehicles,
  };
}
