import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({ default: undefined }));

import { validateOperationalEnvironment } from "./health";

describe("validateOperationalEnvironment", () => {
    it("flags missing required production settings", () => {
        const original = { ...process.env };

        delete process.env.NEXT_PUBLIC_SUPABASE_URL;
        delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
        delete process.env.SUPABASE_SERVICE_ROLE_KEY;
        delete process.env.NEXTAUTH_SECRET;

        try {
            const result = validateOperationalEnvironment();
            expect(result.some((item) => item.status === "fail")).toBe(true);
            expect(result.some((item) => item.name === "supabase_env")).toBe(true);
            expect(result.some((item) => item.name === "auth_env")).toBe(true);
        } finally {
            process.env = original;
        }
    });
});
