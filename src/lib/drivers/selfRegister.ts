/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Public driver self-registration validation.
 * National ID is required — it is the join key to vehicles.
 */

import { z } from "zod";

const dateString = z
  .string()
  .trim()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Use format YYYY-MM-DD")
  .optional()
  .or(z.literal(""));

export const selfRegisterDriverSchema = z
  .object({
    fullName: z.string().trim().min(2, "Full name is required").max(120),
    nationalId: z
      .string()
      .trim()
      .min(5, "National ID is required")
      .max(30)
      .regex(/^[A-Za-z0-9-]+$/, "National ID must be alphanumeric"),
    phone: z
      .string()
      .trim()
      .min(1, "Phone is required")
      .max(20)
      .regex(/^\+?[\d\s-]{8,20}$/, "Enter a valid phone number"),
    residentialAddress: z.string().trim().max(160).optional().or(z.literal("")),
    dateOfBirth: dateString,
    gender: z
      .enum(["Male", "Female", "Other", ""] as const)
      .optional()
      .or(z.literal("")),

    licenseNumber: z.string().trim().max(40).optional().or(z.literal("")),
    licenseClass: z.string().trim().max(60).optional().or(z.literal("")),

    pdpNumber: z.string().trim().max(40).optional().or(z.literal("")),
    pdpIssueDate: dateString,
    pdpExpiryDate: dateString,
    pdpIssuingAuthority: z.string().trim().max(80).optional().or(z.literal("")),

    emergencyContactName: z.string().trim().max(120).optional().or(z.literal("")),
    emergencyContactPhone: z.string().trim().max(20).optional().or(z.literal("")),
    emergencyContactRelation: z.string().trim().max(60).optional().or(z.literal("")),

    password: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .max(72),
    confirmPassword: z.string().min(1, "Confirm your password"),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export type SelfRegisterDriverInput = z.infer<typeof selfRegisterDriverSchema>;
