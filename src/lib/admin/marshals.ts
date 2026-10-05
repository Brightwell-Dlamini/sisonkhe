/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Marshal admin queries. Portal registration schema is the source of truth.
 * Avoid selecting columns that may not exist on the portal table.
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

function str(v: unknown): string | null {
  if (v == null) return null;
  const s = String(v).trim();
  return s.length ? s : null;
}

function mapMarshal(row: Record<string, unknown>): MarshalRow {
  const firstName = str(row.first_name) ?? "";
  const surname = str(row.surname) ?? "";
  const phone = str(row.phone) ?? str(row.cell_no);
  const cellNo = str(row.cell_no) ?? phone;
  const position = str(row.position);

  return {
    id: String(row.id),
    staffNumber: str(row.staff_number),
    firstName,
    surname,
    fullName: `${firstName} ${surname}`.trim() || "Marshal",
    phone,
    cellNo,
    whatsappNo: str(row.whatsapp_no) ?? cellNo,
    idNumber: str(row.id_number),
    region: str(row.region) ?? "—",
    terminalName: position ?? "Terminal",
    assignedRouteId: str(row.assigned_route_id),
    badgeNumber: str(row.badge_number),
    position,
    // Portal often leaves is_active NULL → treat as active
    isActive: row.is_active === false ? false : true,
    authUserId: str(row.auth_user_id),
    profilePictureUrl: str(row.profile_picture_url),
    createdAt:
      row.created_at != null
        ? typeof row.created_at === "number"
          ? new Date(row.created_at).toISOString()
          : String(row.created_at)
        : new Date().toISOString(),
  };
}

/**
 * Columns known on the registration-portal marshals table.
 * Do not add speculative columns here — missing columns make PostgREST fail
 * the whole select and the UI shows an empty list.
 */
const SELECT_COLUMNS =
  "id, staff_number, first_name, surname, phone, cell_no, whatsapp_no, id_number, region, position, is_active, auth_user_id, created_at";

export async function listMarshals(): Promise<MarshalRow[]> {
  const admin = createSupabaseAdminClient();

  // Prefer ordered list; fall back without order if created_at is awkward type
  let { data, error } = await admin
    .from("marshals")
    .select(SELECT_COLUMNS)
    .order("surname", { ascending: true });

  if (error) {
    console.error("[admin/marshals] list error:", error.message, error);
    // Retry with minimal columns only
    const retry = await admin
      .from("marshals")
      .select(
        "id, first_name, surname, phone, cell_no, id_number, region, is_active, auth_user_id"
      );
    if (retry.error) {
      console.error("[admin/marshals] minimal list error:", retry.error.message);
      throw new Error(
        `Could not load marshals: ${retry.error.message}`
      );
    }
    data = retry.data;
  }

  return (data ?? []).map((row) => mapMarshal(row as Record<string, unknown>));
}

export async function getMarshalById(id: string): Promise<MarshalRow | null> {
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("marshals")
    .select(SELECT_COLUMNS)
    .eq("id", id)
    .maybeSingle();

  if (error) {
    console.error("[admin/marshals] get error:", error.message);
    const retry = await admin
      .from("marshals")
      .select(
        "id, first_name, surname, phone, cell_no, id_number, region, is_active, auth_user_id"
      )
      .eq("id", id)
      .maybeSingle();
    if (retry.error || !retry.data) return null;
    return mapMarshal(retry.data as Record<string, unknown>);
  }

  return data ? mapMarshal(data as Record<string, unknown>) : null;
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

  if (input.cellNo) {
    const { data: existing } = await admin
      .from("marshals")
      .select("id")
      .eq("cell_no", input.cellNo)
      .maybeSingle();
    if (existing) {
      return {
        success: false,
        error: "A marshal with that cell number already exists.",
      };
    }
  }

  const id = `marshal-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

  const insertPayload: Record<string, unknown> = {
    id,
    first_name: input.firstName,
    surname: input.surname,
    phone: input.phone,
    cell_no: input.cellNo || input.phone,
    whatsapp_no: input.whatsappNo || input.cellNo || input.phone,
    id_number: input.idNumber || null,
    region: input.region,
    position: input.terminalName || input.position || "Terminal",
    is_active: true,
  };

  const { data, error } = await admin
    .from("marshals")
    .insert(insertPayload)
    .select(SELECT_COLUMNS)
    .single();

  if (error || !data) {
    // Retry insert with absolute minimum columns
    if (error) {
      console.error("[admin/marshals] insert error:", error.message);
      const minimal = await admin
        .from("marshals")
        .insert({
          id,
          first_name: input.firstName,
          surname: input.surname,
          phone: input.phone,
          cell_no: input.cellNo || input.phone,
          id_number: input.idNumber || null,
          region: input.region,
          is_active: true,
        })
        .select(
          "id, first_name, surname, phone, cell_no, id_number, region, is_active, auth_user_id"
        )
        .single();
      if (minimal.error || !minimal.data) {
        return {
          success: false,
          error: minimal.error?.message ?? error.message ?? "Insert failed",
        };
      }
      return {
        success: true,
        marshal: mapMarshal(minimal.data as Record<string, unknown>),
      };
    }
    return { success: false, error: "Insert failed" };
  }

  return {
    success: true,
    marshal: mapMarshal(data as Record<string, unknown>),
  };
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
  if (input.terminalName !== undefined) patch.position = input.terminalName;
  if (input.position !== undefined) patch.position = input.position;
  if (input.isActive !== undefined) patch.is_active = input.isActive;

  const { error } = await admin.from("marshals").update(patch).eq("id", id);
  if (error) return { success: false, error: error.message };
  return { success: true };
}

export async function deactivateMarshal(
  id: string
): Promise<{ success: boolean; error?: string }> {
  const admin = createSupabaseAdminClient();
  const { error } = await admin
    .from("marshals")
    .update({ is_active: false })
    .eq("id", id);
  if (error) return { success: false, error: error.message };
  return { success: true };
}
