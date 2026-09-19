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

const CLASSIFICATIONS = ["kombi", "midbus", "bus"] as const;
const PERMIT_STATUSES = ["Active", "Expired", "Suspended"] as const;

export const createVehicleSchema = z.object({
  registrationNumber: z
    .string()
    .trim()
    .min(3, "Registration number is required")
    .max(20)
    .transform((v) => v.toUpperCase()),

  vic: z
    .string()
    .trim()
    .max(20)
    .optional()
    .or(z.literal("")),

  make: z.string().trim().min(1, "Make is required").max(60),
  model: z.string().trim().min(1, "Model is required").max(60),

  seatingCapacity: z.coerce
    .number()
    .int()
    .min(1, "Capacity must be at least 1")
    .max(120, "Capacity seems too high"),

  classification: z.enum(CLASSIFICATIONS),

  routeAssignmentId: z.string().trim().max(60).optional().or(z.literal("")),
  loadingBay: z.string().trim().max(20).optional().or(z.literal("")),

  ownerName: z.string().trim().max(120).optional().or(z.literal("")),
  ownerPhone: z.string().trim().max(20).optional().or(z.literal("")),
  ownerOperatorId: z.string().trim().max(60).optional().or(z.literal("")),

  driverId: z.string().trim().max(60).optional().or(z.literal("")),

  // Permits
  permitNumber: z.string().trim().max(40).optional().or(z.literal("")),
  permitStatus: z.enum(PERMIT_STATUSES).optional(),
  permitIssueDate: dateString,
  permitExpiryDate: dateString,

  // Fitness
  cofNumber: z.string().trim().max(40).optional().or(z.literal("")),
  cofIssueDate: dateString,
  cofExpiryDate: dateString,
  lastInspectionDate: dateString,

  // Association & insurance
  association: z.string().trim().max(120).optional().or(z.literal("")),
  insuranceExpiry: dateString,
  roadworthinessExpiry: dateString,

  // Mid-month tracking
  isMidMonthAddition: z.boolean().optional().default(false),
  monthRegistered: z
    .string()
    .trim()
    .regex(/^\d{4}-\d{2}$/, "Use format YYYY-MM")
    .optional()
    .or(z.literal("")),
  midMonthJoinDay: z.coerce.number().int().min(1).max(31).optional(),
  monthlySequenceBaseIndex: z.coerce.number().int().min(1).optional(),

  // Profile
  vehiclePhotoUrl: z.string().trim().max(500).optional().or(z.literal("")),
});

export const updateVehicleSchema = createVehicleSchema.partial();

export type CreateVehicleInput = z.infer<typeof createVehicleSchema>;
export type UpdateVehicleInput = z.infer<typeof updateVehicleSchema>;
