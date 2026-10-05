/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Canonical Drizzle schema for Sisonkhe In Transit.
 * Single source of truth for the relational model.
 *
 * Design rules:
 * - text primary keys (client-generated, offline-friendly)
 * - every table has version (optimistic concurrency)
 * - created_at / updated_at are server-managed timestamptz
 * - no base64 blobs in rows
 */

import {
  pgTable,
  text,
  integer,
  numeric,
  boolean,
  timestamp,
  date,
  jsonb,
  bigint,
  uuid,
  index,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export const regions = pgTable("regions", {
  code: text("code").primaryKey(),
  name: text("name").notNull(),
  terminalName: text("terminal_name").notNull(),
  emergencyNumber: text("emergency_number"),
  announcement: text("announcement"),
  version: integer("version").notNull().default(1),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const routes = pgTable(
  "routes",
  {
    id: text("id").primaryKey(),
    regionCode: text("region_code")
      .notNull()
      .references(() => regions.code),
    origin: text("origin").notNull(),
    destination: text("destination").notNull(),
    distanceKm: numeric("distance_km", { precision: 8, scale: 2 }).notNull(),
    baseFareE: numeric("base_fare_e", { precision: 10, scale: 2 }).notNull(),
    isPopular: boolean("is_popular").notNull().default(false),
    startTime: text("start_time"),
    defaultBay: text("default_bay"),
    version: integer("version").notNull().default(1),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("routes_region_idx").on(t.regionCode)]
);

export const staff = pgTable("staff", {
  id: text("id").primaryKey(),
  authUserId: uuid("auth_user_id").notNull().unique(),
  fullName: text("full_name").notNull(),
  email: text("email").notNull().unique(),
  phone: text("phone"),
  role: text("role").notNull(),
  region: text("region"),
  terminalId: text("terminal_id"),
  isActive: boolean("is_active").notNull().default(true),
  lastLoginAt: timestamp("last_login_at", { withTimezone: true }),
  version: integer("version").notNull().default(1),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const marshals = pgTable("marshals", {
  id: text("id").primaryKey(),
  staffNumber: text("staff_number").notNull(),
  firstName: text("first_name").notNull(),
  surname: text("surname").notNull(),
  position: text("position").notNull(),
  residentialAddress: text("residential_address").notNull(),
  homeTelNo: text("home_tel_no").default("N/A"),
  cellNo: text("cell_no").notNull(),
  idNumber: text("id_number").notNull(),
  chiefOfArea: text("chief_of_area").notNull(),
  indvuna: text("indvuna").notNull(),
  maritalStatus: text("marital_status").notNull().default("Single"),
  partnerName: text("partner_name"),
  numberOfKids: integer("number_of_kids").notNull().default(0),
  nextOfKinFullName: text("next_of_kin_full_name").notNull(),
  nextOfKinRelationship: text("next_of_kin_relationship").notNull(),
  nextOfKinContactNumber: text("next_of_kin_contact_number").notNull(),
  region: text("region").notNull(),
  agreementAccepted: boolean("agreement_accepted").notNull().default(true),
  registrationDate: text("registration_date").notNull(),
  fieldOfficerName: text("field_officer_name"),
  notes: text("notes"),
  photoStoragePath: text("photo_storage_path"),
  signatureStoragePath: text("signature_storage_path"),
  whatsappNo: text("whatsapp_no"),
  authUserId: uuid("auth_user_id"),
  isActive: boolean("is_active").default(true),
  lastLoginAt: timestamp("last_login_at", { withTimezone: true }),
  assignedRouteId: text("assigned_route_id"),
  terminalId: text("terminal_id"),
  version: integer("version").notNull().default(1),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const drivers = pgTable("drivers", {
  id: text("id").primaryKey(),
  fullName: text("full_name").notNull(),
  nationalId: text("national_id").unique(),
  phone: text("phone").notNull(),
  residentialAddress: text("residential_address"),
  dateOfBirth: date("date_of_birth"),
  gender: text("gender"),
  licenseNumber: text("license_number").unique(),
  licenseClass: text("license_class"),
  pdpNumber: text("pdp_number"),
  pdpIssueDate: date("pdp_issue_date"),
  pdpExpiryDate: date("pdp_expiry_date"),
  pdpIssuingAuthority: text("pdp_issuing_authority"),
  pdpStatus: text("pdp_status"),
  emergencyContactName: text("emergency_contact_name"),
  emergencyContactPhone: text("emergency_contact_phone"),
  emergencyContactRelation: text("emergency_contact_relation"),
  assignedVehicleReg: text("assigned_vehicle_reg"),
  authUserId: uuid("auth_user_id").unique(),
  avatarSeed: text("avatar_seed"),
  profilePictureUrl: text("profile_picture_url"),
  status: text("status").notNull().default("Active"),
  version: integer("version").notNull().default(1),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const fleetOperators = pgTable("fleet_operators", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  companyName: text("company_name").notNull(),
  phone: text("phone").notNull(),
  email: text("email"),
  nationalId: text("national_id").unique(),
  taxNumber: text("tax_number").unique(),
  association: text("association"),
  avatarUrl: text("avatar_url"),
  bankAccountRef: text("bank_account_ref"),
  operatorLicenseNumber: text("operator_license_number"),
  authUserId: uuid("auth_user_id").unique(),
  version: integer("version").notNull().default(1),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const vehicles = pgTable(
  "vehicles",
  {
    registrationNumber: text("registration_number").primaryKey(),
    vic: text("vic").unique(),
    make: text("make").notNull(),
    model: text("model").notNull(),
    seatingCapacity: integer("seating_capacity").notNull(),
    classification: text("classification").notNull(),
    routeAssignmentId: text("route_assignment_id").references(() => routes.id),
    loadingBay: text("loading_bay"),
    ownerName: text("owner_name"),
    ownerPhone: text("owner_phone"),
    ownerOperatorId: text("owner_operator_id"),
    driverId: text("driver_id"),
    status: text("status").notNull().default("Waiting"),
    currentQueuePosition: integer("current_queue_position").notNull().default(0),
    permitNumber: text("permit_number"),
    permitStatus: text("permit_status"),
    permitIssueDate: date("permit_issue_date"),
    permitExpiryDate: date("permit_expiry_date"),
    cofNumber: text("cof_number"),
    cofIssueDate: date("cof_issue_date"),
    cofExpiryDate: date("cof_expiry_date"),
    lastInspectionDate: date("last_inspection_date"),
    association: text("association"),
    insuranceExpiry: date("insurance_expiry"),
    roadworthinessExpiry: date("roadworthiness_expiry"),
    isMidMonthAddition: boolean("is_mid_month_addition").notNull().default(false),
    registrationDate: date("registration_date"),
    monthRegistered: text("month_registered"),
    midMonthJoinDay: integer("mid_month_join_day"),
    monthlySequenceBaseIndex: integer("monthly_sequence_base_index"),
    version: integer("version").notNull().default(1),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("vehicles_status_idx").on(t.status),
    index("vehicles_route_idx").on(t.routeAssignmentId),
  ]
);

export const trips = pgTable("trips", {
  id: text("id").primaryKey(),
  date: date("date").notNull(),
  departureTime: text("departure_time").notNull(),
  arrivalTime: text("arrival_time"),
  routeId: text("route_id")
    .notNull()
    .references(() => routes.id),
  vehicleReg: text("vehicle_reg").notNull(),
  driverId: text("driver_id").notNull(),
  passengerCount: integer("passenger_count").notNull(),
  tripDurationMinutes: integer("trip_duration_minutes"),
  delayReason: text("delay_reason"),
  status: text("status").notNull().default("InProgress"),
  revenueSzl: numeric("revenue_szl", { precision: 12, scale: 2 }).notNull().default("0"),
  version: integer("version").notNull().default(1),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const incidents = pgTable("incidents", {
  id: text("id").primaryKey(),
  timestamp: timestamp("timestamp", { withTimezone: true }).notNull(),
  reporterName: text("reporter_name").notNull(),
  reporterPhone: text("reporter_phone").notNull(),
  reporterType: text("reporter_type"),
  category: text("category").notNull(),
  description: text("description").notNull(),
  vehicleReg: text("vehicle_reg"),
  routeId: text("route_id").references(() => routes.id),
  status: text("status").notNull().default("Pending"),
  escalatedTo: text("escalated_to"),
  imageUrl: text("image_url"),
  messages: jsonb("messages").notNull().default([]),
  version: integer("version").notNull().default(1),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const syncEvents = pgTable(
  "sync_events",
  {
    id: text("id").primaryKey(),
    entityType: text("entity_type").notNull(),
    entityId: text("entity_id").notNull(),
    operation: text("operation").notNull(),
    payload: jsonb("payload").notNull().default({}),
    idempotencyKey: text("idempotency_key").notNull().unique(),
    clientId: text("client_id").notNull(),
    occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull(),
    appliedAt: timestamp("applied_at", { withTimezone: true }).notNull().defaultNow(),
    seq: bigint("seq", { mode: "number" }).notNull(),
    baseVersion: integer("base_version"),
  },
  (t) => [
    index("sync_events_seq_idx").on(t.seq),
    index("sync_events_entity_idx").on(t.entityType, t.entityId),
  ]
);

export const notifications = pgTable("notifications", {
  id: text("id").primaryKey(),
  timestamp: timestamp("timestamp", { withTimezone: true }).notNull(),
  type: text("type").notNull(),
  recipientName: text("recipient_name"),
  recipientPhone: text("recipient_phone"),
  message: text("message").notNull(),
  status: text("status").notNull().default("Sent"),
  version: integer("version").notNull().default(1),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const adverts = pgTable("adverts", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  sponsorName: text("sponsor_name").notNull(),
  imageUrl: text("image_url").notNull(),
  targetRegions: text("target_regions").array().notNull().default(sql`ARRAY['All']::text[]`),
  isActive: boolean("is_active").notNull().default(true),
  fileSizeBytes: bigint("file_size_bytes", { mode: "number" }),
  description: text("description"),
  promoCode: text("promo_code"),
  contactPhone: text("contact_phone"),
  websiteUrl: text("website_url"),
  category: text("category"),
  impressions: integer("impressions").notNull().default(0),
  clicks: integer("clicks").notNull().default(0),
  startDate: date("start_date"),
  endDate: date("end_date"),
  version: integer("version").notNull().default(1),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});
