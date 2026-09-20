/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Server-side permit data assembly.
 *
 * Produces a fully-hydrated PermitDocument with:
 *   - Vehicle identity
 *   - Operator details
 *   - Route assignment
 *   - Signed HMAC QR token
 *   - Region/terminal info
 *
 * Used by both single and batch print routes.
 */

import "server-only";
import { createSupabaseAdminClient } from "../supabase/server";
import { signVehicleQr } from "../qr/sign";

export interface PermitDocument {
  // Header
  kingdomTitle: string;
  ministryTitle: string;
  boardTitle: string;
  documentTitle: string;

  // Permit identity
  permitNumber: string;
  permitStatus: string;
  permitIssueDate: string;
  permitExpiryDate: string;
  lastInspectionDate: string;

  // Vehicle
  registrationNumber: string;
  vic: string;
  make: string;
  model: string;
  classification: string;
  seatingCapacity: number;

  // Fitness
  cofNumber: string;
  cofIssueDate: string;
  cofExpiryDate: string;

  // Operator
  operatorName: string;
  operatorPhone: string;
  association: string;

  // Route
  routeOrigin: string;
  routeDestination: string;
  routeRegion: string;
  loadingBay: string;

  // Driver (optional)
  driverName: string;
  driverPdpStatus: string;

  // Signing
  signedQrToken: string;
  verifyUrl: string;

  // Meta
  issuedAt: string;
  printTimestamp: string;
}

const KINGDOM = "Kingdom of Eswatini • Umbuso Weswatini";
const MINISTRY = "Ministry of Public Works & Transport";
const BOARD = "Road Transportation Board";
const TITLE = "Public Service Vehicle (PSV) Operator Permit";

export async function buildPermitDocument(
  registrationNumber: string
): Promise<PermitDocument | null> {
  const admin = createSupabaseAdminClient();
  const reg = registrationNumber.trim().toUpperCase();

  const { data: vehicle, error } = await admin
    .from("vehicles")
    .select(
      `
      registration_number, vic, make, model, classification, seating_capacity,
      permit_number, permit_status, permit_issue_date, permit_expiry_date,
      cof_number, cof_issue_date, cof_expiry_date, last_inspection_date,
      owner_name, owner_phone, association,
      route_assignment_id, loading_bay, driver_id
    `
    )
    .eq("registration_number", reg)
    .maybeSingle();

  if (error) {
    console.error("[printing/permit] vehicle error:", error);
    return null;
  }
  if (!vehicle) return null;

  // Route
  let routeOrigin = "—";
  let routeDestination = "—";
  let routeRegion = "—";
  if (vehicle.route_assignment_id) {
    const { data: route } = await admin
      .from("routes")
      .select("origin, destination, region_code")
      .eq("id", vehicle.route_assignment_id as string)
      .maybeSingle();
    if (route) {
      routeOrigin = route.origin as string;
      routeDestination = route.destination as string;
      routeRegion = route.region_code as string;
    }
  }

  // Driver
  let driverName = "—";
  let driverPdpStatus = "—";
  if (vehicle.driver_id) {
    const { data: driver } = await admin
      .from("drivers")
      .select("full_name, pdp_status")
      .eq("id", vehicle.driver_id as string)
      .maybeSingle();
    if (driver) {
      driverName = driver.full_name as string;
      driverPdpStatus = (driver.pdp_status as string | null) ?? "Valid";
    }
  }

  // Signed QR
  const signedQrToken = await signVehicleQr({
    registrationNumber: vehicle.registration_number as string,
    vic: (vehicle.vic as string | null) ?? null,
    permitNumber: (vehicle.permit_number as string | null) ?? null,
    permitStatus: (vehicle.permit_status as string | null) ?? null,
    permitExpiryDate: (vehicle.permit_expiry_date as string | null) ?? null,
  });

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const verifyUrl = `${baseUrl}/verify?token=${encodeURIComponent(signedQrToken)}`;

  const now = new Date();

  return {
    kingdomTitle: KINGDOM,
    ministryTitle: MINISTRY,
    boardTitle: BOARD,
    documentTitle: TITLE,

    permitNumber: (vehicle.permit_number as string | null) ?? "RPT-PENDING",
    permitStatus: (vehicle.permit_status as string | null) ?? "Active",
    permitIssueDate: (vehicle.permit_issue_date as string | null) ?? "—",
    permitExpiryDate: (vehicle.permit_expiry_date as string | null) ?? "—",
    lastInspectionDate: (vehicle.last_inspection_date as string | null) ?? "—",

    registrationNumber: vehicle.registration_number as string,
    vic: (vehicle.vic as string | null) ?? "—",
    make: vehicle.make as string,
    model: vehicle.model as string,
    classification: vehicle.classification as string,
    seatingCapacity: vehicle.seating_capacity as number,

    cofNumber: (vehicle.cof_number as string | null) ?? "—",
    cofIssueDate: (vehicle.cof_issue_date as string | null) ?? "—",
    cofExpiryDate: (vehicle.cof_expiry_date as string | null) ?? "—",

    operatorName: (vehicle.owner_name as string | null) ?? "—",
    operatorPhone: (vehicle.owner_phone as string | null) ?? "—",
    association: (vehicle.association as string | null) ?? "—",

    routeOrigin,
    routeDestination,
    routeRegion,
    loadingBay: (vehicle.loading_bay as string | null) ?? "Bay 01",

    driverName,
    driverPdpStatus,

    signedQrToken,
    verifyUrl,

    issuedAt: now.toISOString(),
    printTimestamp: now.toLocaleString("en-GB"),
  };
}
