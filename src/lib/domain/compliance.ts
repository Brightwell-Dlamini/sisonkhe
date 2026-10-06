/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Single compliance brain — marshal, inspector, and forms agree.
 */

import { resolvePermitLifecycle } from "./permitLifecycle";

export function normalizePermitStatus(
  status: string | null | undefined
): "Active" | "Expired" | "Suspended" | "Unknown" {
  const s = (status ?? "").trim().toLowerCase();
  if (s === "active" || s === "valid") return "Active";
  if (s === "expired") return "Expired";
  if (s === "suspended") return "Suspended";
  if (!s) return "Unknown";
  return "Unknown";
}

function isExpired(dateStr: string | null | undefined, now = Date.now()): boolean {
  if (!dateStr) return false;
  const t = new Date(dateStr).getTime();
  return !Number.isNaN(t) && t <= now;
}

export type ComplianceInput = {
  permitStatus?: string | null;
  permitExpiryDate?: string | null;
  cofExpiryDate?: string | null;
  insuranceExpiry?: string | null;
  roadworthinessExpiry?: string | null;
  vehicleStatus?: string | null;
  renewalStatus?: string | null;
  hasDriver?: boolean;
  driverStatus?: string | null;
  driverPdpStatus?: string | null;
  driverPdpExpiry?: string | null;
};

export type ComplianceReport = {
  permitValid: boolean;
  cofValid: boolean;
  insuranceValid: boolean;
  roadworthyValid: boolean;
  driverPdpValid: boolean;
  vehicleOperational: boolean;
  printPending: boolean;
  overallValid: boolean;
  blocksRankLoad: boolean;
  reasons: string[];
  warnings: string[];
};

export function evaluateCompliance(input: ComplianceInput): ComplianceReport {
  const reasons: string[] = [];
  const warnings: string[] = [];

  const life = resolvePermitLifecycle({
    permitStatus: input.permitStatus,
    permitExpiryDate: input.permitExpiryDate,
    renewalStatus: input.renewalStatus,
  });

  const permitNorm = normalizePermitStatus(input.permitStatus);
  const permitValid =
    !life.blocksRankLoad &&
    permitNorm !== "Expired" &&
    permitNorm !== "Suspended" &&
    !isExpired(input.permitExpiryDate);

  if (!permitValid) {
    reasons.push(life.reason ?? "Permit not valid.");
  } else if (life.state === "expiring_soon" && life.reason) {
    warnings.push(life.reason);
  }

  const cofValid = !isExpired(input.cofExpiryDate);
  if (!cofValid) reasons.push("COF expired.");

  const insuranceValid = !isExpired(input.insuranceExpiry);
  if (!insuranceValid) reasons.push("Insurance expired.");

  const roadworthyValid = !isExpired(input.roadworthinessExpiry);
  if (!roadworthyValid) reasons.push("Roadworthiness expired.");

  const st = (input.vehicleStatus ?? "").trim();
  const vehicleOperational =
    st !== "Offline" && st !== "Breakdown" && st !== "Decommissioned";
  if (!vehicleOperational) reasons.push(`Vehicle status is ${st || "unknown"}.`);

  let driverPdpValid = true;
  if (input.hasDriver === false) {
    driverPdpValid = false;
    reasons.push("No driver assigned.");
  } else if (input.hasDriver) {
    if (input.driverStatus === "Suspended") {
      driverPdpValid = false;
      reasons.push("Driver suspended.");
    }
    if (
      input.driverPdpStatus === "Expired" ||
      input.driverPdpStatus === "Suspended" ||
      isExpired(input.driverPdpExpiry)
    ) {
      driverPdpValid = false;
      reasons.push("Driver PDP not valid.");
    }
  }

  const printPending = life.state === "approved_pending_print";
  const blocksRankLoad =
    life.blocksRankLoad ||
    !permitValid ||
    !cofValid ||
    !insuranceValid ||
    !roadworthyValid ||
    !driverPdpValid ||
    !vehicleOperational;

  const overallValid =
    permitValid &&
    cofValid &&
    insuranceValid &&
    roadworthyValid &&
    driverPdpValid &&
    vehicleOperational &&
    !printPending;

  return {
    permitValid,
    cofValid,
    insuranceValid,
    roadworthyValid,
    driverPdpValid,
    vehicleOperational,
    printPending,
    overallValid,
    blocksRankLoad,
    reasons,
    warnings,
  };
}

/** Soft policy: departed longer than this should return to Waiting. */
export const DEPARTED_AUTO_RESET_MS = 6 * 60 * 60 * 1000; // 6 hours

export function shouldAutoResetDeparted(
  status: string | null | undefined,
  updatedAt: string | null | undefined,
  now = Date.now()
): boolean {
  if ((status ?? "").trim() !== "Departed") return false;
  if (!updatedAt) return false;
  const t = new Date(updatedAt).getTime();
  if (Number.isNaN(t)) return false;
  return now - t >= DEPARTED_AUTO_RESET_MS;
}
