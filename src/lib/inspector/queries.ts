/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import "server-only";
import { createSupabaseAdminClient } from "../supabase/server";
import { normalizePlate, plateKey } from "../domain/identity";
import { nextTicketNumber } from "../domain/serials";
import { writeAudit } from "../domain/audit";

export interface InspectorVehicleView {
  registrationNumber: string;
  vic: string | null;
  make: string;
  model: string;
  classification: string;
  seatingCapacity: number;
  status: string;
  permitNumber: string | null;
  permitStatus: string | null;
  permitExpiryDate: string | null;
  cofNumber: string | null;
  cofExpiryDate: string | null;
  insuranceExpiry: string | null;
  roadworthinessExpiry: string | null;
  lastInspectionDate: string | null;
  ownerName: string | null;
  ownerPhone: string | null;
  association: string | null;
  routeOrigin: string | null;
  routeDestination: string | null;
  region: string | null;
  driverName: string | null;
  driverLicenseNumber: string | null;
  driverPdpStatus: string | null;
  driverPdpExpiry: string | null;
  driverStatus: string | null;
  permitValid: boolean;
  cofValid: boolean;
  insuranceValid: boolean;
  roadworthyValid: boolean;
  driverPdpValid: boolean;
  vehicleOperational: boolean;
  overallValid: boolean;
}

export interface InspectorTicket {
  id: string;
  ticketNumber: string;
  timestamp: string;
  vehicleReg: string;
  officerName: string;
  officerBadge: string;
  officerUserId: string | null;
  offenseType: string;
  amountSzl: number;
  location: string | null;
  status: string;
  notes: string | null;
  complianceSnapshot: Record<string, unknown> | null;
}

function isExpired(dateStr: string | null | undefined, now: number): boolean {
  if (!dateStr) return false;
  return new Date(dateStr).getTime() <= now;
}

const SELECT_COLS = `
  registration_number, vic, make, model, classification, seating_capacity, status,
  permit_number, permit_status, permit_expiry_date,
  cof_number, cof_expiry_date, insurance_expiry, roadworthiness_expiry, last_inspection_date,
  owner_name, owner_phone, association,
  route_assignment_id, driver_id
`;

export async function lookupVehicleForInspector(
  query: string
): Promise<InspectorVehicleView | null> {
  const admin = createSupabaseAdminClient();
  const q = normalizePlate(query);
  if (!q) return null;
  const compact = plateKey(q);

  let { data: v } = await admin
    .from("vehicles")
    .select(SELECT_COLS)
    .eq("registration_number", q)
    .maybeSingle();

  if (!v) {
    const byVic = await admin
      .from("vehicles")
      .select(SELECT_COLS)
      .ilike("vic", q)
      .maybeSingle();
    v = byVic.data;
  }

  // Indexed compact match via filter (not full table scan in app)
  if (!v && compact) {
    const { data: byCompact } = await admin
      .from("vehicles")
      .select(SELECT_COLS)
      .filter("registration_number", "ilike", `%${compact.slice(0, 3)}%`)
      .limit(50);
    v =
      (byCompact ?? []).find(
        (row) =>
          plateKey(String(row.registration_number)) === compact ||
          plateKey(String(row.vic ?? "")) === compact
      ) ?? null;
  }

  if (!v) return null;

  let routeOrigin: string | null = null;
  let routeDestination: string | null = null;
  let region: string | null = null;

  if (v.route_assignment_id) {
    const { data: route } = await admin
      .from("routes")
      .select("origin, destination, region_code")
      .eq("id", v.route_assignment_id as string)
      .maybeSingle();
    if (route) {
      routeOrigin = (route.origin as string) ?? null;
      routeDestination = (route.destination as string) ?? null;
      region = (route.region_code as string) ?? null;
    }
  }

  let driverName: string | null = null;
  let driverLicenseNumber: string | null = null;
  let driverPdpStatus: string | null = null;
  let driverPdpExpiry: string | null = null;
  let driverStatus: string | null = null;

  if (v.driver_id) {
    const { data: driver } = await admin
      .from("drivers")
      .select("full_name, pdp_status, pdp_expiry_date, license_number, status")
      .eq("id", v.driver_id as string)
      .maybeSingle();
    if (driver) {
      driverName = (driver.full_name as string) ?? null;
      driverLicenseNumber = (driver.license_number as string | null) ?? null;
      driverPdpStatus = (driver.pdp_status as string | null) ?? null;
      driverPdpExpiry = (driver.pdp_expiry_date as string | null) ?? null;
      driverStatus = (driver.status as string | null) ?? null;
    }
  }

  const now = Date.now();
  const status = (v.status as string) ?? "";
  const vehicleOperational =
    status !== "Offline" && status !== "Breakdown" && status !== "Decommissioned";

  const permitValid =
    (v.permit_status === "Active" || v.permit_status === "Valid") &&
    !isExpired(v.permit_expiry_date as string | null, now);
  const cofValid = !isExpired(v.cof_expiry_date as string | null, now);
  const insuranceValid = !isExpired(v.insurance_expiry as string | null, now);
  const roadworthyValid = !isExpired(
    v.roadworthiness_expiry as string | null,
    now
  );
  const driverPdpValid =
    !driverName ||
    ((driverPdpStatus === "Valid" ||
      driverPdpStatus === "Active" ||
      !driverPdpStatus) &&
      !isExpired(driverPdpExpiry, now) &&
      driverStatus !== "Suspended");

  return {
    registrationNumber: v.registration_number as string,
    vic: (v.vic as string | null) ?? null,
    make: (v.make as string) ?? "",
    model: (v.model as string) ?? "",
    classification: (v.classification as string) ?? "",
    seatingCapacity: Number(v.seating_capacity) || 0,
    status,
    permitNumber: (v.permit_number as string | null) ?? null,
    permitStatus: (v.permit_status as string | null) ?? null,
    permitExpiryDate: (v.permit_expiry_date as string | null) ?? null,
    cofNumber: (v.cof_number as string | null) ?? null,
    cofExpiryDate: (v.cof_expiry_date as string | null) ?? null,
    insuranceExpiry: (v.insurance_expiry as string | null) ?? null,
    roadworthinessExpiry: (v.roadworthiness_expiry as string | null) ?? null,
    lastInspectionDate: (v.last_inspection_date as string | null) ?? null,
    ownerName: (v.owner_name as string | null) ?? null,
    ownerPhone: (v.owner_phone as string | null) ?? null,
    association: (v.association as string | null) ?? null,
    routeOrigin,
    routeDestination,
    region,
    driverName,
    driverLicenseNumber,
    driverPdpStatus,
    driverPdpExpiry,
    driverStatus,
    permitValid,
    cofValid,
    insuranceValid,
    roadworthyValid,
    driverPdpValid,
    vehicleOperational,
    overallValid:
      permitValid &&
      cofValid &&
      insuranceValid &&
      roadworthyValid &&
      driverPdpValid &&
      vehicleOperational,
  };
}

