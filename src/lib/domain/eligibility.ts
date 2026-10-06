/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Pure domain rules — no I/O.
 *
 * One human cannot drive two kombis. Suspended drivers cannot be assigned.
 * Expired permit/PDP cannot load or depart. The UI and API both use these.
 */

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
};

export type EligibilityResult = {
  eligible: boolean;
  reason?: string;
  /** Soft warning — allowed with confirmation */
  warning?: string;
};

function normPlate(reg: string | null | undefined): string {
  return (reg ?? "").trim().toUpperCase().replace(/\s+/g, " ");
}

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

/** Driver may be offered for assignment to `targetVehicleReg` (empty = any free vehicle). */
export function driverAssignableToVehicle(
  driver: DriverEligibilityInput,
  targetVehicleReg?: string | null
): EligibilityResult {
  const status = (driver.status ?? "Active").trim();
  if (status === "Suspended") {
    return { eligible: false, reason: `${driver.fullName} is suspended and cannot be assigned.` };
  }
  if (status === "On Leave" || status === "Off-Duty") {
    return {
      eligible: false,
      reason: `${driver.fullName} is ${status} — not available for assignment.`,
    };
  }

  const assigned = normPlate(driver.assignedVehicleReg);
  const target = normPlate(targetVehicleReg);

  if (assigned && target && assigned !== target) {
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

/** Drivers shown in assignment dropdown for a vehicle. */
export function filterAssignableDrivers<T extends DriverEligibilityInput>(
  drivers: T[],
  targetVehicleReg?: string | null,
  currentDriverId?: string | null
): T[] {
  const target = normPlate(targetVehicleReg);
  return drivers.filter((d) => {
    if (currentDriverId && d.id === currentDriverId) return true;
    const result = driverAssignableToVehicle(d, target || null);
    // Allow currently assigned-to-this-plate (editing same vehicle)
    if (target && normPlate(d.assignedVehicleReg) === target) return true;
    return result.eligible;
  });
}

/** Label for option list: name + plate if taken (should rarely show taken). */
export function driverOptionLabel(d: DriverEligibilityInput): string {
  const plate = normPlate(d.assignedVehicleReg);
  if (plate) return `${d.fullName} · ${plate}`;
  return d.fullName;
}

export type DispatchGateInput = {
  hasDriver: boolean;
  driverStatus?: string | null;
  driverPdpStatus?: string | null;
  driverPdpExpiry?: string | null;
  permitStatus?: string | null;
  permitExpiryDate?: string | null;
  cofExpiryDate?: string | null;
  vehicleStatus?: string | null;
};

/** Can this vehicle enter Loading / depart from rank? */
export function canDispatchLoad(input: DispatchGateInput): EligibilityResult {
  if (!input.hasDriver) {
    return {
      eligible: false,
      reason: "No driver assigned. Assign a driver before loading.",
    };
  }
  if (input.driverStatus === "Suspended") {
    return {
      eligible: false,
      reason: "Assigned driver is suspended. Cannot load.",
    };
  }
  if (
    input.driverPdpStatus === "Expired" ||
    input.driverPdpStatus === "Suspended" ||
    isExpired(input.driverPdpExpiry)
  ) {
    return {
      eligible: false,
      reason: "Assigned driver PDP is not valid. Cannot load.",
    };
  }

  const permitOk =
    (input.permitStatus === "Active" ||
      input.permitStatus === "Valid" ||
      !input.permitStatus) &&
    !isExpired(input.permitExpiryDate);

  if (input.permitStatus === "Expired" || isExpired(input.permitExpiryDate)) {
    return {
      eligible: false,
      reason: "Vehicle permit is expired. Cannot load until renewed.",
    };
  }
  if (input.permitStatus === "Suspended") {
    return {
      eligible: false,
      reason: "Vehicle permit is suspended. Cannot load.",
    };
  }
  if (!permitOk && input.permitExpiryDate) {
    return {
      eligible: false,
      reason: "Vehicle permit is not valid for rank operations.",
    };
  }

  if (isExpired(input.cofExpiryDate)) {
    return {
      eligible: false,
      reason: "Certificate of fitness (COF) is expired. Cannot load.",
    };
  }

  const permitDays = daysUntil(input.permitExpiryDate);
  if (permitDays !== null && permitDays <= 7) {
    return {
      eligible: true,
      warning: `Permit expires in ${permitDays} day${permitDays === 1 ? "" : "s"}.`,
    };
  }

  return { eligible: true };
}

export function canDispatchDepart(input: DispatchGateInput): EligibilityResult {
  return canDispatchLoad(input);
}
