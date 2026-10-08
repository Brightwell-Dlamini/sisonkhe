import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({ default: undefined }));

import { scoreQueueCandidate } from "./suggestions";

describe("scoreQueueCandidate", () => {
    it("gives a compliant vehicle a higher predictive score than a risky one", () => {
        const compliant = scoreQueueCandidate(
            {
                registration_number: "AB-123",
                status: "Waiting",
                current_queue_position: 2,
                driver_id: "d-1",
                owner_operator_id: "op-a",
                permit_status: "Valid",
                permit_expiry_date: "2026-12-31",
                cof_expiry_date: "2026-11-20",
                updated_at: new Date().toISOString(),
            },
            {
                now: new Date("2026-10-08T00:00:00Z"),
                queueLength: 10,
                operatorCounts: new Map([['op-a', 2], ['op-b', 8]]),
            }
        );

        const risky = scoreQueueCandidate(
            {
                registration_number: "CD-456",
                status: "Waiting",
                current_queue_position: 4,
                driver_id: null,
                owner_operator_id: "op-a",
                permit_status: "Expired",
                permit_expiry_date: "2024-01-01",
                cof_expiry_date: "2024-02-01",
                updated_at: new Date().toISOString(),
            },
            {
                now: new Date("2026-10-08T00:00:00Z"),
                queueLength: 10,
                operatorCounts: new Map([['op-a', 2], ['op-b', 8]]),
            }
        );

        expect(compliant.score).toBeGreaterThan(risky.score);
        expect(compliant.readiness).toBe("ready");
        expect(risky.readiness).toBe("hold");
    });
});
