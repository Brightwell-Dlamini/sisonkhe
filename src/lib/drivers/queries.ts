/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import "server-only";
import { createSupabaseAdminClient } from "../supabase/server";

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

  username: string | null; // from auth.users.user_metadata

  createdAt: string;
  updatedAt: string;
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

function mapRow(row: Record<string, unknown>, username: string | null = null): DriverRow {
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
    emergencyContactRelation: (row.emergency_contact_relation as string | null) ?? null,
    assignedVehicleReg: (row.assigned_vehicle_reg as string | null) ?? null,
    authUserId: (row.auth_user_id as string | null) ?? null,
    avatarSeed: (row.avatar_seed as string | null) ?? null,
    profilePictureUrl: (row.profile_picture_url as string | null) ?? null,
    status: row.status as string,
    username,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

/**
 * Fetch all drivers with their auth usernames joined in.
 * Username comes from auth.users.user_metadata.username.
 */
export async function listDrivers(): Promise<DriverRow[]> {
  const admin = createSupabaseAdminClient();

  const { data, error } = await admin
    .from("drivers")
    .select(SELECT_COLUMNS)
    .order("created_at", { ascending: false });

  if (error) throw new Error(`Failed to list drivers: ${error.message}`);
  if (!data) return [];

  // Fetch usernames for those with auth_user_id
  const authIds = data
    .map((d) => d.auth_user_id as string | null)
    .filter((id): id is string => !!id);

  const usernameMap = new Map<string, string>();
  if (authIds.length > 0) {
    // listUsers paginates; perPage max is 1000. Our driver count is fine for now.
    const { data: usersData } = await admin.auth.admin.listUsers({
      perPage: 1000,
    });
    for (const u of usersData?.users ?? []) {
      if (authIds.includes(u.id)) {
        const uname = u.user_metadata?.username as string | undefined;
        if (uname) usernameMap.set(u.id, uname);
      }
    }
  }

  return data.map((row) => {
    const authUserId = row.auth_user_id as string | null;
    const username = authUserId ? usernameMap.get(authUserId) ?? null : null;
    return mapRow(row, username);
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
    const { data: userData } = await admin.auth.admin.getUserById(authUserId);
    username = (userData?.user?.user_metadata?.username as string | undefined) ?? null;
  }

  return mapRow(data, username);
}

export async function getDriverByPhone(phone: string): Promise<DriverRow | null> {
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("drivers")
    .select(SELECT_COLUMNS)
    .eq("phone", phone)
    .maybeSingle();

  if (error) throw new Error(`Failed to fetch driver by phone: ${error.message}`);
  return data ? mapRow(data) : null;
}
