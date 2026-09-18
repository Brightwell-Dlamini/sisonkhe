/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export enum EswatiniRegion {
  Hhohho = "Hhohho",
  Manzini = "Manzini",
  Lubombo = "Lubombo",
  Shiselweni = "Shiselweni"
}

export type UserRole = 
  | "super-admin" 
  | "admin" 
  | "rank-admin" 
  | "driver" 
  | "fleet-manager" 
  | "inspector" 
  | "police" 
  | "operator" 
  | "vehicle-owner"
  | "Admin"
  | "Operator"
  | "Driver"
  | "Super Admin"
  | "Commuter";

export interface Route {
  id: string; // e.g., "mbabane-manzini"
  region: EswatiniRegion;
  origin: string;
  destination: string;
  distanceKm: number;
  baseFareE: number; // Emalangeni (SZL)
  fare?: number; // alias for baseFareE
  isPopular?: boolean;
  startTime?: string; // Daily/operating start time, e.g., "05:00"
  estimatedMinutes?: number;
  defaultBay?: string;
  timetableStartTime?: string;
}

export type NotificationItem = RankNotification;

export enum KombiStatus {
  Waiting = "Waiting",
  Loading = "Loading",
  Full = "Full",
  Departed = "Departed",
  Returning = "Returning",
  Delayed = "Delayed",
  Breakdown = "Breakdown",
  Offline = "Offline"
}

export interface Vehicle {
  registrationNumber: string; // e.g., "ASD 633 BM"
  fleetNumber: string; // e.g., "K-104" (holds generated VIC as primary identifier)
  vic?: string; // Vehicle Identification Code
  make: string; // e.g., "Toyota"
  model: string; // e.g., "Quantum"
  seatingCapacity: number; // e.g., 15
  capacity?: number; // seating capacity alias
  routeAssignmentId: string; // Route ID
  loadingBay: string; // e.g., "Bay 4"
  ownerName: string;
  ownerPhone: string;
  driverId: string;
  insuranceExpiry?: string; // YYYY-MM-DD
  roadworthinessExpiry?: string; // YYYY-MM-DD
  status: KombiStatus;
  classification: "kombi" | "midbus" | "bus";
  currentQueuePosition: number; // 0 if not in active queue, 1, 2, 3...
  tripsToday: number;
  lastActive: string; // Timestamp
  loadingStartTime?: string; // HH:MM
  loadingDurationMinutes?: number; // expected duration in minutes
  expectedDepartureTime?: string; // HH:MM
  arrivalRegisterTime?: string; // HH:MM
  fullCabinTime?: string; // HH:MM
  returningTime?: string; // HH:MM
  delayedTime?: string; // HH:MM
  breakdownTime?: string; // HH:MM
  
  // Road Permit & Fleet details
  permitNumber?: string;
  permitStatus?: "A" | "E" | "S" | "Active" | "Expired" | "Suspended";
  permitIssueDate?: string;
  permitExpiryDate?: string;
  association?: string;
  vehiclePhotoUrl?: string;
  lastInspectionDate?: string;

  // COF details
  cofNumber?: string;
  cofIssueDate?: string;
  cofExpiryDate?: string;

  // 30-Day Monthly Queuing Sequence Engine & Metadata
  addedMidMonth?: boolean;
  isMidMonthAddition?: boolean;
  registrationDate?: string; // e.g. "2026-08-25"
  registeredTimestamp?: string | number; // e.g. ISO timestamp or ms epoch
  registeredByRole?: string; // e.g. "Fleet Manager"
  monthRegistered?: string; // e.g. "2026-08"
  midMonthJoinDay?: number; // e.g. Day 25
  registeredByMarshal?: string; // e.g. "Rank Marshal Nomvula"
  metadataOriginExplanation?: string; // Explains where metadata comes from
  rosterStatusLabel?: string; // e.g. "Standard Roster" | "Mid-Month Tail (Locked)"
  nextCycleEligibilityDate?: string; // e.g. "2026-09-01"
  monthlySequenceBaseIndex?: number; // Base position for current 30-day cycle
  monthlyFirstTurnHistory?: string[]; // Log of months this vehicle was #1
}

export interface Driver {
  id: string; // unique driver ID
  fullName: string;
  nationalId: string; // e.g., "950412..."
  phone: string;
  residentialAddress?: string;
  cellPhone?: string;
  whatsappPhone?: string;
  sameAsCell?: boolean;
  homeTel?: string;
  dateOfBirth?: string;
  gender?: string;
  licenseNumber: string;
  licenseClass: string; // PDP Details
  status: "Active" | "Suspended" | "On Leave" | "Off-Duty";
  emergencyContactName: string;
  emergencyContactPhone: string;
  emergencyContactRelation?: string;
  assignedVehicleReg: string;
  avatarSeed: string; // for UI avatar generation
  profilePictureUrl?: string;

  // Driver Login Credentials
  username?: string;
  password?: string;

