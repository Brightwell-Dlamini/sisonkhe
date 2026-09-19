/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  getOrCreateVehicleVirtualCard,
  topUpVirtualCard,
  chargeVirtualCard,
  toggleFreezeVirtualCard,
  getAllVirtualCards,
  saveAllVirtualCards,
} from "./virtualCards";
import type { Vehicle, Driver } from "../types";
import { KombiStatus } from "../types";

function makeVehicle(reg: string): Vehicle {
  return {
    registrationNumber: reg,
    fleetNumber: "VIC-001",
    vic: "VIC-001",
    make: "Toyota",
    model: "Quantum",
    seatingCapacity: 15,
    classification: "kombi",
    routeAssignmentId: "test",
    loadingBay: "Bay 01",
    ownerName: "Owner",
    ownerPhone: "+268 7600 0000",
    driverId: "d1",
    status: KombiStatus.Waiting,
    currentQueuePosition: 1,
    tripsToday: 0,
    lastActive: new Date().toISOString(),
  };
}

function makeDriver(): Driver {
  return {
    id: "d1",
    fullName: "Test Driver",
    nationalId: "9001010000000",
    phone: "+268 7600 0000",
    licenseNumber: "DL-1",
    licenseClass: "Heavy Duty",
    status: "Active",
    emergencyContactName: "N/A",
    emergencyContactPhone: "+268 7600 0000",
    assignedVehicleReg: "TEST 001",
    avatarSeed: "test",
  };
}

describe("virtualCards", () => {
  beforeEach(() => {
    localStorage.clear();
    saveAllVirtualCards({});
  });

  it("creates a new card with a deterministic card number", () => {
    const v = makeVehicle("TEST 001");
    const card = getOrCreateVehicleVirtualCard(v);
    expect(card.cardNumber).toMatch(/^\d{4} \d{4} \d{4} \d{4}$/);
  });

  it("returns the same card for the same vehicle", () => {
    const v = makeVehicle("TEST 001");
    const a = getOrCreateVehicleVirtualCard(v);
    const b = getOrCreateVehicleVirtualCard(v);
    expect(a.id).toBe(b.id);
    expect(a.cardNumber).toBe(b.cardNumber);
  });

  it("charges the registration fee on card creation", () => {
    const v = makeVehicle("TEST 001");
    const card = getOrCreateVehicleVirtualCard(v);
    expect(card.registrationFeePaid).toBe(true);
    expect(card.registrationFeeAmount).toBe(450);
  });

  it("starts with the correct initial balance (2000 - 450 - 25 = 1525)", () => {
    const v = makeVehicle("TEST 001");
    const card = getOrCreateVehicleVirtualCard(v);
    expect(card.balanceSZL).toBe(1525);
  });

  it("increases balance on top-up", () => {
    const v = makeVehicle("TEST 001");
    const card = getOrCreateVehicleVirtualCard(v);
    const before = card.balanceSZL;
    topUpVirtualCard("TEST 001", 500);
    const after = getAllVirtualCards()["TEST 001"].balanceSZL;
    expect(after).toBe(before + 500);
  });

  it("decreases balance on charge", () => {
    const v = makeVehicle("TEST 001");
    getOrCreateVehicleVirtualCard(v);
    const result = chargeVirtualCard("TEST 001", 25, "RANK_FEE", "Test fee");
    expect(result.success).toBe(true);
    expect(result.card.balanceSZL).toBe(1500);
  });

  it("rejects charge when balance is insufficient", () => {
    const v = makeVehicle("TEST 001");
    const card = getOrCreateVehicleVirtualCard(v);
    const result = chargeVirtualCard("TEST 001", 99999, "RANK_FEE", "Oversized");
    expect(result.success).toBe(false);
    expect(result.error).toContain("Insufficient");
    expect(result.card.balanceSZL).toBe(card.balanceSZL); // unchanged
  });

  it("rejects charge when card is frozen", () => {
    const v = makeVehicle("TEST 001");
    getOrCreateVehicleVirtualCard(v);
    toggleFreezeVirtualCard("TEST 001");
    const result = chargeVirtualCard("TEST 001", 25, "RANK_FEE", "Test");
    expect(result.success).toBe(false);
    expect(result.error).toContain("Frozen");
  });

  it("freezes and unfreezes correctly", () => {
    const v = makeVehicle("TEST 001");
    getOrCreateVehicleVirtualCard(v);
    expect(toggleFreezeVirtualCard("TEST 001").status).toBe("Frozen");
    expect(toggleFreezeVirtualCard("TEST 001").status).toBe("Active");
  });

  it("records all transactions with receipts", () => {
    const v = makeVehicle("TEST 001");
    const card = getOrCreateVehicleVirtualCard(v);
    expect(card.transactions.length).toBeGreaterThanOrEqual(3);
    expect(card.transactions.every((t) => t.receiptNumber)).toBe(true);
  });
});
