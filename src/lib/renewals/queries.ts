/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import "server-only";
import { createSupabaseAdminClient } from "../supabase/server";
import type { ResolvedUser } from "../auth/roles";
import { writeAudit } from "../domain/audit";
import { normalizePlate, plateKey } from "../domain/identity";
import { randomBytes } from "crypto";

export interface RenewalRow {
  id: string;
  vehicleReg: string;
  fleetId: string | null;
  currentPermitNumber: string | null;
  currentExpiryDate: string | null;
  operator: string | null;
  driver: string | null;
  reasonForRenewal: string;
  comments: string | null;
  supportingDocuments: string[];
  status: "Pending Admin Approval" | "Approved" | "Rejected" | "Printed";
  timestamp: string;
  requestDate: string;

  newPermitNumber: string | null;
  permitIssueDate: string | null;
  permitExpiryDate: string | null;
  cofNumber: string | null;
  cofIssueDate: string | null;
  cofExpiryDate: string | null;
  inspectionDate: string | null;
  licensingOffice: string | null;
  renewalNotes: string | null;
  approvedBy: string | null;
  approvalDate: string | null;

  operatorLicenseNumber: string | null;
  odometerReading: number | null;
  yearOfManufacture: number | null;
  insurancePolicy: string | null;
  concessionId: string | null;

  paidWithMasterCard: boolean;
  masterPaymentRef: string | null;
  renewalFeeAmountSzl: number | null;
}

export async function getVehicleRegsInScope(
  user: ResolvedUser
): Promise<string[] | null> {
  const admin = createSupabaseAdminClient();

  if (user.role === "operator" && user.operatorId) {
    const { data } = await admin
      .from("vehicles")
      .select("registration_number")
      .eq("owner_operator_id", user.operatorId);
    return (data ?? []).map((v) => v.registration_number as string);
  }

  if (user.role === "admin" && user.region) {
    const { data: routes } = await admin
      .from("routes")
      .select("id")
      .ilike("region_code", user.region);
    const routeIds = (routes ?? []).map((r) => r.id as string);
    if (routeIds.length === 0) return [];

    const { data } = await admin
      .from("vehicles")
      .select("registration_number")
      .in("route_assignment_id", routeIds);
    return (data ?? []).map((v) => v.registration_number as string);
  }

  return null;
}

function mapRow(row: Record<string, unknown>): RenewalRow {
  return {
    id: row.id as string,
    vehicleReg: row.vehicle_reg as string,
    fleetId: (row.fleet_id as string | null) ?? null,
    currentPermitNumber: (row.current_permit_number as string | null) ?? null,
    currentExpiryDate: (row.current_expiry_date as string | null) ?? null,
    operator: (row.operator as string | null) ?? null,
    driver: (row.driver as string | null) ?? null,
    reasonForRenewal: row.reason_for_renewal as string,
    comments: (row.comments as string | null) ?? null,
    supportingDocuments: (row.supporting_documents as string[] | null) ?? [],
    status: row.status as RenewalRow["status"],
    timestamp: row.timestamp as string,
    requestDate: row.request_date as string,
    newPermitNumber: (row.new_permit_number as string | null) ?? null,
    permitIssueDate: (row.permit_issue_date as string | null) ?? null,
    permitExpiryDate: (row.permit_expiry_date as string | null) ?? null,
    cofNumber: (row.cof_number as string | null) ?? null,
    cofIssueDate: (row.cof_issue_date as string | null) ?? null,
    cofExpiryDate: (row.cof_expiry_date as string | null) ?? null,
    inspectionDate: (row.inspection_date as string | null) ?? null,
    licensingOffice: (row.licensing_office as string | null) ?? null,
    renewalNotes: (row.renewal_notes as string | null) ?? null,
    approvedBy: (row.approved_by as string | null) ?? null,
    approvalDate: (row.approval_date as string | null) ?? null,
    operatorLicenseNumber: (row.operator_license_number as string | null) ?? null,
    odometerReading: (row.odometer_reading as number | null) ?? null,
    yearOfManufacture: (row.year_of_manufacture as number | null) ?? null,
    insurancePolicy: (row.insurance_policy as string | null) ?? null,
    concessionId: (row.concession_id as string | null) ?? null,
    paidWithMasterCard: Boolean(row.paid_with_master_card),
    masterPaymentRef: (row.master_payment_ref as string | null) ?? null,
    renewalFeeAmountSzl:
      row.renewal_fee_amount_szl === null
        ? null
        : Number(row.renewal_fee_amount_szl),
  };
}

const SELECT_COLUMNS = `
  id, vehicle_reg, fleet_id, current_permit_number, current_expiry_date,
  operator, driver, reason_for_renewal, comments, supporting_documents,
  status, timestamp, request_date,
  new_permit_number, permit_issue_date, permit_expiry_date,
  cof_number, cof_issue_date, cof_expiry_date, inspection_date,
  licensing_office, renewal_notes, approved_by, approval_date,
  operator_license_number, odometer_reading, year_of_manufacture,
  insurance_policy, concession_id,
  paid_with_master_card, master_payment_ref, renewal_fee_amount_szl
`;

