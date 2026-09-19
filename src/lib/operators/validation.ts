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

export const createOperatorSchema = z.object({
  name: z.string().trim().min(2, "Full name is required").max(120),
  companyName: z
    .string()
    .trim()
    .min(2, "Company name is required")
    .max(160),
  phone: z
    .string()
    .trim()
    .min(1, "Phone is required")
    .max(20)
    .regex(/^\+?[\d\s-]{8,20}$/, "Enter a valid phone number"),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email("Enter a valid email")
    .max(160),
  nationalId: z.string().trim().max(30).optional().or(z.literal("")),
  taxNumber: z.string().trim().max(30).optional().or(z.literal("")),
  association: nullableString,
  bankAccountRef: nullableString,
  operatorLicenseNumber: nullableString,
  avatarUrl: nullableString,
});

export const updateOperatorSchema = createOperatorSchema.partial();

export type CreateOperatorInput = z.infer<typeof createOperatorSchema>;
export type UpdateOperatorInput = z.infer<typeof updateOperatorSchema>;
