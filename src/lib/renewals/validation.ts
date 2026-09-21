/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { z } from "zod";

export const RENEWAL_TERMS = [
  { months: 6, feeSzl: 250, label: "6 Months (Seasonal Concession)" },
  { months: 12, feeSzl: 450, label: "12 Months (Annual Standard)" },
  { months: 24, feeSzl: 850, label: "24 Months (Extended Concession)" },
] as const;

export const createRenewalSchema = z.object({
  vehicleReg: z.string().trim().min(1, "Vehicle is required").toUpperCase(),
  termMonths: z.coerce.number().int().refine(
    (v) => RENEWAL_TERMS.some((t) => t.months === v),
    { message: "Select a valid renewal term" }
  ),
  reason: z
    .string()
    .trim()
    .min(3, "Provide a reason")
    .max(500, "Reason is too long"),
  comments: z
    .string()
    .trim()
    .max(1000, "Comments are too long")
    .optional()
    .or(z.literal("")),
  supportingDocuments: z
    .array(z.string().trim().max(200))
    .max(10, "Maximum 10 documents")
    .optional()
    .default([]),
  payWithMasterCard: z.boolean().optional().default(false),
  operatorLicenseNumber: z.string().trim().max(60).optional().or(z.literal("")),
  odometerReading: z.coerce.number().int().min(0).max(2_000_000).optional(),
  yearOfManufacture: z.coerce.number().int().min(1950).max(2100).optional(),
  insurancePolicy: z.string().trim().max(200).optional().or(z.literal("")),
  concessionId: z.string().trim().max(60).optional().or(z.literal("")),
});

export const approveRenewalSchema = z.object({
  decision: z.enum(["Approved", "Rejected"]),
  newPermitNumber: z.string().trim().max(40).optional().or(z.literal("")),
  permitIssueDate: z
    .string()
    .trim()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional()
    .or(z.literal("")),
  permitExpiryDate: z
    .string()
    .trim()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional()
    .or(z.literal("")),
  cofNumber: z.string().trim().max(40).optional().or(z.literal("")),
  cofIssueDate: z
    .string()
    .trim()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional()
    .or(z.literal("")),
  cofExpiryDate: z
    .string()
    .trim()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional()
    .or(z.literal("")),
  inspectionDate: z
    .string()
    .trim()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional()
    .or(z.literal("")),
  licensingOffice: z.string().trim().max(120).optional().or(z.literal("")),
  renewalNotes: z.string().trim().max(1000).optional().or(z.literal("")),
});

export type CreateRenewalInput = z.infer<typeof createRenewalSchema>;
export type ApproveRenewalInput = z.infer<typeof approveRenewalSchema>;
