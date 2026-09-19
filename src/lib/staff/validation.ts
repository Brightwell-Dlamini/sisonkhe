/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Validation schemas for staff management.
 * Shared between client (form) and server (API route).
 */

import { z } from "zod";

export const STAFF_ROLES = [
  "super-admin",
  "admin",
  "fleet-manager",
  "inspector",
] as const;

export const ESWATINI_REGIONS = [
  "Hhohho",
  "Manzini",
  "Lubombo",
  "Shiselweni",
] as const;

// Roles that must have a region assigned
export const REGION_SCOPED_ROLES: readonly string[] = ["admin", "inspector"];

export const createStaffSchema = z
  .object({
    fullName: z
      .string()
      .trim()
      .min(2, "Full name is required")
      .max(120, "Full name is too long"),
    email: z
      .string()
      .trim()
      .toLowerCase()
      .email("Enter a valid email address")
      .max(160),
    phone: z
      .string()
      .trim()
      .max(20)
      .optional()
      .or(z.literal("")),
    role: z.enum(STAFF_ROLES, { errorMap: () => ({ message: "Select a role" }) }),
    region: z
      .enum(ESWATINI_REGIONS)
      .optional()
      .nullable()
      .or(z.literal("")),
    terminalId: z.string().trim().max(80).optional().or(z.literal("")),
    password: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .max(128, "Password is too long"),
  })
  .refine(
    (data) => {
      if (REGION_SCOPED_ROLES.includes(data.role)) {
        return !!data.region;
      }
      return true;
    },
    {
      message: "This role requires a region assignment",
      path: ["region"],
    }
  );

export const updateStaffSchema = z
  .object({
    fullName: z.string().trim().min(2).max(120).optional(),
    phone: z.string().trim().max(20).optional().or(z.literal("")),
    role: z.enum(STAFF_ROLES).optional(),
    region: z
      .enum(ESWATINI_REGIONS)
      .optional()
      .nullable()
      .or(z.literal("")),
    terminalId: z.string().trim().max(80).optional().or(z.literal("")),
    isActive: z.boolean().optional(),
  });

export type CreateStaffInput = z.infer<typeof createStaffSchema>;
export type UpdateStaffInput = z.infer<typeof updateStaffSchema>;
