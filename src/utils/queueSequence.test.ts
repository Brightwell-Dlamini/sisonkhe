/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  computeMonthlyRoster,
  advanceMonthlyRotation,
  getCurrentMonthStr,
  getAvailableMonths,
} from "./queueSequence";
import type { Vehicle, Driver, Trip } from "../types";
import { KombiStatus } from "../types";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

function makeVehicle(reg: string, pos: number, opts: Partial<Vehicle> = {}): Vehicle {
  return {
    registrationNumber: reg,
    fleetNumber: reg.replace(/\s+/g, ""),
    vic: reg.replace(/\s+/g, ""),
    make: "Toyota",
    model: "Quantum",
    seatingCapacity: 15,
    classification: "kombi",
    routeAssignmentId: "test_route",
    loadingBay: "Bay 01",
    ownerName: "Test Owner",
    ownerPhone: "+268 7600 0000",
    driverId: "",
    status: KombiStatus.Waiting,
    currentQueuePosition: pos,
    monthlySequenceBaseIndex: pos,
    tripsToday: 0,
    lastActive: new Date().toISOString(),
    ...opts,
  };
}

function makeDriver(id: string, reg: string, name: string): Driver {
  return {
    id,
    fullName: name,
    nationalId: "9001010000000",
    phone: "+268 7600 0000",
    licenseNumber: `DL-${id}`,
    licenseClass: "Heavy Duty",
    status: "Active",
    emergencyContactName: "N/A",
    emergencyContactPhone: "+268 7600 0000",
    assignedVehicleReg: reg,
    avatarSeed: name.toLowerCase(),
    pdpStatus: "Valid",
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("computeMonthlyRoster", () => {
  it("returns empty roster for empty vehicle list", () => {
    const plan = computeMonthlyRoster([], "2026-09", [], []);
    expect(plan.vehicles).toEqual([]);
    expect(plan.dailyRoster).toEqual([]);
    expect(plan.leadVehicleReg).toBe("");
  });

  it("computes the correct number of days for a 30-day month", () => {
    const vehicles = [makeVehicle("A 1", 1)];
    const plan = computeMonthlyRoster(vehicles, "2026-09", [], []);
    expect(plan.totalDays).toBe(30); // September  });

  it("computes the correct number of days for a 31-day month", () => {
    const vehicles = [makeVehicle("A 1", 1)];
    const plan = computeMonthlyRoster(vehicles, "2026-10", [], []);
    expect(plan.totalDays).toBe(31);
  });

  it("computes the correct number of days for February (non-leap)", () => {
    const vehicles = [makeVehicle("A 1", 1)];
    const plan = computeMonthlyRoster(vehicles, "2027-02", [], []);
    expect(plan.totalDays).toBe(28);
  });

  it("computes the correct number of days for February (leap year)", () => {
    const vehicles = [makeVehicle("A 1", 1)];
    const plan = computeMonthlyRoster(vehicles, "2028-02", [], []);
    expect(plan.totalDays).toBe(29);
  });

  it("places the #1 vehicle as lead on Day 1", () => {
    const vehicles = [
      makeVehicle("A 1", 1),
      makeVehicle("B 2", 2),
      makeVehicle("C 3", 3),
    ];
    const plan = computeMonthlyRoster(vehicles, "2026-09", [], []);
    const day1 = plan.dailyRoster[0];
    expect(day1.queueOrder[0].vehicleReg).toBe("A 1");
    expect(day1.queueOrder[0].isLeadVehicle).toBe(true);
  });

  it("rotates the Day 1 #1 vehicle to last on Day 2 (the '1st becomes last' rule)", () => {
    const vehicles = [
      makeVehicle("A 1", 1),
      makeVehicle("B 2", 2),
      makeVehicle("C 3", 3),
    ];
    const plan = computeMonthlyRoster(vehicles, "2026-09", [], []);
    const day2 = plan.dailyRoster[1];
    // Day 1 order: A, B, C. Day 2 order should be B, C, A.
    expect(day2.queueOrder[0].vehicleReg).toBe("B 2");
    expect(day2.queueOrder[1].vehicleReg).toBe("C 3");
    expect(day2.queueOrder[2].vehicleReg).toBe("A 1");
  });

  it("rotates the Day 1 #2 vehicle to first on Day 2 (the '2nd becomes first' rule)", () => {
    const vehicles = [
      makeVehicle("A 1", 1),
      makeVehicle("B 2", 2),
      makeVehicle("C 3", 3),
    ];
    const plan = computeMonthlyRoster(vehicles, "2026-09", [], []);
    const day2 = plan.dailyRoster[1];
    expect(day2.queueOrder[0].vehicleReg).toBe("B 2");
  });

  it("returns to the original order on Day N+1 where N is the vehicle count", () => {
    const vehicles = [
      makeVehicle("A 1", 1),
      makeVehicle("B 2", 2),
      makeVehicle("C 3", 3),
    ];
    const plan = computeMonthlyRoster(vehicles, "2026-09", [], []);
    // With 3 vehicles, Day 4 should equal Day 1 order
    const day1 = plan.dailyRoster[0];
    const day4 = plan.dailyRoster[3];
    expect(day4.queueOrder.map((q) => q.vehicleReg)).toEqual(
      day1.queueOrder.map((q) => q.vehicleReg)
    );
  });

  it("pins mid-month additions to the tail for every day", () => {
    const vehicles = [
      makeVehicle("A 1", 1),
      makeVehicle("B 2", 2),
      makeVehicle("MID", 99, { isMidMonthAddition: true, addedMidMonth: true }),
    ];
    const plan = computeMonthlyRoster(vehicles, "2026-09", [], []);
    for (const day of plan.dailyRoster) {
      const lastItem = day.queueOrder[day.queueOrder.length - 1];
      expect(lastItem.vehicleReg).toBe("MID");
      expect(lastItem.isMidMonthAddition).toBe(true);
    }
  });

  it("assigns correct driver to each queue item", () => {
    const vehicles = [makeVehicle("A 1", 1, { driverId: "d1" })];
    const drivers = [makeDriver("d1", "A 1", "Test Driver")];
    const plan = computeMonthlyRoster(vehicles, "2026-09", drivers, []);
    expect(plan.dailyRoster[0].queueOrder[0].driverName).toBe("Test Driver");
  });

  it("marks the current day's entry with isToday", () => {
    const vehicles = [makeVehicle("A 1", 1)];
    const today = new Date();
    const thisMonth = getCurrentMonthStr();
    const plan = computeMonthlyRoster(vehicles, thisMonth, [], []);
    const todayEntry = plan.dailyRoster.find((d) => d.isToday);
    if (today.getDate() <= plan.totalDays) {
      expect(todayEntry).toBeDefined();
    }
  });
});

describe("advanceMonthlyRotation", () => {
  it("moves the previous #1 to the end of the regular sequence", () => {
    const vehicles = [
      makeVehicle("A 1", 1, { monthlySequenceBaseIndex: 1 }),
      makeVehicle("B 2", 2, { monthlySequenceBaseIndex: 2 }),
      makeVehicle("C 3", 3, { monthlySequenceBaseIndex: 3 }),
    ];
    const result = advanceMonthlyRotation(vehicles, "test_route", "2026-10");
    // A 1 should now be last
    const sorted = result
      .filter((v) => v.routeAssignmentId === "test_route")
      .sort((a, b) => a.monthlySequenceBaseIndex! - b.monthlySequenceBaseIndex!);
    expect(sorted[0].registrationNumber).toBe("B 2");
    expect(sorted[sorted.length - 1].registrationNumber).toBe("A 1");
  });

  it("graduates mid-month additions into regular sequence for next month", () => {
    const vehicles = [
      makeVehicle("A 1", 1),
      makeVehicle("MID", 99, { isMidMonthAddition: true, addedMidMonth: true }),
    ];
    const result = advanceMonthlyRotation(vehicles, "test_route", "2026-10");
    const mid = result.find((v) => v.registrationNumber === "MID");
    expect(mid?.isMidMonthAddition).toBe(false);
    expect(mid?.addedMidMonth).toBe(false);
  });
});

describe("getAvailableMonths", () => {
  it("returns 12 months for a year", () => {
    const months = getAvailableMonths(2026);
    expect(months).toHaveLength(12);
    expect(months[0].monthName).toBe("January");
    expect(months[11].monthName).toBe("December");
  });

  it("computes correct totalDays per month", () => {
    const months = getAvailableMonths(2027);
    expect(months[1].totalDays).toBe(28); // Feb 2027
    expect(months[8].totalDays).toBe(30); // Sep 2027
    expect(months[0].totalDays).toBe(31); // Jan 2027
  });
});
