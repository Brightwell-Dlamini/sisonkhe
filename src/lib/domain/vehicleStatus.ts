/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * THE vehicle status vocabulary. One enum. One source of truth.
 *
 * Rules:
 *  - `vehicles.status` in the DB stores exactly one of these strings.
 *  - Marshal dispatch is the ONLY writer of `Loading | Departed | Delayed | Breakdown`.
 *  - Driver signals are requests; they never write status directly.
 *  - `Full` is NOT a vehicle status. It is a driver *signal* (see driverSignal.ts).
 *  - `Archived` is a terminal state. A vehicle that reaches it is retired
 *    from operation, but its history is preserved (append-only discipline).
 *    Archived vehicles are exempt from the operator-required constraint.
 */

export const VEHICLE_STATUSES = [
  "Waiting",
  "Loading",
  "Departed",
  "Delayed",
  "Breakdown",
  "Offline",
  "Archived",
] as const;

export type VehicleStatus = (typeof VEHICLE_STATUSES)[number];

export function isVehicleStatus(v: unknown): v is VehicleStatus {
  return typeof v === "string" && (VEHICLE_STATUSES as readonly string[]).includes(v);
}

/** Marshal-authored transitions. The state machine the rank obeys. */
export type MarshalAction =
  | "load"
  | "full_cabin"
  | "depart"
  | "delay"
  | "breakdown"
  | "reset_to_waiting";

const ALLOWED: Record<VehicleStatus, MarshalAction[]> = {
  Waiting: ["load", "delay", "breakdown"],
  Loading: ["full_cabin", "depart", "delay", "breakdown", "reset_to_waiting"],
  Delayed: ["load", "breakdown", "reset_to_waiting"],
  Departed: ["reset_to_waiting"],
  Breakdown: ["reset_to_waiting"],
  Offline: [],
  Archived: [],
};

export function canMarshalTransition(
  from: VehicleStatus,
  action: MarshalAction
): { ok: true } | { ok: false; reason: string } {
  const allowed = ALLOWED[from] ?? [];
  if (!allowed.includes(action)) {
    return {
      ok: false,
      reason: `Illegal transition: cannot "${action}" from status "${from}". Allowed: ${
        allowed.join(", ") || "none"
      }.`,
    };
  }
  return { ok: true };
}
