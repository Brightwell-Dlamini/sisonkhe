/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Driver signals are *intents* — requests to the marshal, not state changes.
 *
 * A signal:
 *   - has a client-generated id (idempotency key)
 *   - is append-only in `driver_signals`
 *   - notifies the marshal
 *   - NEVER writes vehicles.status
 *
 * The marshal consumes signals; their state machine decides what happens.
 */

import "server-only";
import { createSupabaseAdminClient } from "../supabase/server";
import { notifyMarshal, getMarshalForRoute } from "../driver/notifications";

export const DRIVER_SIGNALS = [
  "ready",          // "I'm at the bay, ready to load"
  "loading",        // "Boarding started"
  "cabin_full",     // "Cabin full — request dispatch approval"
  "request_depart", // "Requesting permission to leave bay"
  "delayed",        // "Stuck in traffic / minor delay"
  "breakdown",      // "Mechanical issue"
  "back_at_rank",   // "Returned to terminal"
] as const;

export type DriverSignalKind = (typeof DRIVER_SIGNALS)[number];

const SIGNAL_COPY: Record<DriverSignalKind, string> = {
  ready: "Ready at bay — awaiting dispatch instructions.",
  loading: "Boarding passengers.",
  cabin_full: "Cabin is full — please approve dispatch.",
  request_depart: "Requesting permission to depart bay.",
  delayed: "Delayed — will advise ETA.",
  breakdown: "Mechanical issue — need assistance.",
  back_at_rank: "Arrived back at terminal.",
};

export interface EmitSignalInput {
  signalId: string;        // client-generated ULID, idempotency key
  kind: DriverSignalKind;
  driverId: string;
  driverName: string;
  vehicleReg: string;
  routeId: string | null;
  note?: string | null;
  occurredAt: string;      // client ISO timestamp (for offline replay)
}

export interface EmitSignalResult {
  ok: boolean;
  duplicate?: boolean;
  error?: string;
}

/**
 * Persist a driver signal and notify the assigned marshal.
 *
 * Idempotent: if `signalId` already exists, returns { ok: true, duplicate: true }.
 */
export async function emitDriverSignal(
  input: EmitSignalInput
): Promise<EmitSignalResult> {
  const admin = createSupabaseAdminClient();

  // Idempotency: bail if we've seen this signal before.
  const { data: existing } = await admin
    .from("driver_signals")
    .select("id")
    .eq("id", input.signalId)
    .maybeSingle();
  if (existing) return { ok: true, duplicate: true };

  const message = SIGNAL_COPY[input.kind];
  const note = input.note?.trim() ? ` — ${input.note.trim()}` : "";

  const { error: insertErr } = await admin.from("driver_signals").insert({
    id: input.signalId,
    driver_id: input.driverId,
    vehicle_reg: input.vehicleReg,
    route_id: input.routeId,
    kind: input.kind,
    note: input.note ?? null,
    occurred_at: input.occurredAt,
    status: "pending",
  });

  if (insertErr) {
    // Unique-violation race: treat as duplicate.
    if (insertErr.code === "23505") return { ok: true, duplicate: true };
    return { ok: false, error: insertErr.message };
  }

  // Notify the marshal on this route (best-effort — never fails the signal).
  if (input.routeId) {
    const marshal = await getMarshalForRoute(input.routeId);
    if (marshal) {
      await notifyMarshal(
        marshal.name,
        marshal.phone,
        input.driverName,
        input.vehicleReg,
        `${message}${note}`
      );
    }
  }

  return { ok: true };
}
