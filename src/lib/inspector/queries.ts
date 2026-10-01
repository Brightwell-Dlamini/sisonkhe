/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import "server-only";
import { createSupabaseAdminClient } from "../supabase/server";
import type { ResolvedUser } from "../auth/roles";

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
  driverPdpStatus: string | null;
  driverPdpExpiry: string | null;

  // Computed compliance flags
  permitValid: boolean;
  cofValid: boolean;
  insuranceValid: boolean;
  overallValid: boolean;
}

export interface InspectorTicket {
  id: string;
  ticketNumber: string;
  timestamp: string;
  vehicleReg: string;
  officerName: string;
  officerBadge: string;
  offenseType: string;
  amountSzl: number;
  location: string | null;
  status: string;
  notes: string | null;
}

// ---------------------------------------------------------------------------
// Vehicle lookup
// ---------------------------------------------------------------------------

export async function lookupVehicleForInspector(
  registrationNumber: string
): Promise<InspectorVehicleView | null> {
  const admin = createSupabaseAdminClient();
  const reg = registrationNumber.trim().toUpperCase();

  const { data: v, error } = await admin
    .from("vehicles")
    .select(
      `
      registration_number, vic, make, model, classification, seating_capacity, status,
      permit_number, permit_status, permit_expiry_date,
      cof_number, cof_expiry_date, insurance_expiry, roadworthiness_expiry, last_inspection_date,
      owner_name, owner_phone, association,
      route_assignment_id, driver_id
    `
    )
    .eq("registration_number", reg)
    .maybeSingle();

  if (error || !v) return null;

  // Route
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
      routeOrigin = route.origin as string;
      routeDestination = route.destination as string;
      region = route.region_code as string;
    }
  }

  // Driver
  let driverName: string | null = null;
  let driverPdpStatus: string | null = null;
  let driverPdpExpiry: string | null = null;
  if (v.driver_id) {
    const { data: driver } = await admin
      .from("drivers")
      .select("full_name, pdp_status, pdp_expiry_date")
      .eq("id", v.driver_id as string)
      .maybeSingle();
    if (driver) {
      driverName = driver.full_name as string;
      driverPdpStatus = (driver.pdp_status as string | null) ?? null;
      driverPdpExpiry = (driver.pdp_expiry_date as string | null) ?? null;
    }
  }

  const now = Date.now();
  const permitValid =
    v.permit_status === "Active" &&
    (!v.permit_expiry_date ||
      new Date(v.permit_expiry_date as string).getTime() > now);
  const cofValid =
    !v.cof_expiry_date ||
    new Date(v.cof_expiry_date as string).getTime() > now;
  const insuranceValid =
    !v.insurance_expiry ||
    new Date(v.insurance_expiry as string).getTime() > now;

  return {
    registrationNumber: v.registration_number as string,
    vic: (v.vic as string | null) ?? null,
    make: v.make as string,
    model: v.model as string,
    classification: v.classification as string,
    seatingCapacity: v.seating_capacity as number,
    status: v.status as string,
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
    driverPdpStatus,
    driverPdpExpiry,
    permitValid,
    cofValid,
    insuranceValid,
    overallValid: permitValid && cofValid && insuranceValid,
  };
}

// ---------------------------------------------------------------------------
// Tickets
// ---------------------------------------------------------------------------

export async function createTicket(
  input: {
    vehicleReg: string;
    offenseType: string;
    amountSzl: number;
    location?: string;
    notes?: string;
  },
  officer: { fullName: string; badgeNumber: string | null }
): Promise<InspectorTicket> {
  const admin = createSupabaseAdminClient();
  const now = new Date();
  const year = now.getFullYear();
  const serial = Math.floor(1000 + Math.random() * 9000);

  const id = `tkt-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  const ticketNumber = `REPS-${year}-${serial}`;

  const { data, error } = await admin
    .from("traffic_tickets")
    .insert({
      id,
      ticket_number: ticketNumber,
      timestamp: now.toISOString(),
      vehicle_reg: input.vehicleReg.toUpperCase(),
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

  if (error || !data) {
    throw new Error(`Failed to create ticket: ${error?.message}`);
  }

  return {
    id: data.id as string,
    ticketNumber: data.ticket_number as string,
    timestamp: data.timestamp as string,
    vehicleReg: data.vehicle_reg as string,
    officerName: data.officer_name as string,
    officerBadge: data.officer_badge as string,
    offenseType: data.offense_type as string,
    amountSzl: Number(data.amount_szl),
    location: (data.location as string | null) ?? null,
    status: data.status as string,
    notes: (data.notes as string | null) ?? null,
  };
}

export async function listTicketsForOfficer(
  officerName: string,
  region: string | null,
  limit: number = 50
): Promise<InspectorTicket[]> {
  const admin = createSupabaseAdminClient();

  let q = admin
    .from("traffic_tickets")
    .select(
      "id, ticket_number, timestamp, vehicle_reg, officer_name, officer_badge, offense_type, amount_szl, location, status, notes"
    )
    .eq("officer_name", officerName)
    .order("timestamp", { ascending: false })
    .limit(limit);

  const { data, error } = await q;
  if (error || !data) return [];

  return data.map((t) => ({
    id: t.id as string,
    ticketNumber: t.ticket_number as string,
    timestamp: t.timestamp as string,
    vehicleReg: t.vehicle_reg as string,
    officerName: t.officer_name as string,
    officerBadge: t.officer_badge as string,
    offenseType: t.offense_type as string,
    amountSzl: Number(t.amount_szl),
    location: (t.location as string | null) ?? null,
    status: t.status as string,
    notes: (t.notes as string | null) ?? null,
  }));
}
