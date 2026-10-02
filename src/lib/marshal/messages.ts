/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Marshal ↔ driver messaging. Uses the notifications table as the transport.
 */

import "server-only";
import { createSupabaseAdminClient } from "../supabase/server";

export interface DriverMessage {
  id: string;
  timestamp: string;
  driverId: string;
  driverName: string;
  sender: "marshal" | "driver";
  message: string;
}

export async function listDriverMessages(
  marshalId: string,
  limit: number = 50
): Promise<DriverMessage[]> {
  const admin = createSupabaseAdminClient();

  // Fetch all notifications sent to or from this marshal's session.
  // The legacy system stored messages as notifications with a tagged prefix.
  const { data, error } = await admin
    .from("notifications")
    .select("id, timestamp, message, recipient_name, recipient_phone, type")
    .order("timestamp", { ascending: false })
    .limit(limit);

  if (error || !data) return [];

  return data.map((n) => ({
    id: n.id as string,
    timestamp: n.timestamp as string,
    driverId: "",
    driverName: n.recipient_name as string,
    sender: (n.type as string) === "Push" ? "marshal" : "driver",
    message: n.message as string,
  }));
}

export async function sendMessageToDriver(
  marshalName: string,
  driverName: string,
  driverPhone: string | null,
  message: string
): Promise<DriverMessage | null> {
  const admin = createSupabaseAdminClient();
  const id = `msg-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  const timestamp = new Date().toISOString();

  const { error } = await admin.from("notifications").insert({
    id,
    timestamp,
    type: "Push",
    recipient_name: driverName,
    recipient_phone: driverPhone,
    message: `[${marshalName}]: ${message}`,
    status: "Sent",
  });

  if (error) {
    console.error("[marshal/messages] insert failed:", error);
    return null;
  }

  return {
    id,
    timestamp,
    driverId: "",
    driverName,
    sender: "marshal",
    message,
  };
}