export async function listRenewals(
  user: ResolvedUser,
  opts: { status?: RenewalRow["status"]; limit?: number } = {}
): Promise<RenewalRow[]> {
  const admin = createSupabaseAdminClient();
  const vehicleRegs = await getVehicleRegsInScope(user);

  if (vehicleRegs !== null && vehicleRegs.length === 0) return [];

  let q = admin.from("permit_renewal_requests").select(SELECT_COLUMNS);
  if (vehicleRegs !== null) {
    q = q.in("vehicle_reg", vehicleRegs);
  }
  if (opts.status) {
    q = q.eq("status", opts.status);
  }

  const { data, error } = await q
    .order("timestamp", { ascending: false })
    .limit(opts.limit ?? 200);

  if (error) {
    throw new Error(`Failed to list renewals: ${error.message}`);
  }

  return (data ?? []).map(mapRow);
}

export async function getRenewalById(
  id: string,
  user: ResolvedUser
): Promise<RenewalRow | null> {
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("permit_renewal_requests")
    .select(SELECT_COLUMNS)
    .eq("id", id)
    .maybeSingle();

  if (error || !data) return null;

  const vehicleRegs = await getVehicleRegsInScope(user);
  if (vehicleRegs !== null && !vehicleRegs.includes(data.vehicle_reg as string)) {
    return null;
  }

  return mapRow(data);
}

export interface CreateRenewalOptions {
  operator: string;
  driverName: string | null;
  fleetId: string | null;
  currentPermitNumber: string | null;
  currentExpiryDate: string | null;
  masterPaymentRef?: string;
  masterPaymentAmountSzl?: number;
}

export async function createRenewalRequest(
  input: {
    vehicleReg: string;
    reason: string;
    comments?: string;
    supportingDocuments?: string[];
    operatorLicenseNumber?: string;
    odometerReading?: number;
    yearOfManufacture?: number;
    insurancePolicy?: string;
    concessionId?: string;
    termMonths: number;
  },
  options: CreateRenewalOptions
): Promise<RenewalRow> {
  const admin = createSupabaseAdminClient();
  const now = new Date();
  const id = `req_${randomBytes(8).toString("hex")}`;

  const { data, error } = await admin
    .from("permit_renewal_requests")
    .insert({
      id,
      vehicle_reg: normalizePlate(input.vehicleReg),
      fleet_id: options.fleetId,
      current_permit_number: options.currentPermitNumber,
      current_expiry_date: options.currentExpiryDate,
      operator: options.operator,
      driver: options.driverName,
      reason_for_renewal: `${input.reason} (${input.termMonths} Months)`,
      comments: input.comments ?? null,
      supporting_documents: input.supportingDocuments ?? [],
      status: "Pending Admin Approval",
      timestamp: now.toISOString(),
      request_date: now.toISOString().split("T")[0],
      operator_license_number: input.operatorLicenseNumber ?? null,
      odometer_reading: input.odometerReading ?? null,
      year_of_manufacture: input.yearOfManufacture ?? null,
      insurance_policy: input.insurancePolicy ?? null,
      concession_id: input.concessionId ?? null,
      paid_with_master_card: Boolean(options.masterPaymentRef),
      master_payment_ref: options.masterPaymentRef ?? null,
      renewal_fee_amount_szl: options.masterPaymentAmountSzl ?? null,
    })
    .select(SELECT_COLUMNS)
    .single();

  if (error || !data) {
    throw new Error(`Failed to create renewal: ${error?.message}`);
  }

  return mapRow(data);
}

export interface ApprovalInput {
  decision: "Approved" | "Rejected";
  newPermitNumber?: string;
  permitIssueDate?: string;
  permitExpiryDate?: string;
  cofNumber?: string;
  cofIssueDate?: string;
  cofExpiryDate?: string;
  inspectionDate?: string;
  licensingOffice?: string;
  renewalNotes?: string;
}

