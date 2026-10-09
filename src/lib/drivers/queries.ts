/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Region scope via assigned vehicle → route. Unassigned drivers only for national scope.
 * Usernames come from the usernames table — never auth.admin.listUsers on list path.
 */

import "server-only";
import { createSupabaseAdminClient } from "../supabase/server";
import { normalizePlate } from "../domain/identity";

export interface DriverRow {
  id: string;
  fullName: string;
  nationalId: string | null;
  phone: string;
  residentialAddress: string | null;
  dateOfBirth: string | null;
  gender: string | null;
  licenseNumber: string | null;
  licenseClass: string | null;
  pdpNumber: string | null;
  pdpIssueDate: string | null;
  pdpExpiryDate: string | null;
  pdpIssuingAuthority: string | null;
  pdpStatus: string | null;
  emergencyContactName: string | null;
  emergencyContactPhone: string | null;
  emergencyContactRelation: string | null;
  assignedVehicleReg: string | null;
  authUserId: string | null;
  avatarSeed: string | null;
  profilePictureUrl: string | null;
  status: string;
  region: string | null;
  username: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ListDriversOptions {
  /** null = national */
  regionScope?: string | null;
  /** Cap rows after region filter. Omit for full set (still no listUsers). */
  limit?: number;
  offset?: number;
}

const SELECT_COLUMNS = `
  id, full_name, national_id, phone, residential_address, date_of_birth, gender,
  license_number, license_class,
  pdp_number, pdp_issue_date, pdp_expiry_date, pdp_issuing_authority, pdp_status,
  emergency_contact_name, emergency_contact_phone, emergency_contact_relation,
  assigned_vehicle_reg, auth_user_id,
  avatar_seed, profile_picture_url,
  status,
  created_at, updated_at
`;

function mapRow(
  row: Record<string, unknown>,
  username: string | null = null,
  region: string | null = null
): DriverRow {
  return {
    id: row.id as string,
    fullName: row.full_name as string,
    nationalId: (row.national_id as string | null) ?? null,
    phone: row.phone as string,
    residentialAddress: (row.residential_address as string | null) ?? null,
    dateOfBirth: (row.date_of_birth as string | null) ?? null,
    gender: (row.gender as string | null) ?? null,
    licenseNumber: (row.license_number as string | null) ?? null,
    licenseClass: (row.license_class as string | null) ?? null,
    pdpNumber: (row.pdp_number as string | null) ?? null,
    pdpIssueDate: (row.pdp_issue_date as string | null) ?? null,
    pdpExpiryDate: (row.pdp_expiry_date as string | null) ?? null,
    pdpIssuingAuthority: (row.pdp_issuing_authority as string | null) ?? null,
    pdpStatus: (row.pdp_status as string | null) ?? null,
    emergencyContactName: (row.emergency_contact_name as string | null) ?? null,
    emergencyContactPhone: (row.emergency_contact_phone as string | null) ?? null,
    emergencyContactRelation:
      (row.emergency_contact_relation as string | null) ?? null,
    assignedVehicleReg: (row.assigned_vehicle_reg as string | null) ?? null,
    authUserId: (row.auth_user_id as string | null) ?? null,
    avatarSeed: (row.avatar_seed as string | null) ?? null,
    profilePictureUrl: (row.profile_picture_url as string | null) ?? null,
    status: row.status as string,
    region,
    username,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

async function plateToRegionMap(
  plates: string[]
): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  if (plates.length === 0) return map;
  const admin = createSupabaseAdminClient();
  const { data: vehicles } = await admin
    .from("vehicles")
    .select("registration_number, route_assignment_id")
    .in("registration_number", plates);

  const routeIds = [
    ...new Set(
      (vehicles ?? [])
        .map((v) => v.route_assignment_id as string | null)
        .filter((id): id is string => !!id)
    ),
  ];
  if (routeIds.length === 0) return map;

  const { data: routes } = await admin
    .from("routes")
    .select("id, region_code")
    .in("id", routeIds);

  const routeRegion = new Map<string, string>();
  for (const r of routes ?? []) {
    if (r.region_code) routeRegion.set(r.id as string, r.region_code as string);
  }

  for (const v of vehicles ?? []) {
    const reg = normalizePlate(v.registration_number as string);
    const rid = v.route_assignment_id as string | null;
    if (rid && routeRegion.has(rid)) {
      map.set(reg, routeRegion.get(rid)!);
    }
  }
  return map;
}

async function platesInRegion(regionScope: string): Promise<Set<string>> {
  const admin = createSupabaseAdminClient();
  const { data: routes } = await admin
    .from("routes")
    .select("id")
    .ilike("region_code", regionScope);
  const routeIds = (routes ?? []).map((r) => r.id as string);
  if (routeIds.length === 0) return new Set();

  const { data: vehicles } = await admin
    .from("vehicles")
    .select("registration_number")
    .in("route_assignment_id", routeIds);

  return new Set(
    (vehicles ?? []).map((v) =>
      normalizePlate(v.registration_number as string)
    )
  );
}

/** Batch username lookup — usernames table only (no Auth Admin scan). */
async function usernamesByAuthIds(
  authIds: string[]
): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  if (authIds.length === 0) return map;
  const admin = createSupabaseAdminClient();
  try {
    // Chunk to stay under PostgREST URL limits
    for (let i = 0; i < authIds.length; i += 200) {
      const chunk = authIds.slice(i, i + 200);
      const { data } = await admin
        .from("usernames")
        .select("username, auth_user_id")
        .in("auth_user_id", chunk);
      for (const row of data ?? []) {
        if (row.auth_user_id && row.username) {
          map.set(String(row.auth_user_id), String(row.username));
        }
      }
    }
  } catch {
    /* table missing — usernames stay null */
  }
  return map;
}

/**
 * @param regionScope null = national (all drivers + unassigned)
 * @param options.limit / offset for page slices after region filter
 */
export async function listDrivers(
  regionScope: string | null = null,
  options?: { limit?: number; offset?: number }
): Promise<DriverRow[]> {
  const admin = createSupabaseAdminClient();

  // Hard DB cap so we never pull unbounded rows into the function
  const dbLimit = Math.min(
    Math.max(options?.limit ? options.limit + (options.offset ?? 0) + 50 : 2000, 50),
    3000
  );

  const { data, error } = await admin
    .from("drivers")
    .select(SELECT_COLUMNS)
    .order("created_at", { ascending: false })
    .limit(dbLimit);

  if (error) throw new Error(`Failed to list drivers: ${error.message}`);
  if (!data || data.length === 0) return [];

  let rows = data as Record<string, unknown>[];

  if (regionScope) {
    const allowedPlates = await platesInRegion(regionScope);
    rows = rows.filter((d) => {
      const plate = d.assigned_vehicle_reg
        ? normalizePlate(d.assigned_vehicle_reg as string)
        : null;
      if (!plate) return false;
      return allowedPlates.has(plate);
    });
  }

  if (options?.offset != null || options?.limit != null) {
    const offset = options.offset ?? 0;
    const limit = options.limit ?? 100;
    rows = rows.slice(offset, offset + limit);
  }

  const plates = rows
    .map((d) =>
      d.assigned_vehicle_reg
        ? normalizePlate(d.assigned_vehicle_reg as string)
        : null
    )
    .filter((p): p is string => !!p);

  const regionByPlate = await plateToRegionMap(plates);

  const authIds = rows
    .map((d) => d.auth_user_id as string | null)
    .filter((id): id is string => !!id);

  const usernameMap = await usernamesByAuthIds(authIds);

  return rows.map((row) => {
    const authUserId = row.auth_user_id as string | null;
    const username = authUserId ? usernameMap.get(authUserId) ?? null : null;
    const plate = row.assigned_vehicle_reg
      ? normalizePlate(row.assigned_vehicle_reg as string)
      : null;
    const region = plate ? regionByPlate.get(plate) ?? null : null;
    return mapRow(row, username, region);
  });
}

export async function getDriverById(id: string): Promise<DriverRow | null> {
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("drivers")
    .select(SELECT_COLUMNS)
    .eq("id", id)
    .maybeSingle();

  if (error) throw new Error(`Failed to fetch driver: ${error.message}`);
  if (!data) return null;

  let username: string | null = null;
  const authUserId = data.auth_user_id as string | null;
  if (authUserId) {
    const map = await usernamesByAuthIds([authUserId]);
    username = map.get(authUserId) ?? null;
  }

  let region: string | null = null;
  if (data.assigned_vehicle_reg) {
    const m = await plateToRegionMap([
      normalizePlate(data.assigned_vehicle_reg as string),
    ]);
    region =
      m.get(normalizePlate(data.assigned_vehicle_reg as string)) ?? null;
  }

  return mapRow(data as Record<string, unknown>, username, region);
}

export async function getDriverByPhone(
  phone: string
): Promise<DriverRow | null> {
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("drivers")
    .select(SELECT_COLUMNS)
    .eq("phone", phone)
    .maybeSingle();

  if (error) throw new Error(`Failed to fetch driver by phone: ${error.message}`);
  return data ? mapRow(data as Record<string, unknown>) : null;
}
