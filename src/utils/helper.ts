import { Vehicle, Route, Driver } from "../types";

/**
 * Generates a unique Vehicle Identification Code (VIC) based on the registration number.
 * Formats strictly as 3 letters + hyphen + 3 digits, e.g. "MMZ-601", "MMZ-702", "MMZ-019", "HBM-101".
 */
export function generateVIC(reg: string): string {
  if (!reg) return "";
  const cleanReg = reg.toUpperCase().replace(/\s+/g, "");
  const lettersOnly = cleanReg.replace(/[^A-Z]/g, "");
  const digitsOnly = cleanReg.replace(/[^0-9]/g, "");
  
  // Clean 3-letter prefix
  let prefix = "";
  if (cleanReg.startsWith("MSD") || cleanReg.includes("MZ")) {
    prefix = "MMZ";
  } else if (cleanReg.startsWith("HSD") || cleanReg.includes("BM")) {
    prefix = "HBM";
  } else if (cleanReg.startsWith("LSD") || cleanReg.includes("LU")) {
    prefix = "SLU";
  } else if (cleanReg.startsWith("SSD") || cleanReg.includes("SH")) {
    prefix = "SNH";
  } else if (lettersOnly.length >= 3) {
    const firstLetter = lettersOnly.charAt(0);
    const lastTwoLetters = lettersOnly.slice(-2);
    prefix = `${firstLetter}${lastTwoLetters}`;
  } else if (lettersOnly.length > 0) {
    prefix = (lettersOnly + "MZ").slice(0, 3);
  } else {
    prefix = "MMZ";
  }

  // 3-digit padded number
  const digits = digitsOnly.length > 0
    ? digitsOnly.padStart(3, "0").slice(-3)
    : "001";

  return `${prefix}-${digits}`;
}

/**
 * Standardizes any VIC or registration string to read strictly like MMZ-601, MMZ-702, MMZ-019
 */
export function formatVIC(vicOrReg: string): string {
  if (!vicOrReg) return "";
  const clean = vicOrReg.trim().toUpperCase();

  // If already formatted like MMZ-601
  const matchHyphen = clean.match(/^([A-Z]{2,4})-(\d{1,4})$/);
  if (matchHyphen) {
    const letters = matchHyphen[1];
    const digits = matchHyphen[2].padStart(3, "0").slice(-3);
    return `${letters}-${digits}`;
  }

  // If formatted like MMZ601, HBM101, etc.
  const matchDirect = clean.match(/^([A-Z]{2,4})(\d{1,4})$/);
  if (matchDirect) {
    const letters = matchDirect[1];
    const digits = matchDirect[2].padStart(3, "0").slice(-3);
    return `${letters}-${digits}`;
  }

  // If it's a registration plate or arbitrary code (e.g. KF-M01, MSD 601 MZ)
  return generateVIC(clean);
}

/**
 * Calculates a standard Route Code.
 * Route Code = LOCATION + REGION AND BAY FIRST LETTERS + BAY NUMBER AT THE END
 * Examples: MB01, MN14, SH08, NH22
 */
export function getRouteCode(origin: string, region: string, bay: string): string {
  const cleanBay = bay.replace(/[^0-9]/g, "");
  const bayNum = cleanBay ? cleanBay.padStart(2, "0") : "01";
  
  const org = origin.toUpperCase();
  const reg = region.toUpperCase();
  
  let prefix = "";
  if (org.includes("MBABANE")) {
    prefix = "MB";
  } else if (org.includes("MANZINI")) {
    prefix = "MN";
  } else if (org.includes("SITEKI")) {
    prefix = "SH"; // As per Siteki/Lubombo example "SH08"
  } else if (org.includes("NHLANGANO")) {
    prefix = "NH"; // As per Nhlangano/Shiselweni example "NH22"
  } else {
    // Fallback: first letter of origin + first letter of region, or first 2 of origin
    prefix = (org.charAt(0) + (reg.charAt(0) || "X")).slice(0, 2);
  }
  return prefix + bayNum;
}

/**
 * Syncs a Driver's cached relational records based on their assigned vehicle's registration number.
 */
