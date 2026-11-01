/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import "server-only";
import { z } from "zod";
import { createSupabaseAdminClient } from "../supabase/server";
import { newAssociationId, newMembershipId } from "@/lib/domain/ids";
import {
  ASSOCIATION_STATUSES,
  MEMBERSHIP_ROLES,
  MembershipStatusSchema,
  type Association,
  type AssociationMembership,
} from "@/lib/domain/associations";

function zodIssues(error: z.ZodError): Record<string, string[]> {
  const issues: Record<string, string[]> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".") || "_form";
    if (!issues[key]) issues[key] = [];
    issues[key].push(issue.message);
  }
  return issues;
}

export const CreateAssociationInputSchema = z.object({
  name: z.string().min(2).max(120),
  shortName: z.string().max(40).optional().nullable(),
  registrationNumber: z.string().max(60).optional().nullable(),
  regionCode: z.string().min(1).max(40),
  status: z.enum(ASSOCIATION_STATUSES).optional().default("Active"),
  chairName: z.string().max(120).optional().nullable(),
  contactPhone: z.string().max(30).optional().nullable(),
  contactEmail: z
    .string()
    .email()
    .optional()
    .nullable()
    .or(z.literal(""))
    .transform((v) => (v === "" ? null : v)),
  physicalAddress: z.string().max(300).optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),
  queuePriorityWeight: z.number().int().min(0).max(100).optional().default(0),
});

export type CreateAssociationInput = z.infer<
  typeof CreateAssociationInputSchema
>;

export type CreateAssociationResult =
  | { success: true; association: Association }
  | { success: false; error: string; issues?: Record<string, string[]> };

export async function createAssociation(
  raw: unknown
): Promise<CreateAssociationResult> {
  const parsed = CreateAssociationInputSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      success: false,
      error: "Validation failed",
      issues: zodIssues(parsed.error),
    };
  }
  const input = parsed.data;
  const admin = createSupabaseAdminClient();

  const { data: region, error: regionErr } = await admin
    .from("regions")
    .select("code")
    .eq("code", input.regionCode)
    .maybeSingle();
  if (regionErr)
    return { success: false, error: `Region check failed: ${regionErr.message}` };
  if (!region) {
    return {
      success: false,
      error: `Unknown region code: ${input.regionCode}`,
      issues: { regionCode: [`Region '${input.regionCode}' does not exist`] },
    };
  }

  const id = newAssociationId();
  const now = new Date().toISOString();
  const row = {
    id,
    name: input.name.trim(),
    short_name: input.shortName?.trim() || null,
    registration_number: input.registrationNumber?.trim() || null,
    region_code: input.regionCode.trim(),
    status: input.status ?? "Active",
    chair_name: input.chairName?.trim() || null,
    contact_phone: input.contactPhone?.trim() || null,
    contact_email: input.contactEmail ?? null,
    physical_address: input.physicalAddress?.trim() || null,
    notes: input.notes?.trim() || null,
    queue_priority_weight: input.queuePriorityWeight ?? 0,
    version: 1,
    created_at: now,
    updated_at: now,
  };

  const { data, error } = await admin
    .from("associations")
    .insert(row)
    .select(
      `id, name, short_name, registration_number, region_code, status,
       chair_name, contact_phone, contact_email, physical_address, notes,
       queue_priority_weight, version, created_at, updated_at`
    )
    .single();

  if (error) {
    if (error.message.includes("does not exist") || error.code === "42P01") {
      return {
        success: false,
        error:
          "Associations table not found. Apply migration 20261101_associations.sql first.",
      };
    }
    return { success: false, error: error.message };
  }

  return {
    success: true,
    association: {
      id: data.id as string,
      name: data.name as string,
      shortName: (data.short_name as string | null) ?? null,
      registrationNumber: (data.registration_number as string | null) ?? null,
      regionCode: data.region_code as string,
      status: (data.status as Association["status"]) ?? "Active",
      chairName: (data.chair_name as string | null) ?? null,
      contactPhone: (data.contact_phone as string | null) ?? null,
      contactEmail: (data.contact_email as string | null) ?? null,
      physicalAddress: (data.physical_address as string | null) ?? null,
      notes: (data.notes as string | null) ?? null,
      queuePriorityWeight: Number(data.queue_priority_weight ?? 0),
      version: Number(data.version ?? 1),
      createdAt: data.created_at as string | undefined,
      updatedAt: data.updated_at as string | undefined,
    },
  };
}

export const AddMembershipInputSchema = z.object({
  associationId: z.string().min(1),
  memberEntityType: z.enum(["operator", "driver"]),
  memberEntityId: z.string().min(1),
  role: z.enum(MEMBERSHIP_ROLES).optional().default("Member"),
  status: MembershipStatusSchema.optional().default("Active"),
  notes: z.string().max(1000).optional().nullable(),
  duesPaidUntil: z.string().optional().nullable(),
});

export type AddMembershipInput = z.infer<typeof AddMembershipInputSchema>;

