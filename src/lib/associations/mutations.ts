/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Association write operations (Phase 0).
 */

import "server-only";
import { z } from "zod";
import { createSupabaseAdminClient } from "../supabase/server";
import { newAssociationId } from "@/lib/domain/ids";
import {
  ASSOCIATION_STATUSES,
  type Association,
} from "@/lib/domain/associations";

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

export type CreateAssociationInput = z.infer<typeof CreateAssociationInputSchema>;

export type CreateAssociationResult =
  | { success: true; association: Association }
  | { success: false; error: string; issues?: Record<string, string[]> };

export async function createAssociation(
  raw: unknown
): Promise<CreateAssociationResult> {
  const parsed = CreateAssociationInputSchema.safeParse(raw);
  if (!parsed.success) {
    const issues: Record<string, string[]> = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path.join(".") || "_form";
      if (!issues[key]) issues[key] = [];
      issues[key].push(issue.message);
    }
    return { success: false, error: "Validation failed", issues };
  }

  const input = parsed.data;
  const admin = createSupabaseAdminClient();

  // Ensure region exists
  const { data: region, error: regionErr } = await admin
    .from("regions")
    .select("code")
    .eq("code", input.regionCode)
    .maybeSingle();

  if (regionErr) {
    return { success: false, error: `Region check failed: ${regionErr.message}` };
  }
  if (!region) {
    return {
      success: false,
      error: `Unknown region code: ${input.regionCode}. Create the region first or use an existing code.`,
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
    if (
      error.message.includes("does not exist") ||
      error.code === "42P01"
    ) {
      return {
        success: false,
        error:
          "Associations table not found. Apply migration 20261101_associations.sql first.",
      };
    }
    return { success: false, error: error.message };
  }

  const association: Association = {
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
  };

  return { success: true, association };
}
