/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Public driver registration — marshal portal field set + driver-only fields.
 * No password. No vehicle link.
 */

import { z } from "zod";

const dateString = z
  .string()
  .trim()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Use format YYYY-MM-DD")
  .optional()
  .or(z.literal(""));

const REGIONS = ["Manzini", "Hhohho", "Shiselweni", "Lubombo"] as const;

export const selfRegisterDriverSchema = z.object({
  firstName: z.string().trim().min(1, "First name is required").max(80),
  surname: z.string().trim().min(1, "Surname is required").max(80),
  nationalId: z
    .string()
    .trim()
    .min(5, "National ID is required")
    .max(30)
    .regex(/^[A-Za-z0-9-]+$/, "National ID must be alphanumeric"),
  phone: z
    .string()
    .trim()
    .min(1, "Cell phone is required")
    .max(20)
    .regex(/^\+?[\d\s-]{8,20}$/, "Enter a valid phone number"),
  homeTelNo: z.string().trim().max(20).optional().or(z.literal("")),
  whatsappNo: z.string().trim().max(20).optional().or(z.literal("")),
  residentialAddress: z.string().trim().min(1, "Residential address is required").max(160),
  region: z.enum(REGIONS).optional(),
  chiefOfArea: z.string().trim().max(120).optional().or(z.literal("")),
  indvuna: z.string().trim().max(120).optional().or(z.literal("")),
  maritalStatus: z.string().trim().max(60).optional().or(z.literal("")),
  partnerName: z.string().trim().max(120).optional().or(z.literal("")),
  numberOfKids: z.coerce.number().int().min(0).max(30).optional(),
  emergencyContactName: z.string().trim().min(1, "Next of kin name is required").max(120),
  emergencyContactPhone: z.string().trim().min(1, "Next of kin phone is required").max(20),
  emergencyContactRelation: z.string().trim().max(60).optional().or(z.literal("")),
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
  agreementAccepted: z.boolean().refine((v) => v === true, {
    message: "You must accept the association agreement",
  }),
  profilePictureUrl: z.string().trim().max(2_000_000).optional().or(z.literal("")),
});

export type SelfRegisterDriverInput = z.infer<typeof selfRegisterDriverSchema>;
