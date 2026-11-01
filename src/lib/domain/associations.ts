/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Associations domain – first-class transport associations for Eswatini ranks.
 *
 * An Association groups operators and vehicles for representation, dues,
 * preferred queue rules, and bulk operational actions.
 *
 * This module is intentionally pure domain logic. Persistence, RLS and UI
 * surfaces are added in subsequent increments.
 */

import { z } from "zod";

/** Canonical association status. */
export const ASSOCIATION_STATUSES = [
  "Active",
  "Suspended",
  "Pending Registration",
  "Dissolved",
] as const;

export type AssociationStatus = (typeof ASSOCIATION_STATUSES)[number];

/** Membership role inside an association. */
export const MEMBERSHIP_ROLES = [
  "Member",
  "Committee",
  "Chair",
  "Secretary",
  "Treasurer",
] as const;

export type MembershipRole = (typeof MEMBERSHIP_ROLES)[number];

export const MembershipStatusSchema = z.enum([
  "Active",
  "Suspended",
  "Pending",
  "Resigned",
  "Expelled",
]);

export type MembershipStatus = z.infer<typeof MembershipStatusSchema>;

export const AssociationSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(2).max(120),
  shortName: z.string().max(40).optional().nullable(),
  registrationNumber: z.string().max(60).optional().nullable(),
  regionCode: z.string().min(1),
  status: z.enum(ASSOCIATION_STATUSES).default("Active"),
  chairName: z.string().max(120).optional().nullable(),
  contactPhone: z.string().max(30).optional().nullable(),
  contactEmail: z.string().email().optional().nullable().or(z.literal("")),
  physicalAddress: z.string().max(300).optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),
  /** Preferred loading / queue priority weight (higher = preferred). */
  queuePriorityWeight: z.number().int().min(0).max(100).default(0),
  version: z.number().int().positive().default(1),
  createdAt: z.string().datetime().optional(),
  updatedAt: z.string().datetime().optional(),
});

export type Association = z.infer<typeof AssociationSchema>;

export const AssociationMembershipSchema = z.object({
  id: z.string().min(1),
  associationId: z.string().min(1),
  /** Operator or driver id that belongs to the association. */
  memberEntityType: z.enum(["operator", "driver"]),
  memberEntityId: z.string().min(1),
  role: z.enum(MEMBERSHIP_ROLES).default("Member"),
  status: MembershipStatusSchema.default("Active"),
  joinedAt: z.string().datetime().optional().nullable(),
  leftAt: z.string().datetime().optional().nullable(),
  duesPaidUntil: z.string().date().optional().nullable(),
  notes: z.string().max(1000).optional().nullable(),
  version: z.number().int().positive().default(1),
  createdAt: z.string().datetime().optional(),
  updatedAt: z.string().datetime().optional(),
});

export type AssociationMembership = z.infer<typeof AssociationMembershipSchema>;

/** Returns true when the association may participate in rank operations. */
export function isAssociationOperational(status: AssociationStatus): boolean {
  return status === "Active";
}

/** Returns true when a membership currently confers benefits / representation. */
export function isMembershipActive(status: MembershipStatus): boolean {
  return status === "Active";
}

/** Human-readable label for UI. */
export function associationStatusLabel(status: AssociationStatus): string {
  switch (status) {
    case "Active":
      return "Active";
    case "Suspended":
      return "Suspended";
    case "Pending Registration":
      return "Pending registration";
    case "Dissolved":
      return "Dissolved";
    default:
      return status;
  }
}
