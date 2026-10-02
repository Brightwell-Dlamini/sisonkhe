/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Driver → marshal notification helpers.
 */

import "server-only";
import { createSupabaseAdminClient } from "../supabase/server";

export async function notifyMarshal(
  marshalName: string,
  marshalPhone: string | null,
  driverName: string,
  vehicleReg: string,
  message: string
): Promise<boolean> {
  const admin = createSupabaseAdminClient();
  const id = `notif-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

  const { error } = await admin.from("notifications").insert({
    id,
    timestamp: new Date().toISOString(),
    type: "Push",
    recipient_name: marshalName,
    recipient_phone: marshalPhone,
    message: `[${driverName} • ${vehicleReg}] ${message}`,
    status: "Sent",
  });

  if (error) {
    console.error("[driver/notifications] insert failed:", error);
    return false;
  }
  return true;
}

export async function getMarshalForRoute(
  routeId: string
): Promise<{ name: string; phone: string | null; id: string } | null> {
  const admin = createSupabaseAdminClient();
  const { data } = await admin
    .from("marshals")
    .select("id, first_name, surname, phone, cell_no")
    .eq("assigned_route_id", routeId)
    .eq("is_active", true)
    .maybeSingle();

  if (!data) return null;
  return {
    id: data.id as string,
    name: `${data.first_name} ${data.surname}`.trim(),
    phone: ((data.phone ?? data.cell_no) as string | null) ?? null,
  };
}