export type MembershipMutationResult =
  | { success: true; membership: AssociationMembership }
  | { success: false; error: string; issues?: Record<string, string[]> };

function mapMembershipRow(data: Record<string, unknown>): AssociationMembership {
  return {
    id: data.id as string,
    associationId: data.association_id as string,
    memberEntityType: data.member_entity_type as "operator" | "driver",
    memberEntityId: data.member_entity_id as string,
    role: data.role as AssociationMembership["role"],
    status: data.status as AssociationMembership["status"],
    joinedAt: (data.joined_at as string | null) ?? null,
    leftAt: (data.left_at as string | null) ?? null,
    duesPaidUntil: (data.dues_paid_until as string | null) ?? null,
    notes: (data.notes as string | null) ?? null,
    version: Number(data.version ?? 1),
    createdAt: data.created_at as string | undefined,
    updatedAt: data.updated_at as string | undefined,
  };
}

export async function addMembership(
  raw: unknown
): Promise<MembershipMutationResult> {
  const parsed = AddMembershipInputSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      success: false,
      error: "Validation failed",
      issues: zodIssues(parsed.error),
    };
  }
  const input = parsed.data;
  const admin = createSupabaseAdminClient();

  const { data: assoc, error: assocErr } = await admin
    .from("associations")
    .select("id")
    .eq("id", input.associationId)
    .maybeSingle();
  if (assocErr) return { success: false, error: assocErr.message };
  if (!assoc) return { success: false, error: "Association not found" };

  if (input.memberEntityType === "operator") {
    const { data: op } = await admin
      .from("fleet_operators")
      .select("id")
      .eq("id", input.memberEntityId)
      .maybeSingle();
    if (!op) {
      return {
        success: false,
        error: "Operator not found",
        issues: { memberEntityId: ["Unknown operator id"] },
      };
    }
  } else {
    const { data: drv } = await admin
      .from("drivers")
      .select("id")
      .eq("id", input.memberEntityId)
      .maybeSingle();
    if (!drv) {
      return {
        success: false,
        error: "Driver not found",
        issues: { memberEntityId: ["Unknown driver id"] },
      };
    }
  }

  const { data: existing } = await admin
    .from("association_memberships")
    .select("id, status")
    .eq("association_id", input.associationId)
    .eq("member_entity_type", input.memberEntityType)
    .eq("member_entity_id", input.memberEntityId)
    .maybeSingle();

  if (existing && (existing.status as string) === "Active") {
    return {
      success: false,
      error: "This member is already active on this association",
    };
  }

  const id = newMembershipId();
  const now = new Date().toISOString();
  const row = {
    id,
    association_id: input.associationId,
    member_entity_type: input.memberEntityType,
    member_entity_id: input.memberEntityId,
    role: input.role ?? "Member",
    status: input.status ?? "Active",
    joined_at: now,
    left_at: null,
    dues_paid_until: input.duesPaidUntil || null,
    notes: input.notes?.trim() || null,
    version: 1,
    created_at: now,
    updated_at: now,
  };

  const { data, error } = await admin
    .from("association_memberships")
    .insert(row)
    .select(
      `id, association_id, member_entity_type, member_entity_id, role, status,
       joined_at, left_at, dues_paid_until, notes, version, created_at, updated_at`
    )
    .single();

  if (error) {
    if (error.message.includes("does not exist") || error.code === "42P01") {
      return {
        success: false,
        error:
          "Memberships table not found. Apply migration 20261101_associations.sql first.",
      };
    }
    return { success: false, error: error.message };
  }

  return { success: true, membership: mapMembershipRow(data as Record<string, unknown>) };
}

export const UpdateMembershipStatusSchema = z.object({
  membershipId: z.string().min(1),
  status: MembershipStatusSchema,
  notes: z.string().max(1000).optional().nullable(),
});

export async function updateMembershipStatus(
  raw: unknown
): Promise<MembershipMutationResult> {
  const parsed = UpdateMembershipStatusSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      success: false,
      error: "Validation failed",
      issues: zodIssues(parsed.error),
    };
  }
  const { membershipId, status, notes } = parsed.data;
  const admin = createSupabaseAdminClient();
  const now = new Date().toISOString();

  const patch: Record<string, unknown> = { status, updated_at: now };
  if (status === "Resigned" || status === "Expelled" || status === "Suspended") {
    patch.left_at = now;
  }
  if (status === "Active") patch.left_at = null;
  if (notes !== undefined) patch.notes = notes?.trim() || null;

  const { data, error } = await admin
    .from("association_memberships")
    .update(patch)
    .eq("id", membershipId)
    .select(
      `id, association_id, member_entity_type, member_entity_id, role, status,
       joined_at, left_at, dues_paid_until, notes, version, created_at, updated_at`
    )
    .maybeSingle();

  if (error) return { success: false, error: error.message };
  if (!data) return { success: false, error: "Membership not found" };

  return { success: true, membership: mapMembershipRow(data as Record<string, unknown>) };
}
