/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import "server-only";
import { createSupabaseAdminClient } from "../supabase/server";
import { matchesRegion } from "../auth/region";
import { newMarshalId } from "@/lib/domain/ids";
import { AppError } from "@/lib/api/errors";

export interface MarshalRow {
  id: string;
  staffNumber: string | null;
  firstName: string;
  surname: string;
  fullName: string;
  phone: string | null;
  cellNo: string | null;
  homeTelNo: string | null;
  whatsappNo: string | null;
  idNumber: string | null;
  region: string;
  terminalName: string;
  assignedRouteId: string | null;
  terminalId: string | null;
  badgeNumber: string | null;
  position: string | null;
  isActive: boolean;
  authUserId: string | null;
  profilePictureUrl: string | null;
  createdAt: string;
}

const SELECT_COLUMNS = `
  id, staff_number, first_name, surname, position, residential_address,
  home_tel_no, cell_no, id_number, chief_of_area, indvuna, marital_status,
  partner_name, number_of_kids, next_of_kin_full_name, next_of_kin_relationship,
  next_of_kin_contact_number, region, agreement_accepted, registration_date,
  field_officer_name, notes, photo_storage_path, signature_storage_path,
  photo_data_url, signature_data_url, created_at, updated_at, synced_at,
  sync_status, server_created_at, server_updated_at, whatsapp_no, auth_user_id,
  is_active, last_login_at, assigned_route_id, terminal_id, version
`;

function mapMarshal(row: Record<string, unknown>): MarshalRow {
  const serverCreatedAt = row.server_created_at as string | null;
  const createdAtBigint = row.created_at as number | null;
  const createdAtIso =
    serverCreatedAt ??
    (createdAtBigint
      ? new Date(createdAtBigint).toISOString()
      : new Date().toISOString());

  return {
    id: row.id as string,
    staffNumber: (row.staff_number as string | null) ?? null,
    firstName: (row.first_name as string) ?? "",
    surname: (row.surname as string) ?? "",
    fullName: `${row.first_name ?? ""} ${row.surname ?? ""}`.trim(),
    phone: (row.cell_no as string | null) ?? null,
    cellNo: (row.cell_no as string | null) ?? null,
    homeTelNo: (row.home_tel_no as string | null) ?? null,
    whatsappNo: (row.whatsapp_no as string | null) ?? null,
    idNumber: (row.id_number as string | null) ?? null,
    region: (row.region as string) ?? "",
    terminalName: (row.position as string) ?? "Terminal",
    assignedRouteId: (row.assigned_route_id as string | null) ?? null,
    terminalId: (row.terminal_id as string | null) ?? null,
    badgeNumber: null,
    position: (row.position as string | null) ?? null,
    isActive: (row.is_active as boolean) ?? true,
    authUserId: (row.auth_user_id as string | null) ?? null,
    profilePictureUrl: (row.photo_storage_path as string | null) ?? null,
    createdAt: createdAtIso,
  };
}

export async function listMarshals(
  regionScope: string | null = null,
  opts?: { offset?: number; limit?: number }
): Promise<{ rows: MarshalRow[]; total: number }> {
  const admin = createSupabaseAdminClient();
  const offset = opts?.offset ?? 0;
  const limit = opts?.limit ?? 50;

  // When region-scoped we may still need a client filter (matchesRegion),
  // so fetch a bounded window + count.
  let countQuery = admin
    .from("marshals")
    .select("id", { count: "exact", head: true });
  if (regionScope) {
    countQuery = countQuery.ilike("region", regionScope);
  }
  const { count: rawCount } = await countQuery;

  let query = admin
    .from("marshals")
    .select(SELECT_COLUMNS)
    .order("server_created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (regionScope) {
    query = query.ilike("region", regionScope);
  }

  const { data, error } = await query;

  if (error) {
    console.error("[admin/marshals] list error:", error);
    throw AppError.internal(`Failed to list marshals: ${error.message}`, error);
  }

  let rows = (data ?? []).map(mapMarshal);
  if (regionScope) {
    rows = rows.filter((m) => matchesRegion(regionScope, m.region));
  }

  return {
    rows,
    total: typeof rawCount === "number" ? rawCount : rows.length,
  };
}

export async function getMarshalById(id: string): Promise<MarshalRow | null> {
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("marshals")
    .select(SELECT_COLUMNS)
    .eq("id", id)
    .maybeSingle();

  if (error) {
    console.error("[admin/marshals] getById error:", error);
    throw AppError.internal(`Failed to load marshal: ${error.message}`, error);
  }
  return data ? mapMarshal(data) : null;
}

export interface CreateMarshalInput {
  firstName: string;
  surname: string;
  phone: string;
  cellNo?: string;
  homeTelNo?: string;
  whatsappNo?: string;
  idNumber?: string;
  region: string;
  terminalName?: string;
  terminalId?: string | null;
  assignedRouteId?: string | null;
  position?: string;
  residentialAddress?: string;
  chiefOfArea?: string;
  indvuna?: string;
  maritalStatus?: string;
  numberOfKids?: number;
  nextOfKinFullName?: string;
  nextOfKinRelationship?: string;
  nextOfKinContactNumber?: string;
}

