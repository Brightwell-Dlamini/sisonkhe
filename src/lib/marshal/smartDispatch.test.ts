import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({ default: undefined }));

import { buildSmartDispatchRecommendation } from "./dispatch";

describe("buildSmartDispatchRecommendation", () => {
    it("holds risky dispatches with expired permits or missing drivers", () => {
        const recommendation = buildSmartDispatchRecommendation(
            {
                driverId: null,
                driverStatus: "Active",
                permitStatus: "Expired",
                permitExpiryDate: "2024-01-01",
                cofExpiryDate: "2026-10-20",
                insuranceExpiry: "2026-11-20",
                roadworthinessExpiry: "2026-12-01",
                status: "Waiting",
                currentQueuePosition: 6,
                printPending: false,
            },
            "depart"
        );

        expect(recommendation.status).toBe("hold");
        expect(recommendation.score).toBeGreaterThanOrEqual(60);
        expect(recommendation.reason).toContain("No assigned driver");
        expect(recommendation.nextBestAction).toBe("delay");
    });

    it("approves a clean dispatch for a compliant vehicle", () => {
        const recommendation = buildSmartDispatchRecommendation(
            {
                driverId: "driver-1",
                driverStatus: "Active",
                permitStatus: "Valid",
                permitExpiryDate: "2026-12-31",
                cofExpiryDate: "2026-11-10",
                insuranceExpiry: "2026-11-15",
                roadworthinessExpiry: "2026-12-15",
                status: "Waiting",
                currentQueuePosition: 2,
                printPending: false,
            },
            "load"
        );

        expect(recommendation.status).toBe("approve");
        expect(recommendation.score).toBeLessThan(30);
    });
});
