/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Consequence previews — the system shows what *will* happen before you click.
 * Pure functions; callers supply current entity state.
 */

import type { ConsequencePreview, ConsequenceEffect, Severity } from "./types";

function effect(text: string, severity: Severity, reversible = true): ConsequenceEffect {
  return { effect: text, reversible, severity };
}

export interface DeactivateOperatorInput {
  operatorName: string;
  vehicleCount: number;
  driverCount: number;
  masterCardStatus: "Active" | "Frozen" | string;
  hasPendingRenewals: boolean;
}

export function previewDeactivateOperator(input: DeactivateOperatorInput): ConsequencePreview {
  const effects: ConsequenceEffect[] = [
    effect(`Master Card for ${input.operatorName} will be frozen`, "critical", true),
    effect("Operator login will be blocked", "high", true),
  ];
  if (input.vehicleCount > 0) {
    effects.push(
      effect(
        `${input.vehicleCount} vehicle${input.vehicleCount === 1 ? "" : "s"} remain registered but lose operator disbursement path`,
        "high",
        true
      )
    );
  }
  if (input.driverCount > 0) {
    effects.push(
      effect(
        `${input.driverCount} linked driver account${input.driverCount === 1 ? "" : "s"} stay active — assignment is independent`,
        "medium",
        true
      )
    );
  }
  if (input.hasPendingRenewals) {
    effects.push(
      effect("Pending renewal requests stay in queue; approval still possible", "medium", true)
    );
  }

  const blockers: string[] = [];
  if (input.masterCardStatus === "Frozen") {
    blockers.push("Master Card is already frozen");
  }

  return {
    action: "Deactivate operator",
    subjectLabel: input.operatorName,
    effects,
    blockers,
    recommended: blockers.length === 0,
    summary:
      blockers.length > 0
        ? "Already partially deactivated — review frozen card state."
        : `Freezes Master Card and blocks login for ${input.operatorName}. Vehicles and drivers are not deleted.`,
  };
}

export interface SuspendDriverInput {
  driverName: string;
  assignedVehicleReg: string | null;
  hasActiveQueuePosition: boolean;
}

export function previewSuspendDriver(input: SuspendDriverInput): ConsequencePreview {
  const effects: ConsequenceEffect[] = [
    effect(`${input.driverName} cannot log in or accept dispatch`, "critical", true),
    effect("Driver status set to Suspended", "high", true),
  ];
  if (input.assignedVehicleReg) {
    effects.push(
      effect(
        `Vehicle ${input.assignedVehicleReg} remains assigned — reassign if it must keep operating`,
        "high",
        true
      )
    );
  } else {
    effects.push(effect("No vehicle currently assigned", "info", true));
  }
  if (input.hasActiveQueuePosition) {
    effects.push(
      effect("Active queue position will need marshal attention at the rank", "high", false)
    );
  }

  return {
    action: "Suspend driver",
    subjectLabel: input.driverName,
    effects,
    blockers: [],
    recommended: true,
    summary: input.assignedVehicleReg
      ? `Blocks ${input.driverName}. Vehicle ${input.assignedVehicleReg} stays linked until you reassign.`
      : `Blocks ${input.driverName} from the network.`,
  };
}

export interface ApproveRenewalInput {
  vehicleReg: string;
  newPermitNumber?: string | null;
  permitExpiryDate?: string | null;
  cofExpiryDate?: string | null;
  paidWithMasterCard: boolean;
}

export function previewApproveRenewal(input: ApproveRenewalInput): ConsequencePreview {
  const effects: ConsequenceEffect[] = [
    effect(`Permit status on ${input.vehicleReg} → Active`, "high", false),
  ];
  if (input.newPermitNumber) {
    effects.push(effect(`New permit number: ${input.newPermitNumber}`, "medium", false));
  }
  if (input.permitExpiryDate) {
    effects.push(effect(`Permit expiry set to ${input.permitExpiryDate}`, "medium", false));
  }
  if (input.cofExpiryDate) {
    effects.push(effect(`COF expiry set to ${input.cofExpiryDate}`, "medium", false));
  }
  effects.push(
    effect("Vehicle becomes eligible for print queue (A4 + signed QR)", "high", false)
  );
  effects.push(effect("Prior permit archived for audit", "low", false));
  if (input.paidWithMasterCard) {
    effects.push(effect("Master Card payment already recorded — no further debit", "info", false));
  }

  const blockers: string[] = [];
  if (!input.newPermitNumber) blockers.push("New permit number is required");
  if (!input.permitExpiryDate) blockers.push("Permit expiry date is required");

  return {
    action: "Approve renewal",
    subjectLabel: input.vehicleReg,
    effects,
    blockers,
    recommended: blockers.length === 0,
    summary:
      blockers.length > 0
        ? "Complete required fields before approval."
        : `Activates compliance for ${input.vehicleReg} and opens print eligibility.`,
  };
}

export interface RejectRenewalInput {
  vehicleReg: string;
  currentExpiryDate: string | null;
}

export function previewRejectRenewal(input: RejectRenewalInput): ConsequencePreview {
  const effects: ConsequenceEffect[] = [
    effect("Request marked Rejected — operator is notified via status", "high", false),
    effect("Vehicle permit dates unchanged", "medium", true),
  ];
  if (input.currentExpiryDate) {
    effects.push(
      effect(`Current permit still expires ${input.currentExpiryDate}`, "medium", true)
    );
  }
  effects.push(effect("Audit log records rejection reason", "low", false));

  return {
    action: "Reject renewal",
    subjectLabel: input.vehicleReg,
    effects,
    blockers: [],
    recommended: true,
    summary: `Leaves ${input.vehicleReg} on existing permit. Operator must re-apply if needed.`,
  };
}

export interface FreezeMasterCardInput {
  operatorName: string;
  balanceSzl: number;
  pendingDisbursements: number;
}

export function previewFreezeMasterCard(input: FreezeMasterCardInput): ConsequencePreview {
  const effects: ConsequenceEffect[] = [
    effect("All Master Card disbursements blocked", "critical", true),
    effect("Permit renewal payments via Master Card blocked", "high", true),
    effect(`Balance E${input.balanceSzl.toFixed(2)} held — not forfeited`, "medium", true),
  ];
  if (input.pendingDisbursements > 0) {
    effects.push(
      effect(
        `${input.pendingDisbursements} in-flight transfer${input.pendingDisbursements === 1 ? "" : "s"} may still settle`,
        "high",
        false
      )
    );
  }

  return {
    action: "Freeze Master Card",
    subjectLabel: input.operatorName,
    effects,
    blockers: [],
    recommended: true,
    summary: `Stops money movement for ${input.operatorName} without deleting the card or balance.`,
  };
}
