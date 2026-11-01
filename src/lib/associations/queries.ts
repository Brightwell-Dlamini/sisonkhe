/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import "server-only";
import { createSupabaseAdminClient } from "../supabase/server";
import type {
  Association,
  AssociationMembership,
  MembershipRole,
  MembershipStatus,
} from "@/lib/domain/associations";

export type AssociationRow = Association & { membershipCount: number };

export type MembershipRow = AssociationMembership & {
  memberDisplayName: string | null;
};

function mapAssociation(row: Record<string, unknown>): Association {
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

function mapMembership(row: Record<string, unknown>): AssociationMembership {
  return {
    id: row.id as string,
    associationId: row.association_id as string,
    memberEntityType: row.member_entity_type as "operator" | "driver",
    memberEntityId: row.member_entity_id as string,
    role: (row.role as MembershipRole) ?? "Member",
    status: (row.status as MembershipStatus) ?? "Active",
    joinedAt: (row.joined_at as string | null) ?? null,
    leftAt: (row.left_at as string | null) ?? null,
    duesPaidUntil: (row.dues_paid_until as string | null) ?? null,
    notes: (row.notes as string | null) ?? null,
    version: Number(row.version ?? 1),
    createdAt: row.created_at as string | undefined,
    updatedAt: row.updated_at as string | undefined,
  };
}

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
  if (regionScope) q = q.eq("region_code", regionScope);

  const { data, error } = await q;
  if (error) {
    if (
      error.message.includes("does not exist") ||
      error.message.includes("relation") ||
      error.code === "42P01"
    )
      return [];
    throw new Error(`Failed to list associations: ${error.message}`);
  }
  if (!data?.length) return [];

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
    /* ignore */
  }

  return data.map((row) => {
    const base = mapAssociation(row as Record<string, unknown>);
    return { ...base, membershipCount: countMap.get(base.id) ?? 0 };
  });
}

export async function getAssociationById(
  id: string,
  regionScope: string | null = null
): Promise<Association | null> {
  const admin = createSupabaseAdminClient();
  let q = admin
    .from("associations")
    .select(
      `id, name, short_name, registration_number, region_code, status,
       chair_name, contact_phone, contact_email, physical_address, notes,
       queue_priority_weight, version, created_at, updated_at`
    )
    .eq("id", id);
  if (regionScope) q = q.eq("region_code", regionScope);

  const { data, error } = await q.maybeSingle();
  if (error) {
    if (error.message.includes("does not exist") || error.code === "42P01")
      return null;
    throw new Error(`Failed to load association: ${error.message}`);
  }
  if (!data) return null;
  return mapAssociation(data as Record<string, unknown>);
}

export async function listMembershipsForAssociation(
  associationId: string
): Promise<MembershipRow[]> {
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("association_memberships")
    .select(
      `id, association_id, member_entity_type, member_entity_id, role, status,
       joined_at, left_at, dues_paid_until, notes, version, created_at, updated_at`
    )
    .eq("association_id", associationId)
    .order("created_at", { ascending: false });

  if (error) {
    if (error.message.includes("does not exist") || error.code === "42P01")
      return [];
    throw new Error(`Failed to list memberships: ${error.message}`);
  }
  if (!data?.length) return [];

  const operatorIds = data
    .filter((m) => m.member_entity_type === "operator")
    .map((m) => m.member_entity_id as string);
  const driverIds = data
    .filter((m) => m.member_entity_type === "driver")
    .map((m) => m.member_entity_id as string);

  const nameMap = new Map<string, string>();
  if (operatorIds.length) {
    const { data: ops } = await admin
      .from("fleet_operators")
      .select("id, name, company_name")
      .in("id", operatorIds);
    for (const o of ops ?? []) {
      nameMap.set(
        `operator:${o.id}`,
        (o.company_name as string) || (o.name as string) || (o.id as string)
      );
    }
  }
  if (driverIds.length) {
    const { data: drvs } = await admin
      .from("drivers")
      .select("id, full_name")
      .in("id", driverIds);
    for (const d of drvs ?? []) {
      nameMap.set(`driver:${d.id}`, (d.full_name as string) || (d.id as string));
    }
  }

  return data.map((row) => {
    const base = mapMembership(row as Record<string, unknown>);
    return {
      ...base,
      memberDisplayName:
        nameMap.get(`${base.memberEntityType}:${base.memberEntityId}`) ?? null,
    };
  });
}
