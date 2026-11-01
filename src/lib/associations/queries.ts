/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Associations list / read queries (Phase 0).
 */

import "server-only";
import { createSupabaseAdminClient } from "../supabase/server";
import type { Association } from "@/lib/domain/associations";

export type AssociationRow = Association & {
  membershipCount: number;
};

function mapRow(row: Record<string, unknown>): Association {
  return {
    id: row.id as string,
    name: row.name as string,
    shortName: (row.short_name as string | null) ?? null,
    registrationNumber: (row.registration_number as string | null) ?? null,
    regionCode: row.region_code as string,
    status: (row.status as Association["status"]) ?? "Active",
    chairName: (row.chair_name as string | null) ?? null,
    contactPhone: (row.contact_phone as string | null) ?? null,
    contactEmail: (row.contact_email as string | null) ?? null,
    physicalAddress: (row.physical_address as string | null) ?? null,
    notes: (row.notes as string | null) ?? null,
    queuePriorityWeight: Number(row.queue_priority_weight ?? 0),
    version: Number(row.version ?? 1),
    createdAt: row.created_at as string | undefined,
    updatedAt: row.updated_at as string | undefined,
  };
}

/**
 * List associations.
 * @param regionScope null = national (super-admin)
 */
export async function listAssociations(
  regionScope: string | null = null
): Promise<AssociationRow[]> {
  const admin = createSupabaseAdminClient();

  let q = admin
    .from("associations")
    .select(
      `id, name, short_name, registration_number, region_code, status,
       chair_name, contact_phone, contact_email, physical_address, notes,
       queue_priority_weight, version, created_at, updated_at`
    )
    .order("name", { ascending: true });

  if (regionScope) {
    q = q.eq("region_code", regionScope);
  }

  const { data, error } = await q;

  if (error) {
    // Table may not exist yet if migration has not been applied.
    if (
      error.message.includes("does not exist") ||
      error.message.includes("relation") ||
      error.code === "42P01"
    ) {
      return [];
    }
    throw new Error(`Failed to list associations: ${error.message}`);
  }

  if (!data || data.length === 0) return [];

  const ids = data.map((r) => r.id as string);

  const countMap = new Map<string, number>();
  try {
    const { data: memberships } = await admin
      .from("association_memberships")
      .select("association_id")
      .in("association_id", ids)
      .eq("status", "Active");

    for (const m of memberships ?? []) {
      const aid = m.association_id as string;
      countMap.set(aid, (countMap.get(aid) ?? 0) + 1);
    }
  } catch {
    /* memberships table may not exist yet */
  }

  return data.map((row) => {
    const base = mapRow(row as Record<string, unknown>);
    return {
      ...base,
      membershipCount: countMap.get(base.id) ?? 0,
    };
  });
}