export function syncDriverWithVehicle(driver: Driver, vehicles: Vehicle[], routes: Route[]): Driver {
  if (!driver.assignedVehicleReg || driver.assignedVehicleReg === "N/A" || driver.assignedVehicleReg === "") {
    return {
      ...driver,
      assignedVic: "",
      assignedVehicle: "",
      assignedRoute: "",
      assignedBay: "",
      assignedPermit: ""
    };
  }

  const v = vehicles.find(veh => veh.registrationNumber === driver.assignedVehicleReg);
  if (!v) {
    return {
      ...driver,
      assignedVic: "",
      assignedVehicle: "",
      assignedRoute: "",
      assignedBay: "",
      assignedPermit: ""
    };
  }

  const vic = generateVIC(v.registrationNumber);
  const route = routes.find(r => r.id === v.routeAssignmentId);
  const routeCode = route ? getRouteCode(route.origin, route.region, v.loadingBay) : "";

  return {
    ...driver,
    assignedVic: vic,
    assignedVehicle: `${v.make} ${v.model} (${v.registrationNumber})`,
    assignedRoute: routeCode,
    assignedBay: v.loadingBay,
    assignedPermit: v.permitNumber || ""
  };
}

/**
 * Co-ordinates and synchronizes both drivers and vehicles collections to preserve circular relational integrity.
 */
export function syncDriversAndVehicles(
  allDrivers: Driver[],
  allVehicles: Vehicle[],
  allRoutes: Route[]
): { drivers: Driver[]; vehicles: Vehicle[] } {
  // Let's create deep copies of drivers and vehicles to work with
  const driversCopy = allDrivers.map(d => ({ ...d }));
  const vehiclesCopy = allVehicles.map(v => ({ ...v }));

  // First pass: If a vehicle has a driverId, ensure that driver is mapped to this vehicle
  vehiclesCopy.forEach((v) => {
    if (v.driverId) {
      const drv = driversCopy.find(d => d.id === v.driverId);
      if (drv) {
        // Unassign this driver from any other vehicle to ensure 1-to-1 matching
        vehiclesCopy.forEach((otherV) => {
          if (otherV.registrationNumber !== v.registrationNumber && otherV.driverId === v.driverId) {
            otherV.driverId = "";
          }
        });
        drv.assignedVehicleReg = v.registrationNumber;
      }
    }
  });

  // Second pass: Ensure bi-directional consistency between driver assignedVehicleReg and vehicle driverId
  driversCopy.forEach((d) => {
    if (d.assignedVehicleReg && d.assignedVehicleReg !== "N/A" && d.assignedVehicleReg !== "") {
      const v = vehiclesCopy.find(veh => veh.registrationNumber === d.assignedVehicleReg);
      if (v) {
        v.driverId = d.id;
      }
    }
  });

  vehiclesCopy.forEach((v) => {
    if (v.driverId) {
      const d = driversCopy.find(drv => drv.id === v.driverId);
      if (d) {
        d.assignedVehicleReg = v.registrationNumber;
      }
    }
  });

  // Sync each driver's cached fields (such as route code, vic, etc)
  const syncedDrivers = driversCopy.map((d) => {
    return syncDriverWithVehicle(d, vehiclesCopy, allRoutes);
  });

  // Ensure every vehicle has a valid VIC and fleetNumber without overwriting custom VICs
  const syncedVehicles = vehiclesCopy.map((v) => {
    const fallbackVic = v.vic || v.fleetNumber || generateVIC(v.registrationNumber);
    return {
      ...v,
      vic: fallbackVic,
      fleetNumber: fallbackVic
    };
  });

  return { drivers: syncedDrivers, vehicles: syncedVehicles };
}

/**
 * Utility to calculate days remaining until a specific date.
 */
export function calculateDaysRemaining(expiryDateStr: string | undefined): number {
  if (!expiryDateStr) return 999;
  const today = new Date("2026-07-14"); // Explicit current local system date from metadata
  const expiry = new Date(expiryDateStr);
  const diffTime = expiry.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
}
