/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Typed DB queries for staff. Uses the admin client (server-only).
 */

import "server-only";
import { createSupabaseAdminClient } from "../supabase/server";

export interface StaffRow {
  id: string;
  authUserId: string;
  fullName: string;
  email: string;
  phone: string | null;
  role: string;
  region: string | null;
  terminalId: string | null;
  isActive: boolean;
  lastLoginAt: string | null;
  createdAt: string;
  updatedAt: string;
}

function mapRow(row: Record<string, unknown>): StaffRow {
  return {
    id: row.id as string,
    authUserId: row.auth_user_id as string,
    fullName: row.full_name as string,
    email: row.email as string,
    phone: (row.phone as string | null) ?? null,
    role: row.role as string,
    region: (row.region as string | null) ?? null,
    terminalId: (row.terminal_id as string | null) ?? null,
    isActive: (row.is_active as boolean | null) ?? true,
    lastLoginAt: (row.last_login_at as string | null) ?? null,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

export async function listStaff(): Promise<StaffRow[]> {
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("staff")
    .select(
      "id, auth_user_id, full_name, email, phone, role, region, terminal_id, is_active, last_login_at, created_at, updated_at"
    )
    .order("created_at", { ascending: false });

  if (error) throw new Error(`Failed to list staff: ${error.message}`);
  return (data ?? []).map(mapRow);
}

export async function getStaffById(id: string): Promise<StaffRow | null> {
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("staff")
    .select(
      "id, auth_user_id, full_name, email, phone, role, region, terminal_id, is_active, last_login_at, created_at, updated_at"
    )
    .eq("id", id)
    .maybeSingle();

  if (error) throw new Error(`Failed to fetch staff: ${error.message}`);
  return data ? mapRow(data) : null;
}

export async function getStaffByAuthUserId(
  authUserId: string
): Promise<StaffRow | null> {
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("staff")
    .select(
      "id, auth_user_id, full_name, email, phone, role, region, terminal_id, is_active, last_login_at, created_at, updated_at"
    )
    .eq("auth_user_id", authUserId)
    .maybeSingle();

  if (error) throw new Error(`Failed to fetch staff by auth id: ${error.message}`);
  return data ? mapRow(data) : null;
}
