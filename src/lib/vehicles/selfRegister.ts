/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Public vehicle self-registration validation.
 * Driver is linked by National ID (not internal driver id).
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

  /** National ID of the driver who operates this vehicle — primary link. */
  driverNationalId: z
    .string()
    .trim()
    .min(5, "Driver National ID is required")
    .max(30)
    .regex(/^[A-Za-z0-9-]+$/, "National ID must be alphanumeric"),

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
