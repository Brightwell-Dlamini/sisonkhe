/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect } from "vitest";
import { generateVIC, formatVIC, getRouteCode, syncDriversAndVehicles } from "./helper";
import type { Vehicle, Driver, Route } from "../types";
import { EswatiniRegion, KombiStatus } from "../types";

describe("generateVIC", () => {
  it("handles Manzini registration plates", () => {
    expect(generateVIC("MSD 601 MZ")).toBe("MMZ-601");
  });

  it("handles Hhohho registration plates", () => {
    expect(generateVIC("HSD 101 BM")).toBe("HBM-101");
  });

  it("handles Lubombo registration plates", () => {
    expect(generateVIC("LSD 901 LU")).toBe("SLU-901");
  });

  it("handles Shiselweni registration plates", () => {
    expect(generateVIC("SSD 501 SH")).toBe("SNH-501");
  });

  it("pads digits to 3", () => {
    expect(generateVIC("MSD 5 MZ")).toBe("MMZ-005");
  });

  it("handles lowercase input", () => {
    expect(generateVIC("msd 601 mz")).toBe("MMZ-601");
  });
});

describe("formatVIC", () => {
  it("normalizes MMZ601 to MMZ-601", () => {
    expect(formatVIC("MMZ601")).toBe("MMZ-601");
  });

  it("keeps MMZ-601 as-is", () => {
    expect(formatVIC("MMZ-601")).toBe("MMZ-601");
  });
});

describe("getRouteCode", () => {
  it("generates MB01 for Mbabane Bay 1", () => {
    expect(getRouteCode("Mbabane", "Hhohho", "Bay 1")).toBe("MB01");
  });

  it("generates MN14 for Manzini Bay 14", () => {
    expect(getRouteCode("Manzini", "Manzini", "Bay 14")).toBe("MN14");
  });
});

describe("syncDriversAndVehicles", () => {
  it("unassigns a driver from a previous vehicle when reassigned", () => {
    const vehicles: Vehicle[] = [
      {
        registrationNumber: "A 1", fleetNumber: "V1", make: "T", model: "Q",
        seatingCapacity: 15, classification: "kombi", routeAssignmentId: "r1",
        loadingBay: "B1", ownerName: "O", ownerPhone: "+268", driverId: "d1",
        status: KombiStatus.Waiting, currentQueuePosition: 1, tripsToday: 0,
        lastActive: new Date().toISOString(),
      },
      {
        registrationNumber: "B 2", fleetNumber: "V2", make: "T", model: "Q",
        seatingCapacity: 15, classification: "kombi", routeAssignmentId: "r1",
        loadingBay: "B1", ownerName: "O", ownerPhone: "+268", driverId: "d1",
        status: KombiStatus.Waiting, currentQueuePosition: 2, tripsToday: 0,
        lastActive: new Date().toISOString(),
      },
    ];
    const drivers: Driver[] = [
      {
        id: "d1", fullName: "D", nationalId: "1", phone: "+268",
        licenseNumber: "L", licenseClass: "C", status: "Active",
        emergencyContactName: "E", emergencyContactPhone: "+268",
        assignedVehicleReg: "A 1", avatarSeed: "d",
      },
    ];
    const routes: Route[] = [];

    const { drivers: d2, vehicles: v2 } = syncDriversAndVehicles(drivers, vehicles, routes);
    // d1 should only be assigned to one vehicle
    const d1VehicleAssignments = v2.filter((v) => v.driverId === "d1");
    expect(d1VehicleAssignments).toHaveLength(1);
  });
});
