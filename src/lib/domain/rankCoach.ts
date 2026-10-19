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
  /** Vehicle virtual card (for rank-fee coach) */
  cardBalanceSzl?: number | null;
  cardStatus?: string | null;
  /** Rank fee amount in SZL (server config); defaults to 25 in coach if omitted */
  rankFeeSzl?: number | null;
};

export type RankCoach = {
  primary: MarshalAction | null;
  primaryLabel: string;
  primaryHint: string | null;
  warnings: string[];
  blockReasons: string[];
  blocked: boolean;
  secondary: MarshalAction[];
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

  // Rank fee payable from vehicle card before depart / full cabin (Loading only)
  const fee = Number(v.rankFeeSzl ?? 25);
  const cardBal = v.cardBalanceSzl;
  const cardSt = (v.cardStatus ?? "").trim();
  const status = (v.status ?? "").trim();
  const feeRelevant = status === "Loading";

  if (feeRelevant && fee > 0) {
    if (cardBal == null && !cardSt) {
      reasons.push(
        "No vehicle card — operator must issue and fund a card before depart."
      );
    } else if (
      cardSt === "Frozen" ||
      cardSt === "Suspended" ||
      cardSt === "Blocked" ||
      cardSt === "Closed" ||
      cardSt === "Expired"
    ) {
      reasons.push(
        `Vehicle card is ${cardSt} — operator must unfreeze before this kombi can depart.`
      );
    } else if (cardBal != null && Number(cardBal) + 1e-9 < fee) {
      reasons.push(
        `Card balance E${Number(cardBal).toFixed(2)} is short of rank fee E${fee.toFixed(2)} — operator must top up.`
      );
    } else if (cardBal != null && Number(cardBal) < fee * 2) {
      warnings.push(
        `Card balance E${Number(cardBal).toFixed(2)} — low after this trip.`
      );
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

export function rankCoach(v: RankCoachVehicle): RankCoach {
  const status = statusOf(v);
  const isLead = v.currentQueuePosition === 1;
  const legal = legalActions(status);
  const { reasons, warnings } = complianceBlocks(v);

  let primary: MarshalAction | null = null;
  if (status === "Waiting" || status === "Delayed") {
    primary = "load";
  } else if (status === "Loading") {
    primary = "full_cabin";
  } else if (status === "Departed" || status === "Breakdown") {
    primary = "reset_to_waiting";
  }

  const needsCompliance =
    primary === "load" || primary === "full_cabin" || primary === "depart";
  const blocked = needsCompliance && reasons.length > 0;

  const secondary = legal.filter((a) => a !== primary);

  let primaryLabel = primary ? PRIMARY_LABEL[primary] ?? primary : "No action";
  let primaryHint: string | null = null;

  if (primary === "full_cabin") {
    primaryHint = "Charges rank fee from vehicle card · departs";
  } else if (primary === "load" && isLead) {
    primaryHint = "You are lead — start boarding";
  } else if (primary === "load") {
    primaryHint = "Move into loading bay";
  }

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

export function coachSortKey(v: RankCoachVehicle): number {
  const pos = v.currentQueuePosition > 0 ? v.currentQueuePosition : 9999;
  const coach = rankCoach(v);
  const blockBump = coach.blocked ? 0.5 : 0;
  return pos + blockBump;
}
