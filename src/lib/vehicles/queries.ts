/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import "server-only";
import { createSupabaseAdminClient } from "../supabase/server";

export interface VehicleRow {
  registrationNumber: string;
  vic: string | null;
  make: string;
  model: string;
  seatingCapacity: number;
  classification: string;
  routeAssignmentId: string | null;
  loadingBay: string | null;

  ownerName: string | null;
  ownerPhone: string | null;
  ownerOperatorId: string | null;

  driverId: string | null;
  driverName: string | null; // joined

  status: string;
  currentQueuePosition: number;

  permitNumber: string | null;
  permitStatus: string | null;
  permitIssueDate: string | null;
  permitExpiryDate: string | null;

  cofNumber: string | null;
  cofIssueDate: string | null;
  cofExpiryDate: string | null;
  lastInspectionDate: string | null;

  association: string | null;
  insuranceExpiry: string | null;
  roadworthinessExpiry: string | null;

  isMidMonthAddition: boolean;
  registrationDate: string | null;
  monthRegistered: string | null;
  midMonthJoinDay: number | null;
  monthlySequenceBaseIndex: number | null;

  vehiclePhotoUrl: string | null;

  createdAt: string;
  updatedAt: string;
}

const SELECT_COLUMNS = `
  registration_number, vic, make, model, seating_capacity, classification,
  route_assignment_id, loading_bay,
  owner_name, owner_phone, owner_operator_id,
  driver_id, status, current_queue_position,
  permit_number, permit_status, permit_issue_date, permit_expiry_date,
  cof_number, cof_issue_date, cof_expiry_date, last_inspection_date,
  association, insurance_expiry, roadworthiness_expiry,
  is_mid_month_addition, registration_date, month_registered,
  mid_month_join_day, monthly_sequence_base_index,
  created_at, updated_at
`;

function mapRow(
  row: Record<string, unknown>,
  driverName: string | null = null
): VehicleRow {
  return {
    registrationNumber: row.registration_number as string,
    vic: (row.vic as string | null) ?? null,
    make: row.make as string,
    model: row.model as string,
    seatingCapacity: row.seating_capacity as number,
    classification: row.classification as string,
    routeAssignmentId: (row.route_assignment_id as string | null) ?? null,
    loadingBay: (row.loading_bay as string | null) ?? null,
    ownerName: (row.owner_name as string | null) ?? null,
    ownerPhone: (row.owner_phone as string | null) ?? null,
    ownerOperatorId: (row.owner_operator_id as string | null) ?? null,
    driverId: (row.driver_id as string | null) ?? null,
    driverName,
    status: row.status as string,
    currentQueuePosition: (row.current_queue_position as number) ?? 0,
    permitNumber: (row.permit_number as string | null) ?? null,
    permitStatus: (row.permit_status as string | null) ?? null,
    permitIssueDate: (row.permit_issue_date as string | null) ?? null,
    permitExpiryDate: (row.permit_expiry_date as string | null) ?? null,
    cofNumber: (row.cof_number as string | null) ?? null,
    cofIssueDate: (row.cof_issue_date as string | null) ?? null,
    cofExpiryDate: (row.cof_expiry_date as string | null) ?? null,
    lastInspectionDate: (row.last_inspection_date as string | null) ?? null,
    association: (row.association as string | null) ?? null,
    insuranceExpiry: (row.insurance_expiry as string | null) ?? null,
    roadworthinessExpiry: (row.roadworthiness_expiry as string | null) ?? null,
    isMidMonthAddition: (row.is_mid_month_addition as boolean) ?? false,
    registrationDate: (row.registration_date as string | null) ?? null,
    monthRegistered: (row.month_registered as string | null) ?? null,
    midMonthJoinDay: (row.mid_month_join_day as number | null) ?? null,
    monthlySequenceBaseIndex:
      (row.monthly_sequence_base_index as number | null) ?? null,
    vehiclePhotoUrl: null, // not in DB — placeholder
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

export async function listVehicles(): Promise<VehicleRow[]> {
  const admin = createSupabaseAdminClient();

  const { data, error } = await admin
    .from("vehicles")
    .select(SELECT_COLUMNS)
    .order("created_at", { ascending: false });

  if (error) throw new Error(`Failed to list vehicles: ${error.message}`);
  if (!data) return [];

  // Join driver names
  const driverIds = data
    .map((v) => v.driver_id as string | null)
    .filter((id): id is string => !!id);

  const driverNames = new Map<string, string>();
  if (driverIds.length > 0) {
    const { data: driversData } = await admin
      .from("drivers")
      .select("id, full_name")
      .in("id", driverIds);
    for (const d of driversData ?? []) {
      driverNames.set(d.id as string, d.full_name as string);
    }
  }

  return data.map((row) => {
    const driverId = row.driver_id as string | null;
    return mapRow(row, driverId ? driverNames.get(driverId) ?? null : null);
  });
}

export async function getVehicleByReg(
  reg: string
): Promise<VehicleRow | null> {
  const admin = createSupabaseAdminClient();

  const { data, error } = await admin
    .from("vehicles")
    .select(SELECT_COLUMNS)
    .eq("registration_number", reg.toUpperCase())
    .maybeSingle();

  if (error) throw new Error(`Failed to fetch vehicle: ${error.message}`);
  if (!data) return null;

  let driverName: string | null = null;
  const driverId = data.driver_id as string | null;
  if (driverId) {
    const { data: driverData } = await admin
      .from("drivers")
      .select("full_name")
      .eq("id", driverId)
      .maybeSingle();
    driverName = (driverData?.full_name as string | undefined) ?? null;
  }

  return mapRow(data, driverName);
}