  // PDP details
  pdpNumber?: string;
  pdpIssueDate?: string;
  pdpExpiryDate?: string;
  pdpIssuingAuthority?: string;
  pdpStatus?: "Valid" | "Expired" | "Suspended";
  driverLicenceType?: "Permanent";

  // Relational linked assignment cache
  assignedVic?: string;
  assignedVehicle?: string;
  assignedRoute?: string;
  assignedBay?: string;
  assignedPermit?: string;
  assignedRegion?: string;
  assignedTerminal?: string;
}

export interface Trip {
  id: string;
  date: string; // YYYY-MM-DD
  departureTime: string; // HH:MM
  arrivalTime?: string; // HH:MM
  routeId: string;
  vehicleReg: string;
  driverId: string;
  passengerCount: number;
  tripDurationMinutes?: number;
  delayReason?: string;
  status: "InProgress" | "Completed" | "Cancelled";
  revenueSZL: number;
}

export interface RankNotification {
  id: string;
  timestamp: string;
  type: "SMS" | "WhatsApp" | "Push";
  recipientName: string;
  recipientPhone: string;
  message: string;
  status: "Sent" | "Delivered" | "Failed";
}

export interface IncidentMessage {
  id: string;
  sender: "Commuter" | "Inspector" | "Driver" | "Other";
  senderName: string;
  text: string;
  timestamp: string;
}

export interface IncidentReport {
  id: string;
  timestamp: string;
  reporterName: string;
  reporterPhone: string;
  category: "Lost property" | "Dangerous driving" | "Route violation" | "Driver misconduct" | "Other transport user misconduct" | "Service complaint";
  description: string;
  vehicleReg?: string;
  routeId?: string;
  status: "Pending" | "Investigating" | "Escalated" | "Resolved";
  escalatedTo: "None" | "Local Transport Association" | "Municipal Council" | "National Road Transportation Council (NRTC)";
  messages?: IncidentMessage[];
  reporterType?: "Commuter" | "Driver";
  imageUrl?: string;
}

export interface RankFeePayment {
  id: string;
  timestamp: string;
  vehicleReg: string;
  amountSZL: number; // E25
  paymentMethod: "MTN MoMo" | "e-Mlangeni" | "Cash" | "Virtual Card";
  transactionRef: string;
  status: "Success" | "Pending" | "Failed";
  allocationOperational: number; // E20
  allocationNRTC: number; // E3.50
  allocationMaintenance: number; // E1.50
}

export interface TaxiRank {
  id: string;
  name: string; // e.g., "Mbabane Mbabane Main Plaza Rank" or "Manzini Satellite Rank"
  city: string;
}

export interface RegionConfig {
  region: EswatiniRegion;
  terminalName: string;
  emergencyNumber: string;
  announcement: string;
}

export interface TrafficTicket {
  id: string;
  ticketNumber: string;
  timestamp: string;
  issuedAt?: string;
  vehicleReg: string;
  officerName: string;
  officerBadge: string;
  offenseType: "Speeding" | "Overloading" | "Expired Permit" | "Unroadworthy Vehicle" | "No Public Liability Cover" | "Illegal Picking/Dropping" | "Other";
  amountSZL: number;
  location: string;
  status: "Issued" | "Paid" | "Synchronized" | "Challenged";
  notes?: string;
}

export interface PermitRenewalRequest {
  id: string;
  vehicleReg: string;
  fleetId: string; // Same as fleetNumber or vic
  currentPermitNumber: string;
  currentExpiryDate: string;
  operator: string;
  driver: string;
  reasonForRenewal: string;
  comments: string;
  supportingDocuments: string[];
  status: "Pending Admin Approval" | "Approved" | "Rejected";
  timestamp: string;
  requestDate: string;

  // Admin manually entered/edited fields
  newPermitNumber?: string;
  permitIssueDate?: string;
  permitExpiryDate?: string;
  cofNumber?: string;
  cofIssueDate?: string;
  cofExpiryDate?: string;
  inspectionDate?: string;
  licensingOffice?: string;
  renewalNotes?: string;
  approvalStatus?: "Approved" | "Rejected";
  approvedBy?: string;
  approvalDate?: string;

  // Additional detail fields
  operatorLicenseNumber?: string;
  odometerReading?: number;
  yearOfManufacture?: number;
  insurancePolicy?: string;
  concessionId?: string;
  paidWithMasterCard?: boolean;
  masterPaymentRef?: string;
  renewalFeeAmountSZL?: number;
}

export interface RenewalArchive {
  id: string;
  vehicleReg: string;
  previousPermitNumber: string;
  newPermitNumber: string;
  issueDate: string;
  expiryDate: string;
  administrator: string;
  renewalDate: string;
  comments: string;
  supportingDocuments: string[];
}

export interface PermitAuditLog {
  id: string;
  user: string;
  date: string;
  time: string;
  device: string;
  action: string;
  previousValues: string;
  newValues: string;
  approvalDecision?: string;
  ipAddress?: string;
}

