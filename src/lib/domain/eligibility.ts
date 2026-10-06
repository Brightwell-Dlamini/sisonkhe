/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { normalizePlate, platesEqual } from "./identity";
import { evaluateCompliance } from "./compliance";

export type DriverEligibilityInput = {
  id: string;
  fullName: string;
  status: string | null | undefined;
  assignedVehicleReg: string | null | undefined;
  pdpStatus?: string | null;
  pdpExpiryDate?: string | null;
};

export type VehicleEligibilityInput = {
  registrationNumber: string;
  driverId: string | null | undefined;
  status?: string | null;
  permitStatus?: string | null;
  permitExpiryDate?: string | null;
  cofExpiryDate?: string | null;
  insuranceExpiry?: string | null;
  roadworthinessExpiry?: string | null;
  ownerOperatorId?: string | null;
};

export type EligibilityResult = {
  eligible: boolean;
  reason?: string;
  warning?: string;
};

function isExpired(dateStr: string | null | undefined, now = Date.now()): boolean {
  if (!dateStr) return false;
  const t = new Date(dateStr).getTime();
  if (Number.isNaN(t)) return false;
  return t <= now;
}

function daysUntil(dateStr: string | null | undefined, now = Date.now()): number | null {
  if (!dateStr) return null;
  const t = new Date(dateStr).getTime();
  if (Number.isNaN(t)) return null;
  return Math.ceil((t - now) / (24 * 60 * 60 * 1000));
}

export function driverAssignableToVehicle(
  driver: DriverEligibilityInput,
  targetVehicleReg?: string | null
): EligibilityResult {
  const status = (driver.status ?? "Active").trim();
  if (status === "Suspended") {
    return {
      eligible: false,
      reason: `${driver.fullName} is suspended and cannot be assigned.`,
    };
  }
  if (status === "On Leave" || status === "Off-Duty") {
    return {
      eligible: false,
      reason: `${driver.fullName} is ${status} — not available for assignment.`,
    };
  }

  const assigned = normalizePlate(driver.assignedVehicleReg);
  const target = normalizePlate(targetVehicleReg);

  if (assigned && target && !platesEqual(assigned, target)) {
    return {
      eligible: false,
      reason: `${driver.fullName} is already assigned to ${assigned}. Unlink or transfer first — one driver cannot operate two vehicles.`,
    };
  }

  if (assigned && !target) {
    return {
      eligible: false,
      reason: `${driver.fullName} is already assigned to ${assigned}.`,
    };
  }

  if (driver.pdpStatus === "Suspended" || driver.pdpStatus === "Expired") {
    return {
      eligible: false,
      reason: `${driver.fullName} has PDP status ${driver.pdpStatus}.`,
    };
  }

  if (isExpired(driver.pdpExpiryDate)) {
    return {
      eligible: false,
      reason: `${driver.fullName} has an expired PDP (${driver.pdpExpiryDate}).`,
    };
  }

  const pdpDays = daysUntil(driver.pdpExpiryDate);
  if (pdpDays !== null && pdpDays <= 14) {
    return {
      eligible: true,
      warning: `PDP expires in ${pdpDays} day${pdpDays === 1 ? "" : "s"}.`,
    };
  }

  return { eligible: true };
}

export function vehicleAssignableToDriver(
  vehicle: VehicleEligibilityInput,
  targetDriverId?: string | null
): EligibilityResult {
  const st = (vehicle.status ?? "").trim();
  if (st === "Archived") {
    return {
      eligible: false,
      reason: `${vehicle.registrationNumber} is archived and cannot take a driver.`,
    };
  }
  if (st === "Offline" || st === "Decommissioned") {
    return {
      eligible: false,
      reason: `${vehicle.registrationNumber} is ${st} and cannot take a driver.`,
    };
  }
  if (
    vehicle.driverId &&
    targetDriverId &&
    vehicle.driverId !== targetDriverId
  ) {
    return {
      eligible: false,
      reason: `${vehicle.registrationNumber} already has a driver. Unlink first.`,
    };
  }
  if (vehicle.driverId && !targetDriverId) {
    return {
      eligible: false,
      reason: `${vehicle.registrationNumber} already has a driver.`,
    };
  }
  if (vehicle.permitStatus === "Suspended") {
    return {
      eligible: false,
      reason: `${vehicle.registrationNumber} permit is suspended.`,
    };
  }
  return { eligible: true };
}

export function filterAssignableDrivers<T extends DriverEligibilityInput>(
  drivers: T[],
  targetVehicleReg?: string | null,
  currentDriverId?: string | null
): T[] {
  const target = normalizePlate(targetVehicleReg);
  return drivers.filter((d) => {
    if (currentDriverId && d.id === currentDriverId) return true;
    if (target && platesEqual(d.assignedVehicleReg, target)) return true;
    return driverAssignableToVehicle(d, target || null).eligible;
  });
}

export function filterAssignableVehicles<
  T extends VehicleEligibilityInput & { registrationNumber: string },
>(
  vehicles: T[],
  targetDriverId?: string | null,
  currentVehicleReg?: string | null
): T[] {
  const current = normalizePlate(currentVehicleReg);
  return vehicles.filter((v) => {
    if (current && platesEqual(v.registrationNumber, current)) return true;
    if (targetDriverId && v.driverId === targetDriverId) return true;
    return vehicleAssignableToDriver(v, targetDriverId).eligible;
  });
}