export async function createMarshal(input: CreateMarshalInput): Promise<{
  success: boolean;
  marshal?: MarshalRow;
  error?: string;
}> {
  const admin = createSupabaseAdminClient();
  const cellNo = input.cellNo || input.phone;

  if (input.idNumber) {
    const { data: existing } = await admin
      .from("marshals")
      .select("id")
      .eq("id_number", input.idNumber)
      .maybeSingle();
    if (existing) {
      return {
        success: false,
        error: "A marshal with that National ID already exists.",
      };
    }
  }

  if (cellNo) {
    const { data: existing } = await admin
      .from("marshals")
      .select("id")
      .eq("cell_no", cellNo)
      .maybeSingle();
    if (existing) {
      return {
        success: false,
        error: "A marshal with that cell number already exists.",
      };
    }
  }

  if (input.assignedRouteId) {
    await admin
      .from("marshals")
      .update({
        assigned_route_id: null,
        updated_at: Date.now(),
        synced_at: Date.now(),
        sync_status: "synced",
      })
      .eq("assigned_route_id", input.assignedRouteId)
      .eq("is_active", true);
  }

  const id = newMarshalId();
  const now = Date.now();

  const { data, error } = await admin
    .from("marshals")
    .insert({
      id,
      staff_number: "04",
      first_name: input.firstName,
      surname: input.surname,
      position: input.terminalName || input.position || "Terminal",
      residential_address: input.residentialAddress ?? "",
      home_tel_no: input.homeTelNo ?? "N/A",
      cell_no: cellNo,
      id_number: input.idNumber ?? "",
      chief_of_area: input.chiefOfArea ?? "",
      indvuna: input.indvuna ?? "",
      marital_status: input.maritalStatus ?? "Single",
      number_of_kids: input.numberOfKids ?? 0,
      next_of_kin_full_name: input.nextOfKinFullName ?? "",
      next_of_kin_relationship: input.nextOfKinRelationship ?? "",
      next_of_kin_contact_number: input.nextOfKinContactNumber ?? "",
      region: input.region,
      agreement_accepted: true,
      registration_date: new Date().toISOString().split("T")[0],
      whatsapp_no: input.whatsappNo || cellNo,
      assigned_route_id: input.assignedRouteId ?? null,
      terminal_id: input.terminalId ?? null,
      is_active: true,
      created_at: now,
      updated_at: now,
      synced_at: now,
      sync_status: "synced",
    })
    .select(SELECT_COLUMNS)
    .single();

  if (error || !data) {
    console.error("[admin/marshals] insert error:", error);
    return { success: false, error: error?.message ?? "Insert failed" };
  }

  return { success: true, marshal: mapMarshal(data) };
}

export async function updateMarshal(
  id: string,
  input: Partial<CreateMarshalInput & { isActive: boolean }>
): Promise<{ success: boolean; error?: string }> {
  const admin = createSupabaseAdminClient();

  if (input.assignedRouteId) {
    await admin
      .from("marshals")
      .update({
        assigned_route_id: null,
        updated_at: Date.now(),
        synced_at: Date.now(),
        sync_status: "synced",
      })
      .eq("assigned_route_id", input.assignedRouteId)
      .eq("is_active", true)
      .neq("id", id);
  }

  const patch: Record<string, unknown> = {};

  if (input.firstName !== undefined) patch.first_name = input.firstName;
  if (input.surname !== undefined) patch.surname = input.surname;
  if (input.cellNo !== undefined) patch.cell_no = input.cellNo;
  else if (input.phone !== undefined) patch.cell_no = input.phone;
  if (input.homeTelNo !== undefined) patch.home_tel_no = input.homeTelNo;
  if (input.whatsappNo !== undefined) patch.whatsapp_no = input.whatsappNo;
  if (input.idNumber !== undefined) patch.id_number = input.idNumber;
  if (input.region !== undefined) patch.region = input.region;
  if (input.assignedRouteId !== undefined)
    patch.assigned_route_id = input.assignedRouteId;
  if (input.terminalId !== undefined) patch.terminal_id = input.terminalId;
  if (input.terminalName !== undefined) patch.position = input.terminalName;
  else if (input.position !== undefined) patch.position = input.position;
  if (input.residentialAddress !== undefined)
    patch.residential_address = input.residentialAddress;
  if (input.chiefOfArea !== undefined) patch.chief_of_area = input.chiefOfArea;
  if (input.indvuna !== undefined) patch.indvuna = input.indvuna;
  if (input.maritalStatus !== undefined)
    patch.marital_status = input.maritalStatus;
  if (input.numberOfKids !== undefined)
    patch.number_of_kids = input.numberOfKids;
  if (input.nextOfKinFullName !== undefined)
    patch.next_of_kin_full_name = input.nextOfKinFullName;
  if (input.nextOfKinRelationship !== undefined)
    patch.next_of_kin_relationship = input.nextOfKinRelationship;
  if (input.nextOfKinContactNumber !== undefined)
    patch.next_of_kin_contact_number = input.nextOfKinContactNumber;
  if (input.isActive !== undefined) patch.is_active = input.isActive;

  patch.updated_at = Date.now();
  patch.synced_at = Date.now();
  patch.sync_status = "synced";

  const { error } = await admin.from("marshals").update(patch).eq("id", id);
  if (error) {
    console.error("[admin/marshals] update error:", error);
    return { success: false, error: error.message };
  }
  return { success: true };
}

export async function deactivateMarshal(
  id: string
): Promise<{ success: boolean; error?: string }> {
  const admin = createSupabaseAdminClient();
  const { error } = await admin
    .from("marshals")
    .update({
      is_active: false,
      assigned_route_id: null,
      updated_at: Date.now(),
      synced_at: Date.now(),
      sync_status: "synced",
    })
    .eq("id", id);
  if (error) {
    console.error("[admin/marshals] deactivate error:", error);
    return { success: false, error: error.message };
  }
  return { success: true };
}
