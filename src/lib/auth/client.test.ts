import { describe, expect, it } from "vitest";
import { homePathForRole } from "./client";

describe("homePathForRole", () => {
    it("routes inspector users to the scan dashboard", () => {
        expect(homePathForRole("inspector")).toBe("/inspector/scan");
    });

    it("routes operator users to the renewals dashboard", () => {
        expect(homePathForRole("operator")).toBe("/operator/renewals");
    });

    it("routes marshal users to the marshal home", () => {
        expect(homePathForRole("marshal")).toBe("/marshal");
    });
});
