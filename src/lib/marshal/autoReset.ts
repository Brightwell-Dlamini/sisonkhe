/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Soft auto-reset: Departed vehicles older than policy return to Waiting
 * when a marshal loads their board (best-effort, non-blocking).
 */

import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { shouldAutoResetDeparted } from "@/lib/domain/compliance";

export async function autoResetStaleDeparted(
  admin: SupabaseClient,
  vehicleRegs: string[]
): Promise<number> {
  if (vehicleRegs.length === 0) return 0;
  let reset = 0;

  const { data } = await admin
    .from("vehicles")
    .select("registration_number, status, updated_at")
    .in("registration_number", vehicleRegs)
    .eq("status", "Departed");

  for (const row of data ?? []) {
    if (
      shouldAutoResetDeparted(
        row.status as string,
        row.updated_at as string | null
      )
    ) {
      const { error } = await admin
        .from("vehicles")
        .update({
          status: "Waiting",
          current_queue_position: 0,
          updated_at: new Date().toISOString(),
        })
        .eq("registration_number", row.registration_number as string)
        .eq("status", "Departed");
      if (!error) reset += 1;
    }
  }

  return reset;
}
