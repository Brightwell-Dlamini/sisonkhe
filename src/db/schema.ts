/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Drizzle schema — the single source of truth for the database structure.
 *
 * Rules:
 *   - All IDs are text (client-generatable, offline-first friendly)
 *   - All tables have `version integer` for optimistic concurrency
 *   - All tables have `created_at` + `updated_at`
 *   - Sync columns follow the existing `marshals` convention
 *   - Never store base64 images in a row — use Supabase Storage
 */

import {
  pgTable,
  text,
  integer,
  bigint,
  boolean,
  numeric,
  timestamp,
  date,
  jsonb,
  uuid,
  inet,
  pgSequence,
} from "drizzle-orm/pg-core";

// ---------------------------------------------------------------------------
// Sequences
// ---------------------------------------------------------------------------

export const syncEventsSeq = pgSequence("sync_events_seq_seq", {
  startWith: 1,
  increment: 1,
});

// ---------------------------------------------------------------------------
// Reference data
// ---------------------------------------------------------------------------

export const regions = pgTable("regions", {
  code: text("code").primaryKey(), // 'Hhohho', 'Manzini', ...
  name: text("name").notNull(),
  terminalName: text("terminal_name").notNull(),
  emergencyNumber: text("emergency_number"),
  announcement: text("announcement"),
  version: integer("version").notNull().default(1),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const routes = pgTable("routes", {
  id: text("id").primaryKey(),
  regionCode: text("region_code")
    .notNull()
    .references(() => regions.code),
  origin: text("origin").notNull(),
  destination: text("destination").notNull(),
  distanceKm: numeric("distance_km").notNull(),
  baseFareE: numeric("base_fare_e").notNull(),
  isPopular: boolean("is_popular").notNull().default(false),
  startTime: text("start_time"),
  defaultBay: text("default_bay"),
  version: integer("version").notNull().default(1),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// ---------------------------------------------------------------------------
// Fleet
// ---------------------------------------------------------------------------

export const vehicles = pgTable("vehicles", {
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

  // Mid-month queue tracking
  isMidMonthAddition: boolean("is_mid_month_addition").notNull().default(false),
  registrationDate: date("registration_date"),
  monthRegistered: text("month_registered"),
  midMonthJoinDay: integer("mid_month_join_day"),
  monthlySequenceBaseIndex: integer("monthly_sequence_base_index"),
  monthlyFirstTurnHistory: text("monthly_first_turn_history").array().default([]),

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

// ---------------------------------------------------------------------------
// Staff (non-domain roles)
// ---------------------------------------------------------------------------

export const staff = pgTable("staff", {
  id: text("id").primaryKey(),
  authUserId: uuid("auth_user_id").unique().notNull(),
  fullName: text("full_name").notNull(),
  email: text("email").notNull().unique(),
  phone: text("phone"),
  role: text("role").notNull(), // 'super-admin' | 'admin' | 'fleet-manager' | 'inspector'
  region: text("region"),
  terminalId: text("terminal_id"),
  isActive: boolean("is_active").notNull().default(true),
  lastLoginAt: timestamp("last_login_at", { withTimezone: true }),
  version: integer("version").notNull().default(1),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// ---------------------------------------------------------------------------
// Operations
// ---------------------------------------------------------------------------

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
  revenueSzl: numeric("revenue_szl").notNull().default("0"),
  version: integer("version").notNull().default(1),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const marshalTransactions = pgTable("marshal_transactions", {
  id: text("id").primaryKey(),
  marshalId: text("marshal_id").notNull(),
  timestamp: timestamp("timestamp", { withTimezone: true }).notNull(),
  date: date("date").notNull(),
  month: text("month").notNull(),
  vehicleReg: text("vehicle_reg").notNull(),
  amountSzl: numeric("amount_szl").notNull(),
  triggerSource: text("trigger_source").notNull(),
  version: integer("version").notNull().default(1),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const rankFeePayments = pgTable("rank_fee_payments", {
  id: text("id").primaryKey(),
  timestamp: timestamp("timestamp", { withTimezone: true }).notNull(),
  vehicleReg: text("vehicle_reg").notNull(),
  amountSzl: numeric("amount_szl").notNull(),
  paymentMethod: text("payment_method").notNull(),
  transactionRef: text("transaction_ref").unique(),
  status: text("status").notNull().default("Pending"),
  allocationOperational: numeric("allocation_operational").notNull().default("0"),
  allocationNrtc: numeric("allocation_nrtc").notNull().default("0"),
  allocationMaintenance: numeric("allocation_maintenance").notNull().default("0"),
  version: integer("version").notNull().default(1),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// ---------------------------------------------------------------------------
// Communication
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Enforcement & incidents
// ---------------------------------------------------------------------------

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

export const trafficTickets = pgTable("traffic_tickets", {
  id: text("id").primaryKey(),
  ticketNumber: text("ticket_number").unique().notNull(),
  timestamp: timestamp("timestamp", { withTimezone: true }).notNull(),
  vehicleReg: text("vehicle_reg").notNull(),
  officerName: text("officer_name").notNull(),
  officerBadge: text("officer_badge").notNull(),
  offenseType: text("offense_type").notNull(),
  amountSzl: numeric("amount_szl").notNull(),
  location: text("location"),
  status: text("status").notNull().default("Issued"),
  notes: text("notes"),
  version: integer("version").notNull().default(1),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// ---------------------------------------------------------------------------
// Permits
// ---------------------------------------------------------------------------

export const permitRenewalRequests = pgTable("permit_renewal_requests", {
  id: text("id").primaryKey(),
  vehicleReg: text("vehicle_reg").notNull(),
  fleetId: text("fleet_id"),
  currentPermitNumber: text("current_permit_number"),
  currentExpiryDate: date("current_expiry_date"),
  operator: text("operator"),
  driver: text("driver"),
  reasonForRenewal: text("reason_for_renewal").notNull(),
  comments: text("comments"),
  supportingDocuments: text("supporting_documents").array().default([]),
  status: text("status").notNull().default("Pending Admin Approval"),
  timestamp: timestamp("timestamp", { withTimezone: true }).notNull(),
  requestDate: date("request_date").notNull(),

  newPermitNumber: text("new_permit_number"),
  permitIssueDate: date("permit_issue_date"),
  permitExpiryDate: date("permit_expiry_date"),
  cofNumber: text("cof_number"),
  cofIssueDate: date("cof_issue_date"),
  cofExpiryDate: date("cof_expiry_date"),
  inspectionDate: date("inspection_date"),
  licensingOffice: text("licensing_office"),
  renewalNotes: text("renewal_notes"),
  approvedBy: text("approved_by"),
  approvalDate: date("approval_date"),

  operatorLicenseNumber: text("operator_license_number"),
  odometerReading: integer("odometer_reading"),
  yearOfManufacture: integer("year_of_manufacture"),
  insurancePolicy: text("insurance_policy"),
  concessionId: text("concession_id"),

  paidWithMasterCard: boolean("paid_with_master_card").notNull().default(false),
  masterPaymentRef: text("master_payment_ref"),
  renewalFeeAmountSzl: numeric("renewal_fee_amount_szl"),

  version: integer("version").notNull().default(1),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const permitRenewalArchives = pgTable("permit_renewal_archives", {
  id: text("id").primaryKey(),
  vehicleReg: text("vehicle_reg").notNull(),
  previousPermitNumber: text("previous_permit_number"),
  newPermitNumber: text("new_permit_number").notNull(),
  issueDate: date("issue_date"),
  expiryDate: date("expiry_date"),
  administrator: text("administrator").notNull(),
  renewalDate: date("renewal_date").notNull(),
  comments: text("comments"),
  supportingDocuments: text("supporting_documents").array().default([]),
  version: integer("version").notNull().default(1),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const permitAuditLogs = pgTable("permit_audit_logs", {
  id: text("id").primaryKey(),
  userId: uuid("user_id"),
  userRole: text("user_role"),
  date: date("date").notNull(),
  time: text("time").notNull(),
  device: text("device"),
  action: text("action").notNull(),
  previousValues: jsonb("previous_values"),
  newValues: jsonb("new_values"),
  approvalDecision: text("approval_decision"),
  ipAddress: inet("ip_address"),
  version: integer("version").notNull().default(1),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// ---------------------------------------------------------------------------
// Financial — cards
// ---------------------------------------------------------------------------

export const vehicleVirtualCards = pgTable("vehicle_virtual_cards", {
  id: text("id").primaryKey(),
  cardNumber: text("card_number").unique().notNull(),
  cvvHash: text("cvv_hash").notNull(),
  expiryDate: text("expiry_date").notNull(),
  vehicleReg: text("vehicle_reg").unique().notNull(),
  vic: text("vic").notNull(),
  cardholderName: text("cardholder_name"),
  driverId: text("driver_id").references(() => drivers.id),
  driverName: text("driver_name"),
  status: text("status").notNull().default("Active"),
  balanceSzl: numeric("balance_szl").notNull().default("0"),
  registrationFeePaid: boolean("registration_fee_paid").notNull().default(false),
  registrationFeeAmount: numeric("registration_fee_amount").notNull().default("0"),
  registrationFeeDate: date("registration_fee_date"),
  registrationReceiptRef: text("registration_receipt_ref"),
  cardTier: text("card_tier").notNull().default("Commercial Concession"),
  dailySpendLimitSzl: numeric("daily_spend_limit_szl").notNull().default("0"),
  qrPayload: text("qr_payload"),
  version: integer("version").notNull().default(1),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const virtualCardTransactions = pgTable("virtual_card_transactions", {
  id: text("id").primaryKey(),
  cardId: text("card_id")
    .notNull()
    .references(() => vehicleVirtualCards.id),
  timestamp: timestamp("timestamp", { withTimezone: true }).notNull(),
  type: text("type").notNull(),
  description: text("description").notNull(),
  amountSzl: numeric("amount_szl").notNull(),
  direction: text("direction").notNull(),
  terminalOrMarshal: text("terminal_or_marshal"),
  receiptNumber: text("receipt_number").unique(),
  status: text("status").notNull().default("Completed"),
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

export const operatorMasterCards = pgTable("operator_master_cards", {
  id: text("id").primaryKey(),
  cardNumber: text("card_number").unique().notNull(),
  cvvHash: text("cvv_hash").notNull(),
  expiryDate: text("expiry_date").notNull(),
  operatorId: text("operator_id")
    .unique()
    .notNull()
    .references(() => fleetOperators.id),
  operatorName: text("operator_name").notNull(),
  companyName: text("company_name").notNull(),
  balanceSzl: numeric("balance_szl").notNull().default("0"),
  status: text("status").notNull().default("Active"),
  cardTier: text("card_tier").notNull().default("Enterprise Master Concession"),
  dailyTransferLimitSzl: numeric("daily_transfer_limit_szl").notNull().default("0"),
  version: integer("version").notNull().default(1),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const operatorCardTransactions = pgTable("operator_card_transactions", {
  id: text("id").primaryKey(),
  cardId: text("card_id")
    .notNull()
    .references(() => operatorMasterCards.id),
  timestamp: timestamp("timestamp", { withTimezone: true }).notNull(),
  type: text("type").notNull(),
  description: text("description").notNull(),
  targetVehicleReg: text("target_vehicle_reg"),
  targetDriverName: text("target_driver_name"),
  category: text("category"),
  amountSzl: numeric("amount_szl").notNull(),
  direction: text("direction").notNull(),
  receiptNumber: text("receipt_number").unique(),
  paymentMethod: text("payment_method"),
  status: text("status").notNull().default("Completed"),
  version: integer("version").notNull().default(1),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// ---------------------------------------------------------------------------
// Advertising
// ---------------------------------------------------------------------------

export const adverts = pgTable("adverts", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  sponsorName: text("sponsor_name").notNull(),
  imageUrl: text("image_url").notNull(),
  targetRegions: text("target_regions").array().notNull().default(["All"]),
  isActive: boolean("is_active").notNull().default(true),
  fileSizeBytes: bigint("file_size_bytes", { mode: "number" }),
  description: text("description"),
  promoCode: text("promo_code"),
  contactPhone: text("contact_phone"),
  websiteUrl: text("website_url"),
  category: text("category"),
  budgetSzl: numeric("budget_szl"),
  impressions: integer("impressions").notNull().default(0),
  clicks: integer("clicks").notNull().default(0),
  startDate: date("start_date"),
  endDate: date("end_date"),
  version: integer("version").notNull().default(1),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// ---------------------------------------------------------------------------
// Sync infrastructure
// ---------------------------------------------------------------------------

export const syncEvents = pgTable("sync_events", {
  id: text("id").primaryKey(),
  entityType: text("entity_type").notNull(),
  entityId: text("entity_id").notNull(),
  operation: text("operation").notNull(),
  payload: jsonb("payload").notNull().default({}),
  idempotencyKey: text("idempotency_key").unique().notNull(),
  clientId: text("client_id").notNull(),
  occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull(),
  appliedAt: timestamp("applied_at", { withTimezone: true }).notNull().defaultNow(),
  seq: bigint("seq", { mode: "number" }).notNull().default(0),
  baseVersion: integer("base_version"),
});
