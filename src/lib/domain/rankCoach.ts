/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Rank Coach — pure decision layer for marshal live queue.
 * Answers: what should I do next, and why can't I do X?
 * No I/O. Safe for client + server.
 */

import { canDispatchLoad } from "./eligibility";
import {
  canMarshalTransition,
  type MarshalAction,
  type VehicleStatus,
  isVehicleStatus,
} from "./vehicleStatus";

export type RankCoachVehicle = {
  registrationNumber: string;
  status: string;
  currentQueuePosition: number;
  driverId: string | null;
  driverName: string | null;
  driverStatus?: string | null;
  driverPdpStatus?: string | null;
  driverPdpExpiry?: string | null;
  permitStatus?: string | null;
  permitExpiryDate?: string | null;
  cofExpiryDate?: string | null;
  insuranceExpiry?: string | null;
  roadworthinessExpiry?: string | null;
  printPending?: boolean;
  routeOrigin?: string | null;
  routeDestination?: string | null;
  seatingCapacity?: number;
};

export type RankCoach = {
  /** Single button the marshal should press */
  primary: MarshalAction | null;
  primaryLabel: string;
  primaryHint: string | null;
  /** Soft warnings (still allowed) */
  warnings: string[];
  /** Hard blockers (primary disabled) */
  blockReasons: string[];
  blocked: boolean;
  /** Extra actions still legal (delay, breakdown, etc.) */
  secondary: MarshalAction[];
  /** One-line coach for the rank */
  coachLine: string;
  isLead: boolean;
};

const PRIMARY_LABEL: Partial<Record<MarshalAction, string>> = {
  load: "Start loading",
  full_cabin: "Full cabin · depart",
  depart: "Depart",
  delay: "Mark delayed",
  breakdown: "Breakdown",
  reset_to_waiting: "Return to queue",
};

function statusOf(v: RankCoachVehicle): VehicleStatus {
  return isVehicleStatus(v.status) ? v.status : "Waiting";
}

function complianceBlocks(v: RankCoachVehicle): {
  reasons: string[];
  warnings: string[];
} {
  const gate = canDispatchLoad({
    hasDriver: !!v.driverId,
    driverStatus: v.driverStatus,
    driverPdpStatus: v.driverPdpStatus,
    driverPdpExpiry: v.driverPdpExpiry,
    permitStatus: v.permitStatus,
    permitExpiryDate: v.permitExpiryDate,
    cofExpiryDate: v.cofExpiryDate,
    insuranceExpiry: v.insuranceExpiry,
    roadworthinessExpiry: v.roadworthinessExpiry,
    vehicleStatus: v.status,
    printPending: !!v.printPending,
  });

  const reasons: string[] = [];
  const warnings: string[] = [];

  if (!gate.eligible && gate.reason) reasons.push(gate.reason);
  if (gate.warning) warnings.push(gate.warning);

  if (!v.driverId) {
    if (!reasons.some((r) => /driver/i.test(r))) {
      reasons.push("No driver assigned — cannot load at the rank.");
    }
  }

  return { reasons, warnings };
}

function legalActions(status: VehicleStatus): MarshalAction[] {
  const all: MarshalAction[] = [
    "load",
    "full_cabin",
    "depart",
    "delay",
    "breakdown",
    "reset_to_waiting",
  ];
  return all.filter((a) => canMarshalTransition(status, a).ok);
}

/**
 * Decide the next brilliant move for this kombi on the rank.
 */
export function rankCoach(v: RankCoachVehicle): RankCoach {
  const status = statusOf(v);
  const isLead = v.currentQueuePosition === 1;
  const legal = legalActions(status);
  const { reasons, warnings } = complianceBlocks(v);

  // Prefer one clear primary action by status
  let primary: MarshalAction | null = null;
  if (status === "Waiting" || status === "Delayed") {
    primary = "load";
  } else if (status === "Loading") {
    // One smart depart path — full cabin is the common rank gesture
    primary = "full_cabin";
  } else if (status === "Departed" || status === "Breakdown") {
    primary = "reset_to_waiting";
  }

  // If primary needs compliance and blocked, keep primary but flag blocked
  const needsCompliance =
    primary === "load" || primary === "full_cabin" || primary === "depart";
  const blocked = needsCompliance && reasons.length > 0;

  const secondary = legal.filter((a) => a !== primary);
  // On Loading, keep plain depart as secondary only if not blocked
  if (status === "Loading" && !blocked) {
    // full_cabin is primary; depart stays secondary
  }

  let primaryLabel = primary ? PRIMARY_LABEL[primary] ?? primary : "No action";
  let primaryHint: string | null = null;

  if (primary === "full_cabin") {
    primaryHint = "Records rank fee · marks departed";
  } else if (primary === "load" && isLead) {
    primaryHint = "You are lead — start boarding";
  } else if (primary === "load") {
    primaryHint = "Move into loading bay";
  }

  // Coach line — plain English for the rank
  let coachLine: string;
  const plate = v.registrationNumber;
  const route =
    v.routeOrigin && v.routeDestination
      ? `${v.routeOrigin} to ${v.routeDestination}`
      : null;

  if (blocked) {
    coachLine = reasons[0] ?? `${plate} cannot be dispatched.`;
  } else if (status === "Loading" && isLead) {
    coachLine = route
      ? `Lead is loading for ${route}. When full, depart.`
      : "Lead is loading. When full, depart.";
  } else if (status === "Loading") {
    coachLine = "Boarding in progress. Depart when ready.";
  } else if (status === "Waiting" && isLead) {
    coachLine = v.driverName
      ? `Lead is ready — ${v.driverName} can start loading.`
      : "Lead is next — assign a driver, then load.";
  } else if (status === "Waiting") {
    coachLine = isLead
      ? "Next up on rank."
      : `#${v.currentQueuePosition || "—"} waiting.`;
  } else if (status === "Delayed") {
    coachLine = "Delayed — clear the hold, then load.";
  } else if (status === "Departed") {
    coachLine = "Already departed. Return to queue when back at rank.";
  } else if (status === "Breakdown") {
    coachLine = "Out of service — return to queue after repair.";
  } else {
    coachLine = `${plate} · ${status}`;
  }

  if (!blocked && warnings.length > 0) {
    coachLine = `${coachLine} · ${warnings[0]}`;
  }

  return {
    primary,
    primaryLabel,
    primaryHint,
    warnings,
    blockReasons: reasons,
    blocked,
    secondary,
    coachLine,
    isLead,
  };
}

/** Sort hint: lead first (already by position), then blocked last within same band. */
export function coachSortKey(v: RankCoachVehicle): number {
  const pos = v.currentQueuePosition > 0 ? v.currentQueuePosition : 9999;
  const coach = rankCoach(v);
  const blockBump = coach.blocked ? 0.5 : 0;
  return pos + blockBump;
}