export async function createTicket(
  input: {
    vehicleReg: string;
    offenseType: string;
    amountSzl: number;
    location?: string;
    notes?: string;
  },
  officer: {
    fullName: string;
    badgeNumber: string | null;
    userId?: string | null;
  }
): Promise<InspectorTicket> {
  const admin = createSupabaseAdminClient();
  const now = new Date();
  const plate = normalizePlate(input.vehicleReg);

  const compliance = await lookupVehicleForInspector(plate);
  const id = `tkt_${Date.now()}_${plate.replace(/\s+/g, "").slice(0, 8)}`;
  const ticketNumber = await nextTicketNumber(admin);

  const snapshot = compliance
    ? {
        permitValid: compliance.permitValid,
        cofValid: compliance.cofValid,
        insuranceValid: compliance.insuranceValid,
        roadworthyValid: compliance.roadworthyValid,
        driverPdpValid: compliance.driverPdpValid,
        overallValid: compliance.overallValid,
        permitStatus: compliance.permitStatus,
        permitExpiryDate: compliance.permitExpiryDate,
        driverName: compliance.driverName,
        driverStatus: compliance.driverStatus,
        vehicleStatus: compliance.status,
      }
    : null;

  const { data, error } = await admin
    .from("traffic_tickets")
    .insert({
      id,
      ticket_number: ticketNumber,
      timestamp: now.toISOString(),
      vehicle_reg: plate,
      officer_name: officer.fullName,
      officer_badge: officer.badgeNumber ?? "UNKNOWN",
      officer_user_id: officer.userId ?? null,
      offense_type: input.offenseType,
      amount_szl: input.amountSzl,
      location: input.location || null,
      status: "Issued",
      notes: input.notes || null,
      compliance_snapshot: snapshot,
    })
    .select(
      "id, ticket_number, timestamp, vehicle_reg, officer_name, officer_badge, officer_user_id, offense_type, amount_szl, location, status, notes, compliance_snapshot"
    )
    .single();

  if (error || !data) {
    // Fallback without new columns
    const { data: data2, error: err2 } = await admin
      .from("traffic_tickets")
      .insert({
        id,
        ticket_number: ticketNumber,
        timestamp: now.toISOString(),
        vehicle_reg: plate,
        officer_name: officer.fullName,
        officer_badge: officer.badgeNumber ?? "UNKNOWN",
        offense_type: input.offenseType,
        amount_szl: input.amountSzl,
        location: input.location || null,
        status: "Issued",
        notes: input.notes || null,
      })
      .select(
        "id, ticket_number, timestamp, vehicle_reg, officer_name, officer_badge, offense_type, amount_szl, location, status, notes"
      )
      .single();
    if (err2 || !data2) {
      throw new Error(`Failed to create ticket: ${error?.message ?? err2?.message}`);
    }
    await writeAudit(admin, {
      action: "ticket.issue",
      actorId: officer.userId,
      actorName: officer.fullName,
      entityType: "ticket",
      entityId: id,
      summary: `Ticket ${ticketNumber} on ${plate}: ${input.offenseType}`,
      meta: { snapshot },
    });
    return {
      id: data2.id as string,
      ticketNumber: data2.ticket_number as string,
      timestamp: data2.timestamp as string,
      vehicleReg: data2.vehicle_reg as string,
      officerName: data2.officer_name as string,
      officerBadge: data2.officer_badge as string,
      officerUserId: officer.userId ?? null,
      offenseType: data2.offense_type as string,
      amountSzl: Number(data2.amount_szl),
      location: (data2.location as string | null) ?? null,
      status: data2.status as string,
      notes: (data2.notes as string | null) ?? null,
      complianceSnapshot: snapshot,
    };
  }

  await writeAudit(admin, {
    action: "ticket.issue",
    actorId: officer.userId,
    actorName: officer.fullName,
    entityType: "ticket",
    entityId: id,
    summary: `Ticket ${ticketNumber} on ${plate}: ${input.offenseType}`,
    meta: { snapshot },
  });

  return {
    id: data.id as string,
    ticketNumber: data.ticket_number as string,
    timestamp: data.timestamp as string,
    vehicleReg: data.vehicle_reg as string,
    officerName: data.officer_name as string,
    officerBadge: data.officer_badge as string,
    officerUserId: (data.officer_user_id as string | null) ?? null,
    offenseType: data.offense_type as string,
    amountSzl: Number(data.amount_szl),
    location: (data.location as string | null) ?? null,
    status: data.status as string,
    notes: (data.notes as string | null) ?? null,
    complianceSnapshot:
      (data.compliance_snapshot as Record<string, unknown> | null) ?? snapshot,
  };
}

