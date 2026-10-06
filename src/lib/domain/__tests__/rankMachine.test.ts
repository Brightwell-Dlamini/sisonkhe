import { describe, it, expect } from "vitest";
import { canRankTransition, canDispatchLoad } from "../eligibility";
import { evaluateCompliance, shouldAutoResetDeparted } from "../compliance";
import { platesEqual, normalizePlate } from "../identity";

describe("rank state machine", () => {
  it("blocks depart from Delayed", () => {
    expect(canRankTransition("Delayed", "depart").eligible).toBe(false);
  });

  it("allows depart from Loading", () => {
    expect(canRankTransition("Loading", "depart").eligible).toBe(true);
  });

  it("allows load from Waiting", () => {
    expect(canRankTransition("Waiting", "load").eligible).toBe(true);
  });
});

describe("compliance brain", () => {
  it("blocks load without driver", () => {
    const r = canDispatchLoad({ hasDriver: false });
    expect(r.eligible).toBe(false);
  });

  it("blocks expired insurance", () => {
    const r = evaluateCompliance({
      hasDriver: true,
      driverStatus: "Active",
      permitStatus: "Active",
      insuranceExpiry: "2020-01-01",
    });
    expect(r.insuranceValid).toBe(false);
    expect(r.blocksRankLoad).toBe(true);
  });
});

describe("identity", () => {
  it("treats spaced plates as equal", () => {
    expect(platesEqual("HSD 101 BM", "HSD101BM")).toBe(true);
    expect(normalizePlate("  hsd  101  bm ")).toBe("HSD 101 BM");
  });
});

describe("auto reset", () => {
  it("resets departed after 6h", () => {
    const old = new Date(Date.now() - 7 * 60 * 60 * 1000).toISOString();
    expect(shouldAutoResetDeparted("Departed", old)).toBe(true);
    expect(shouldAutoResetDeparted("Loading", old)).toBe(false);
  });
});