export function driverOptionLabel(d: DriverEligibilityInput): string {
  const plate = normalizePlate(d.assignedVehicleReg);
  if (plate) return `${d.fullName} · ${plate}`;
  return d.fullName;
}

export function vehicleOptionLabel(v: {
  registrationNumber: string;
  driverId?: string | null;
  make?: string | null;
  model?: string | null;
}): string {
  const base = v.registrationNumber;
  const mm = [v.make, v.model].filter(Boolean).join(" ");
  if (v.driverId) return `${base}${mm ? ` · ${mm}` : ""} · assigned`;
  return mm ? `${base} · ${mm}` : base;
}

/**
 * Admin reassignment is always allowed when the caller is explicitly setting a new route.
 * The old "clear first" rule made rank ops impossible — removed.
 * Only blocks inactive marshals and conflicts when another marshal owns the route.
 */
export function marshalAssignableToRoute(
  marshal: { id: string; isActive?: boolean; assignedRouteId?: string | null },
  routeId: string | null | undefined,
  routeAlreadyHasMarshalId?: string | null
): EligibilityResult {
  if (marshal.isActive === false) {
    return {
      eligible: false,
      reason: "Inactive marshals cannot be assigned to a route.",
    };
  }
  if (
    routeAlreadyHasMarshalId &&
    routeId &&
    routeAlreadyHasMarshalId !== marshal.id
  ) {
    return {
      eligible: false,
      reason:
        "Another marshal is already on this route. Only one active marshal per route is allowed.",
    };
  }
  return { eligible: true };
}

export function vehicleCanChangeOperator(
  vehicle: VehicleEligibilityInput,
  newOperatorId: string | null | undefined
): EligibilityResult {
  const current = vehicle.ownerOperatorId ?? null;
  if (!newOperatorId || newOperatorId === current) return { eligible: true };
  if (vehicle.driverId) {
    return {
      eligible: false,
      reason:
        "Unlink the driver before transferring vehicle ownership between operators.",
    };
  }
  const st = (vehicle.status ?? "").trim();
  if (st === "Loading" || st === "Departed") {
    return {
      eligible: false,
      reason: `Vehicle is ${st}. Return to Waiting before ownership transfer.`,
    };
  }
  if (st === "Archived") {
    return {
      eligible: false,
      reason: "Archived vehicles cannot change operator.",
    };
  }
  return {
    eligible: true,
    warning: "Ownership transfer moves permit liability to the new operator.",
  };
}

export type DispatchGateInput = {
  hasDriver: boolean;
  driverStatus?: string | null;
  driverPdpStatus?: string | null;
  driverPdpExpiry?: string | null;
  permitStatus?: string | null;
  permitExpiryDate?: string | null;
  cofExpiryDate?: string | null;
  insuranceExpiry?: string | null;
  roadworthinessExpiry?: string | null;
  vehicleStatus?: string | null;
  printPending?: boolean;
  renewalStatus?: string | null;
};

export function canDispatchLoad(input: DispatchGateInput): EligibilityResult {
  if ((input.vehicleStatus ?? "").trim() === "Archived") {
    return {
      eligible: false,
      reason: "Vehicle is archived and cannot be dispatched.",
    };
  }

  const report = evaluateCompliance({
    permitStatus: input.permitStatus,
    permitExpiryDate: input.permitExpiryDate,
    cofExpiryDate: input.cofExpiryDate,
    insuranceExpiry: input.insuranceExpiry,
    roadworthinessExpiry: input.roadworthinessExpiry,
    vehicleStatus: input.vehicleStatus,
    renewalStatus: input.renewalStatus,
    hasDriver: input.hasDriver,
    driverStatus: input.driverStatus,
    driverPdpStatus: input.driverPdpStatus,
    driverPdpExpiry: input.driverPdpExpiry,
  });

  if (input.printPending || report.printPending) {
    return {
      eligible: false,
      reason:
        "Approved permit is waiting to be printed. Print A4 + QR before loading at the rank.",
    };
  }

  if (report.blocksRankLoad) {
    return {
      eligible: false,
      reason: report.reasons[0] ?? "Vehicle is not compliant for rank load.",
    };
  }

  return {
    eligible: true,
    warning: report.warnings[0],
  };
}

export function canDispatchDepart(input: DispatchGateInput): EligibilityResult {
  return canDispatchLoad(input);
}

export type RankStatus =
  | "Waiting"
  | "Loading"
  | "Delayed"
  | "Departed"
  | "Breakdown"
  | "Offline"
  | "Archived"
  | string;

export type RankAction =
  | "load"
  | "full_cabin"
  | "depart"
  | "delay"
  | "breakdown"
  | "reset_to_waiting";

const ALLOWED: Record<string, RankAction[]> = {
  Waiting: ["load", "delay", "breakdown"],
  Loading: ["depart", "full_cabin", "delay", "breakdown", "reset_to_waiting"],
  Delayed: ["load", "breakdown", "reset_to_waiting"],
  Departed: ["reset_to_waiting"],
  Breakdown: ["reset_to_waiting"],
  Offline: [],
  Archived: [],
};

export function canRankTransition(
  fromStatus: RankStatus,
  action: RankAction
): EligibilityResult {
  const from = (fromStatus || "Waiting").trim();
  const allowed = ALLOWED[from] ?? ["reset_to_waiting"];
  if (!allowed.includes(action)) {
    return {
      eligible: false,
      reason: `Illegal transition: cannot "${action}" from status "${from}". Allowed: ${allowed.join(", ") || "none"}.`,
    };
  }
  return { eligible: true };
}