export async function approveRenewal(
  id: string,
  input: ApprovalInput,
  approver: { fullName: string; authUserId?: string }
): Promise<{ success: boolean; error?: string }> {
  const admin = createSupabaseAdminClient();

  const { data: request, error: fetchErr } = await admin
    .from("permit_renewal_requests")
    .select(SELECT_COLUMNS)
    .eq("id", id)
    .maybeSingle();

  if (fetchErr || !request) {
    return { success: false, error: "Renewal request not found." };
  }

  if (request.status !== "Pending Admin Approval") {
    return { success: false, error: "This request has already been processed." };
  }

  const vehicleReg = normalizePlate(request.vehicle_reg as string);
  const now = new Date();
  const today = now.toISOString().split("T")[0];

  const { error: updateReqErr } = await admin
    .from("permit_renewal_requests")
    .update({
      status: input.decision,
      new_permit_number: input.newPermitNumber ?? null,
      permit_issue_date: input.permitIssueDate ?? null,
      permit_expiry_date: input.permitExpiryDate ?? null,
      cof_number: input.cofNumber ?? null,
      cof_issue_date: input.cofIssueDate ?? null,
      cof_expiry_date: input.cofExpiryDate ?? null,
      inspection_date: input.inspectionDate ?? null,
      licensing_office: input.licensingOffice ?? null,
      renewal_notes: input.renewalNotes ?? null,
      approved_by: approver.fullName,
      approval_date: today,
    })
    .eq("id", id)
    .eq("status", "Pending Admin Approval");

  if (updateReqErr) {
    return { success: false, error: updateReqErr.message };
  }

  if (input.decision === "Rejected") {
    await writeAudit(admin, {
      action: "permit.reject",
      actorId: approver.authUserId,
      actorName: approver.fullName,
      entityType: "renewal",
      entityId: id,
      summary: `Rejected renewal ${id} for ${vehicleReg}`,
    });
    return { success: true };
  }

  const { data: vehicle } = await admin
    .from("vehicles")
    .select("permit_number, permit_issue_date, permit_expiry_date")
    .eq("registration_number", vehicleReg)
    .maybeSingle();

  if (vehicle && vehicle.permit_number) {
    await admin.from("permit_renewal_archives").insert({
      id: `arc_${randomBytes(6).toString("hex")}`,
      vehicle_reg: vehicleReg,
      previous_permit_number: vehicle.permit_number as string,
      new_permit_number: input.newPermitNumber ?? "RPT-NEW",
      issue_date: (vehicle.permit_issue_date as string | null) ?? today,
      expiry_date: (vehicle.permit_expiry_date as string | null) ?? today,
      administrator: approver.fullName,
      renewal_date: today,
      comments: input.renewalNotes ?? "Standard renewal",
      supporting_documents: (request.supporting_documents as string[] | null) ?? [],
    });
  }

  const vehiclePatch: Record<string, unknown> = {};
  if (input.newPermitNumber) vehiclePatch.permit_number = input.newPermitNumber;
  if (input.permitIssueDate) vehiclePatch.permit_issue_date = input.permitIssueDate;
  if (input.permitExpiryDate) vehiclePatch.permit_expiry_date = input.permitExpiryDate;
  if (input.cofNumber) vehiclePatch.cof_number = input.cofNumber;
  if (input.cofIssueDate) vehiclePatch.cof_issue_date = input.cofIssueDate;
  if (input.cofExpiryDate) vehiclePatch.cof_expiry_date = input.cofExpiryDate;
  if (input.inspectionDate) vehiclePatch.last_inspection_date = input.inspectionDate;
  vehiclePatch.permit_status = "Active";

  if (Object.keys(vehiclePatch).length > 0) {
    await admin
      .from("vehicles")
      .update(vehiclePatch)
      .eq("registration_number", vehicleReg);
  }

  await writeAudit(admin, {
    action: "permit.approve",
    actorId: approver.authUserId,
    actorName: approver.fullName,
    entityType: "renewal",
    entityId: id,
    summary: `Approved renewal ${id} for ${vehicleReg} — print required before rank load`,
  });

  return { success: true };
}

/**
 * After A4/QR print: mark Approved → Printed so rank load is allowed again.
 */
export async function markRenewalPrinted(
  vehicleReg: string,
  actor: { fullName: string; authUserId?: string }
): Promise<{ success: boolean; error?: string; marked?: number }> {
  const admin = createSupabaseAdminClient();
  const plate = normalizePlate(vehicleReg);
  const compact = plateKey(plate);

  let { data: open, error } = await admin
    .from("permit_renewal_requests")
    .select("id, vehicle_reg")
    .eq("vehicle_reg", plate)
    .eq("status", "Approved");

  if (error) {
    return { success: false, error: error.message };
  }

  // Compact-plate match if exact reg spacing differs
  if ((!open || open.length === 0) && compact) {
    const { data: candidates } = await admin
      .from("permit_renewal_requests")
      .select("id, vehicle_reg")
      .eq("status", "Approved")
      .limit(200);
    open = (candidates ?? []).filter(
      (r) => plateKey(String(r.vehicle_reg)) === compact
    );
  }

  if (!open || open.length === 0) {
    return { success: true, marked: 0 };
  }

  const ids = open.map((r) => r.id as string);
  const printedAt = new Date().toISOString();

  let { error: updErr } = await admin
    .from("permit_renewal_requests")
    .update({ status: "Printed", printed_at: printedAt })
    .in("id", ids)
    .eq("status", "Approved");

  // Column may not exist yet — retry without printed_at
  if (updErr?.message?.includes("printed_at")) {
    const retry = await admin
      .from("permit_renewal_requests")
      .update({ status: "Printed" })
      .in("id", ids)
      .eq("status", "Approved");
    updErr = retry.error;
  }

  if (updErr) {
    return { success: false, error: updErr.message };
  }

  await writeAudit(admin, {
    action: "permit.print",
    actorId: actor.authUserId,
    actorName: actor.fullName,
    entityType: "vehicle",
    entityId: plate,
    summary: `Printed permit for ${plate} — rank load unlocked`,
    meta: { renewalIds: ids },
  });

  return { success: true, marked: ids.length };
}
