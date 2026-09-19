/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { z } from "zod";

const nullableString = z
  .string()
  .trim()
  .max(160)
  .optional()
  .nullable()
  .or(z.literal(""));

const dateString = z
  .string()
  .trim()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Use format YYYY-MM-DD")
  .optional()
  .nullable()
  .or(z.literal(""));

export const createDriverSchema = z.object({
  fullName: z.string().trim().min(2, "Full name is required").max(120),
  nationalId: z
    .string()
    .trim()
    .min(1, "National ID is required")
    .max(30)
    .regex(/^[A-Za-z0-9-]+$/, "National ID must be alphanumeric")
    .optional()
    .or(z.literal("")),
  phone: z
    .string()
    .trim()
    .min(1, "Phone is required")
    .max(20)
    .regex(/^\+?[\d\s-]{8,20}$/, "Enter a valid phone number"),
  residentialAddress: nullableString,
  dateOfBirth: dateString,
  gender: z
    .enum(["Male", "Female", "Other", ""] as const)
    .optional()
    .or(z.literal("")),

  // Licence
  licenseNumber: z.string().trim().max(40).optional().or(z.literal("")),
  licenseClass: z.string().trim().max(60).optional().or(z.literal("")),

  // PDP
  pdpNumber: z.string().trim().max(40).optional().or(z.literal("")),
  pdpIssueDate: dateString,
  pdpExpiryDate: dateString,
  pdpIssuingAuthority: z.string().trim().max(80).optional().or(z.literal("")),
  pdpStatus: z
    .enum(["Valid", "Expired", "Suspended", ""] as const)
    .optional()
    .or(z.literal("")),

  // Emergency
  emergencyContactName: z.string().trim().max(120).optional().or(z.literal("")),
  emergencyContactPhone: z
    .string()
    .trim()
    .max(20)
    .optional()
    .or(z.literal("")),
  emergencyContactRelation: z
    .string()
    .trim()
    .max(60)
    .optional()
    .or(z.literal("")),

  // Assignment
  assignedVehicleReg: z.string().trim().max(40).optional().or(z.literal("")),

  // Status
  status: z
    .enum(["Active", "Suspended", "On Leave", "Off-Duty"] as const)
    .default("Active"),

  // Profile
  profilePictureUrl: z.string().trim().max(500).optional().or(z.literal("")),
});

export const updateDriverSchema = createDriverSchema.partial();

export type CreateDriverInput = z.infer<typeof createDriverSchema>;
export type UpdateDriverInput = z.infer<typeof updateDriverSchema>;
