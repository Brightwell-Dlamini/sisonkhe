/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Public vehicle registration = asset data only.
 * No driver link. No operator link. Staff assign later.
 */

import { z } from "zod";

const dateString = z
  .string()
  .trim()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Use format YYYY-MM-DD")
  .optional()
  .or(z.literal(""));

const CLASSIFICATIONS = ["kombi", "midbus", "bus"] as const;

export const selfRegisterVehicleSchema = z.object({
  registrationNumber: z
    .string()
    .trim()
    .min(3, "Registration number is required")
    .max(20)
    .transform((v) => v.toUpperCase()),

  make: z.string().trim().min(1, "Make is required").max(60),
  model: z.string().trim().min(1, "Model is required").max(60),

  seatingCapacity: z.coerce
    .number()
    .int()
    .min(1, "Capacity must be at least 1")
    .max(120, "Capacity seems too high"),

  classification: z.enum(CLASSIFICATIONS),

  ownerName: z.string().trim().max(120).optional().or(z.literal("")),
  ownerPhone: z.string().trim().max(20).optional().or(z.literal("")),

  loadingBay: z.string().trim().max(20).optional().or(z.literal("")),

  permitNumber: z.string().trim().max(40).optional().or(z.literal("")),
  permitIssueDate: dateString,
  permitExpiryDate: dateString,

  cofNumber: z.string().trim().max(40).optional().or(z.literal("")),
  cofIssueDate: dateString,
  cofExpiryDate: dateString,

  association: z.string().trim().max(120).optional().or(z.literal("")),
  insuranceExpiry: dateString,
  roadworthinessExpiry: dateString,
});

export type SelfRegisterVehicleInput = z.infer<typeof selfRegisterVehicleSchema>;
