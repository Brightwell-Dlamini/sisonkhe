/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Client-safe entity health signals for list rows.
 * Uses the same pure rules as the server snapshot.
 */

import { daysUntil, expirySeverity, formatDaysUntil } from "./rules";
import type { Severity } from "./types";

export interface HealthSignal {
  id: string;
  label: string;
  severity: Severity;
  detail?: string;
}

export function driverHealth(input: {
  status: string;
  assignedVehicleReg: string | null;
  pdpExpiryDate?: string | null;
  pdpStatus?: string | null;
}): HealthSignal[] {
  const signals: HealthSignal[] = [];

  if (input.status === "Suspended") {
    signals.push({
      id: "suspended",
      label: "Suspended",
      severity: "high",
      detail: "Cannot accept dispatch",
    });
  }

  if (!input.assignedVehicleReg) {
    signals.push({
      id: "unassigned",
      label: "No vehicle",
      severity: "medium",
      detail: "Not linked to a commercial vehicle",
    });
  }

  const pdpDays = daysUntil(input.pdpExpiryDate);
  if (pdpDays !== null && pdpDays < 0) {
    signals.push({
      id: "pdp-expired",
      label: "PDP expired",
      severity: "critical",
      detail: formatDaysUntil(pdpDays),
    });
  } else if (pdpDays !== null && pdpDays <= 30) {
    signals.push({
      id: "pdp-expiring",
      label: `PDP ${formatDaysUntil(pdpDays)}`,
      severity: expirySeverity(pdpDays),
      detail: input.pdpExpiryDate ?? undefined,
    });
  } else if (input.pdpStatus === "Expired") {
    signals.push({
      id: "pdp-status",
      label: "PDP expired",
      severity: "critical",
    });
  } else if (input.pdpStatus === "Suspended") {
    signals.push({
      id: "pdp-susp",
      label: "PDP suspended",
      severity: "high",
    });
  }

  return signals;
}

export function operatorHealth(input: {
  masterCardStatus?: string | null;
  vehicleCount?: number;
  isActive?: boolean;
}): HealthSignal[] {
  const signals: HealthSignal[] = [];

  if (input.isActive === false) {
    signals.push({
      id: "inactive",
      label: "Inactive",
      severity: "high",
      detail: "Login blocked",
    });
  }

  const card = (input.masterCardStatus ?? "").toLowerCase();
  if (card === "frozen") {
    signals.push({
      id: "card-frozen",
      label: "Card frozen",
      severity: "high",
      detail: "Disbursements blocked",
    });
  }

  if (typeof input.vehicleCount === "number" && input.vehicleCount === 0) {
    signals.push({
      id: "no-fleet",
      label: "No vehicles",
      severity: "low",
      detail: "Operator has no registered fleet",
    });
  }

  return signals;
}

export function vehicleHealth(input: {
  permitExpiryDate?: string | null;
  cofExpiryDate?: string | null;
  permitStatus?: string | null;
  driverId?: string | null;
}): HealthSignal[] {
  const signals: HealthSignal[] = [];

  const permitDays = daysUntil(input.permitExpiryDate);
  if (permitDays !== null && permitDays < 0) {
    signals.push({
      id: "permit-expired",
      label: "Permit expired",
      severity: "critical",
      detail: formatDaysUntil(permitDays),
    });
  } else if (permitDays !== null && permitDays <= 30) {
    signals.push({
      id: "permit-expiring",
      label: `Permit ${formatDaysUntil(permitDays)}`,
      severity: expirySeverity(permitDays),
    });
  }

  const cofDays = daysUntil(input.cofExpiryDate);
  if (cofDays !== null && cofDays < 0) {
    signals.push({
      id: "cof-expired",
      label: "COF expired",
      severity: "critical",
      detail: formatDaysUntil(cofDays),
    });
  } else if (cofDays !== null && cofDays <= 30) {
    signals.push({
      id: "cof-expiring",
      label: `COF ${formatDaysUntil(cofDays)}`,
      severity: expirySeverity(cofDays),
    });
  }

  if (!input.driverId) {
    signals.push({
      id: "no-driver",
      label: "No driver",
      severity: "medium",
    });
  }

  return signals;
}

export function worstSeverity(signals: HealthSignal[]): Severity | null {
  if (signals.length === 0) return null;
  const order: Severity[] = ["critical", "high", "medium", "low", "info"];
  let best = 4;
  for (const s of signals) {
    const i = order.indexOf(s.severity);
    if (i >= 0 && i < best) best = i;
  }
  return order[best];
}
