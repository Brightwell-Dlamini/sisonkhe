/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Marshal admin queries. Full CRUD + card issuance.
 */

import "server-only";
import { createSupabaseAdminClient } from "../supabase/server";

export interface MarshalRow {
  id: string;
  staffNumber: string | null;
  firstName: string;
  surname: string;
  fullName: string;
  phone: string | null;
  cellNo: string | null;
  whatsappNo: string | null;
  idNumber: string | null;
  region: string;
  terminalName: string;
  assignedRouteId: string | null;
  badgeNumber: string | null;
  position: string | null;
  isActive: boolean;
  authUserId: string | null;
  profilePictureUrl: string | null;
  createdAt: string;
}

function mapMarshal(row: Record<string, unknown>): MarshalRow {
  return {
    id: row.id as string,
    staffNumber: (row.staff_number as string | null) ?? null,
    firstName: row.first_name as string,
    surname: row.surname as string,
    fullName: `${row.first_name} ${row.surname}`.trim(),
    phone: (row.phone as string | null) ?? null,
    cellNo: (row.cell_no as string | null) ?? null,
    whatsappNo: (row.whatsapp_no as string | null) ?? null,
    idNumber: (row.id_number as string | null) ?? null,
    region: row.region as string,
    terminalName: (row.position as string) ?? "Terminal",
    assignedRouteId: (row.assigned_route_id as string | null) ?? null,
    badgeNumber: (row.badge_number as string | null) ?? null,
    position: (row.position as string | null) ?? null,
    isActive: (row.is_active as boolean) ?? true,
    authUserId: (row.auth_user_id as string | null) ?? null,
    profilePictureUrl: (row.profile_picture_url as string | null) ?? null,
    createdAt: (row.created_at as string | null) ?? new Date().toISOString(),
  };
}

const SELECT_COLUMNS = `
  id, staff_number, first_name, surname, phone, cell_no, whatsapp_no, id_number,
  region, position, assigned_route_id, badge_number, is_active, auth_user_id,
  profile_picture_url, created_at
`;

export async function listMarshals(): Promise<MarshalRow[]> {
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("marshals")
    .select(SELECT_COLUMNS)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[admin/marshals] list error:", error);
    return [];
  }
  return (data ?? []).map(mapMarshal);
}

export async function getMarshalById(id: string): Promise<MarshalRow | null> {
  const admin = createSupabaseAdminClient();
  const { data } = await admin
    .from("marshals")
    .select(SELECT_COLUMNS)
    .eq("id", id)
    .maybeSingle();
  return data ? mapMarshal(data) : null;
}

export interface CreateMarshalInput {
  firstName: string;
  surname: string;
  phone: string;
  cellNo?: string;
  whatsappNo?: string;
  idNumber?: string;
  region: string;
  terminalName?: string;
  assignedRouteId?: string | null;
  badgeNumber?: string;
  position?: string;
}

export async function createMarshal(input: CreateMarshalInput): Promise<{
  success: boolean;
  marshal?: MarshalRow;
  error?: string;
}> {
  const admin = createSupabaseAdminClient();

  // Unique checks
  if (input.idNumber) {
    const { data: existing } = await admin
      .from("marshals")
      .select("id")
      .eq("id_number", input.idNumber)
      .maybeSingle();
    if (existing) {
      return { success: false, error: "A marshal with that National ID already exists." };
    }
  }

  if (input.cellNo) {
    const { data: existing } = await admin
      .from("marshals")
      .select("id")
      .eq("cell_no", input.cellNo)
      .maybeSingle();
    if (existing) {
      return { success: false, error: "A marshal with that cell number already exists." };
    }
  }

  const id = `marshal-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

  const { data, error } = await admin
    .from("marshals")
    .insert({
      id,
      first_name: input.firstName,
      surname: input.surname,
      phone: input.phone,
      cell_no: input.cellNo || input.phone,
      whatsapp_no: input.whatsappNo || input.cellNo || input.phone,
      id_number: input.idNumber || null,
      region: input.region,
      position: input.terminalName || input.position || "Terminal",
      assigned_route_id: input.assignedRouteId || null,
      badge_number: input.badgeNumber || null,
      is_active: true,
      staff_number: "04",
      residential_address: "",
      chief_of_area: "",
      indvuna: "",
      marital_status: "Single",
      number_of_kids: 0,
      next_of_kin_full_name: "",
      next_of_kin_relationship: "",
      next_of_kin_contact_number: "",
      agreement_accepted: true,
      registration_date: new Date().toISOString().split("T")[0],
      created_at: Date.now(),
      updated_at: Date.now(),
      sync_status: "synced",
    })
    .select(SELECT_COLUMNS)
    .single();

  if (error || !data) {
    return { success: false, error: error?.message ?? "Insert failed" };
  }

  return { success: true, marshal: mapMarshal(data) };
}

export async function updateMarshal(
  id: string,
  input: Partial<CreateMarshalInput & { isActive: boolean }>
): Promise<{ success: boolean; error?: string }> {
  const admin = createSupabaseAdminClient();
  const patch: Record<string, unknown> = {};
  if (input.firstName !== undefined) patch.first_name = input.firstName;
  if (input.surname !== undefined) patch.surname = input.surname;
  if (input.phone !== undefined) patch.phone = input.phone;
  if (input.cellNo !== undefined) patch.cell_no = input.cellNo;
  if (input.whatsappNo !== undefined) patch.whatsapp_no = input.whatsappNo;
  if (input.idNumber !== undefined) patch.id_number = input.idNumber;
  if (input.region !== undefined) patch.region = input.region;
  if (input.assignedRouteId !== undefined) patch.assigned_route_id = input.assignedRouteId;
  if (input.badgeNumber !== undefined) patch.badge_number = input.badgeNumber;
  if (input.terminalName !== undefined) patch.position = input.terminalName;
  if (input.isActive !== undefined) patch.is_active = input.isActive;
  patch.updated_at = Date.now();

  const { error } = await admin.from("marshals").update(patch).eq("id", id);
  if (error) return { success: false, error: error.message };
  return { success: true };
}

export async function deactivateMarshal(id: string): Promise<{ success: boolean; error?: string }> {
  const admin = createSupabaseAdminClient();
  const { error } = await admin
    .from("marshals")
    .update({ is_active: false, updated_at: Date.now() })
    .eq("id", id);
  if (error) return { success: false, error: error.message };
  return { success: true };
}