export interface MarshalAccount {
  id: string;
  fullName: string;
  nationalId?: string;
  phone?: string;
  residentialAddress?: string;
  cellPhone?: string;
  whatsappPhone?: string;
  sameAsCell?: boolean;
  homeTel?: string;
  dateOfBirth?: string;
  gender?: string;
  region: string; // "Hhohho" | "Manzini" | "Lubombo" | "Shiselweni"
  terminalName: string;
  avatarSeed: string;
  profilePictureUrl?: string;
  assignedRouteId?: string; // Specific Corridor Route assigned to the marshal
  badgeNumber?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  emergencyContactRelation?: string;
  username?: string;
  password?: string;
  status?: "Active" | "Suspended" | "On Leave" | "Off-Duty";
  shiftAssignment?: string;
  marshalRole?: string;
  stationOffice?: string;
  issueDate?: string;
  expiryDate?: string;
  issuingAuthority?: string;
  cardNumber?: string;
  cardBalanceSZL?: number;
}

export interface MarshalTransaction {
  id: string;
  marshalId: string;
  timestamp: string; // ISO string
  date: string; // YYYY-MM-DD
  month: string; // YYYY-MM
  vehicleReg: string;
  amountSZL: number;
  triggerSource: "Full Cabin Button" | "Depart Button";
}

export interface Advert {
  id: string;
  title: string;
  sponsorName: string;
  imageUrl: string;
  targetRegions: ("All" | EswatiniRegion | string)[];
  isActive: boolean;
  createdAt: string;
  fileSizeBytes?: number;
  description?: string;
  promoCode?: string;
  contactPhone?: string;
  websiteUrl?: string;
  category?: string;
  budgetSZL?: number;
  impressions?: number;
  clicks?: number;
  startDate?: string;
  endDate?: string;
}

export interface VirtualCardTransaction {
  id: string;
  timestamp: string; // ISO string
  type: "REGISTRATION_FEE" | "RANK_FEE" | "TERMINAL_LEVY" | "FUEL_ALLOWANCE" | "TOP_UP" | "MAINTENANCE" | "ASSOCIATION_DUES";
  description: string;
  amountSZL: number;
  direction: "DEBIT" | "CREDIT";
  terminalOrMarshal?: string;
  receiptNumber: string;
  status: "Completed" | "Pending" | "Reversed";
}

export interface VehicleVirtualCard {
  id: string; // e.g. "VCARD-HSD-101-BM"
  cardNumber: string; // 16 digits e.g. "5342 8190 2341 1012"
  cvv: string; // 3 digits e.g. "384"
  expiryDate: string; // MM/YY e.g. "09/29"
  vehicleReg: string; // "HSD 101 BM"
  vic: string; // "HBM101"
  cardholderName: string; // Driver or Fleet Owner name
  driverId?: string;
  driverName?: string;
  status: "Active" | "Frozen" | "Suspended";
  balanceSZL: number; // Balance in Emalangeni
  registrationFeePaid: boolean;
  registrationFeeAmount: number; // e.g. 450
  registrationFeeDate: string;
  registrationReceiptRef: string;
  cardTier: "Commercial Concession" | "Public Transit Gold" | "Metro Elite";
  dailySpendLimitSZL: number;
  createdAt: string;
  qrPayload: string; // Encrypted / formatted string for QR scans
  transactions: VirtualCardTransaction[];
}

export interface FleetOperator {
  id: string; // e.g., "op_cyril"
  name: string; // "Cyril Kunene"
  companyName: string; // "Kunene Express & Transit"
  phone: string; // "+268 7602 8899"
  email?: string;
  nationalId: string; // "7405185120899"
  taxNumber?: string; // "TIN-SZ-992140"
  association: string; // "Hhohho Kombi Association (HKA)"
  avatarUrl?: string;
  bankAccountRef?: string;
  operatorLicenseNumber?: string;
}

export interface OperatorMasterCardTransaction {
  id: string;
  timestamp: string; // ISO string
  type: "MASTER_TOP_UP" | "VEHICLE_DISBURSEMENT" | "PERMIT_RENEWAL_FEE" | "MAINTENANCE_PAYMENT" | "EMERGENCY_FLOAT";
  description: string;
  targetVehicleReg?: string;
  targetDriverName?: string;
  category?: "Fuel Allowance" | "Daily Rank Fee Budget" | "Maintenance" | "Emergency Driver Cash" | "Permit Renewal" | "Other";
  amountSZL: number;
  direction: "DEBIT" | "CREDIT";
  receiptNumber: string;
  paymentMethod?: string;
  status: "Completed" | "Pending" | "Failed";
}

export interface OperatorMasterCard {
  id: string; // e.g. "MCARD-CYRIL-KUNENE"
  cardNumber: string; // 16 digits e.g. "5342 9901 4420 8812"
  cvv: string; // "841"
  expiryDate: string; // "12/29"
  operatorId: string;
  operatorName: string;
  companyName: string;
  balanceSZL: number; // Emalangeni
  status: "Active" | "Frozen";
  cardTier: "Enterprise Master Concession";
  dailyTransferLimitSZL: number;
  createdAt: string;
  transactions: OperatorMasterCardTransaction[];
}