export async function listTicketsForOfficer(
  officerName: string,
  officerUserId: string | null,
  limit: number = 50
): Promise<InspectorTicket[]> {
  const admin = createSupabaseAdminClient();

  let query = admin
    .from("traffic_tickets")
    .select(
      "id, ticket_number, timestamp, vehicle_reg, officer_name, officer_badge, officer_user_id, offense_type, amount_szl, location, status, notes, compliance_snapshot"
    )
    .order("timestamp", { ascending: false })
    .limit(limit);

  if (officerUserId) {
    query = query.eq("officer_user_id", officerUserId);
  } else {
    query = query.eq("officer_name", officerName);
  }

  const { data, error } = await query;
  if (error || !data) {
    // Fallback without officer_user_id column
    const { data: data2 } = await admin
      .from("traffic_tickets")
      .select(
        "id, ticket_number, timestamp, vehicle_reg, officer_name, officer_badge, offense_type, amount_szl, location, status, notes"
      )
      .eq("officer_name", officerName)
      .order("timestamp", { ascending: false })
      .limit(limit);
    return (data2 ?? []).map((t) => ({
      id: t.id as string,
      ticketNumber: t.ticket_number as string,
      timestamp: t.timestamp as string,
      vehicleReg: t.vehicle_reg as string,
      officerName: t.officer_name as string,
      officerBadge: t.officer_badge as string,
      officerUserId: null,
      offenseType: t.offense_type as string,
      amountSzl: Number(t.amount_szl),
      location: (t.location as string | null) ?? null,
      status: t.status as string,
      notes: (t.notes as string | null) ?? null,
      complianceSnapshot: null,
    }));
  }

  return data.map((t) => ({
    id: t.id as string,
    ticketNumber: t.ticket_number as string,
    timestamp: t.timestamp as string,
    vehicleReg: t.vehicle_reg as string,
    officerName: t.officer_name as string,
    officerBadge: t.officer_badge as string,
    officerUserId: (t.officer_user_id as string | null) ?? null,
    offenseType: t.offense_type as string,
    amountSzl: Number(t.amount_szl),
    location: (t.location as string | null) ?? null,
    status: t.status as string,
    notes: (t.notes as string | null) ?? null,
    complianceSnapshot:
      (t.compliance_snapshot as Record<string, unknown> | null) ?? null,
  }));
}
