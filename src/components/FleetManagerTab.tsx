/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useRef } from "react";
import {
  Vehicle,
  Driver,
  Route,
  KombiStatus,
  EswatiniRegion,
  NotificationItem,
  PermitRenewalRequest,
  RenewalArchive,
  PermitAuditLog,
  Trip,
  MarshalAccount,
  MarshalTransaction,
  RegionConfig
} from "../types";
import {
  Truck,
  Users,
  Plus,
  Search,
  Filter,
  Calendar,
  Layers,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  ShieldCheck,
  CheckCircle2,
  Clock,
  Key,
  Camera,
  Edit2,
  Trash2,
  Award,
  FileText,
  Printer,
  ChevronRight,
  ChevronLeft,
  Sparkles,
  AlertTriangle,
  RotateCw,
  MapPin,
  Car,
  Copy,
  Eye,
  EyeOff,
  Check,
  Navigation,
  QrCode,
  Smartphone,
  ExternalLink,
  Shield,
  FileBadge,
  Download,
  TrendingUp,
  ListOrdered,
  Activity,
  CheckCircle,
  Scale,
  BarChart3,
  RefreshCw,
  CreditCard,
  Building2
} from "lucide-react";
import { generateVIC, syncDriversAndVehicles } from "../utils/helper";
import {
  computeMonthlyRoster,
  advanceMonthlyRotation,
  getCurrentMonthStr,
  getAvailableMonths,
  getAvailableYears,
  DEFAULT_AVAILABLE_YEARS,
  computeVehicleTripStats,
  getLast15QueuePositions,
  computeYoYComparison,
  MonthOption,
  RosterQueueItem,
  YoYComparisonResult
} from "../utils/queueSequence";
import { pushServerState } from "../utils/syncManager";
import { getVehicleQRUrl, syncVehicleQRIfNeeded, logQREvent } from "../utils/qrSecurity";
import { getOrCreateVehicleVirtualCard } from "../utils/virtualCards";

// Modular Sub-Components
import VehicleRegistrationModal from "./fleet/VehicleRegistrationModal";
import DriverRegistrationModal from "./fleet/DriverRegistrationModal";
import OfficialPlaqueQRModal from "./fleet/OfficialPlaqueQRModal";
import A4PermitPrintModal from "./fleet/A4PermitPrintModal";
import QRValidityCertificateModal from "./fleet/QRValidityCertificateModal";
import DriverCredentialsChatSubTab from "./fleet/DriverCredentialsChatSubTab";
import VehicleVirtualCardModal from "./fleet/VehicleVirtualCardModal";
import PermitRenewalsSubTab from "./PermitRenewalsSubTab";
import SecurityAuditTrailSubTab from "./SecurityAuditTrailSubTab";
import YoYQueueComparisonView from "./fleet/YoYQueueComparisonView";
import ComplianceReportsSubTab from "./ComplianceReportsSubTab";
import RankLedgerSubTab from "./fleet/RankLedgerSubTab";
import RegionalTerminalsSubTab from "./fleet/RegionalTerminalsSubTab";
import MarshalRegistrationModal from "./fleet/MarshalRegistrationModal";
import MarshalVirtualCardModal from "./fleet/MarshalVirtualCardModal";
import { INITIAL_MARSHALS, INITIAL_MARSHAL_TRANSACTIONS, INITIAL_REGION_CONFIGS } from "../utils/mockData";

const DEFAULT_ASSOCIATIONS = [
  "Mbabane Highway Transport Association (MHTA)",
  "Manzini District Kombi Association (MDKA)",
  "Lubombo Regional Taxi Union (LRTU)",
  "Southern Public Motor Operators Union (SPMOU)",
  "Eswatini National Road Transport Council (ENRTC)"
];

const VEHICLE_IMAGES = [
  "https://images.unsplash.com/photo-1570125909232-eb263c188f7e?w=800&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?w=800&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1568605117036-5fe5e7bab0b7?w=800&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1559297434-fae8a1916a79?w=800&auto=format&fit=crop&q=80"
];

interface FleetManagerTabProps {
  vehicles: Vehicle[];
  drivers: Driver[];
  routes: Route[];
  trips?: Trip[];
  currentRegion?: EswatiniRegion;
  activeRegion?: EswatiniRegion;
  onUpdateVehicles: (vehicles: Vehicle[]) => void;
  onUpdateDrivers: (drivers: Driver[]) => void;
  onAddVehicle?: (vehicle: Vehicle) => void;
  onAddDriver?: (driver: Driver) => void;
  onEditVehicle?: (vehicle: Vehicle) => void;
  onEditDriver?: (driver: Driver) => void;
  onDeleteVehicle?: (reg: string) => void;
  onDeleteDriver?: (id: string) => void;
  onAddRoute?: (route: Route) => void;
  onEditRoute?: (route: Route) => void;
  onDeleteRoute?: (routeId: string) => void;
  notifications?: NotificationItem[];
  onAddNotification?: (notif: Omit<NotificationItem, "id" | "timestamp">) => void;
  onTabChange?: (tab: string) => void;
  marshals?: MarshalAccount[];
  marshalTransactions?: MarshalTransaction[];
  onUpdateMarshals?: (marshals: MarshalAccount[]) => void;
  rankFee?: number;
  splitOperational?: number;
  splitNRTC?: number;
  splitMaintenance?: number;
  onUpdateRankFee?: (fee: number, ops?: number, nrtc?: number, maint?: number) => void;
  onUpdateRankFeeSplits?: (operational: number, nrtc: number, maintenance: number) => void;
  regionConfigs?: RegionConfig[];
  onUpdateRegionConfigs?: (configs: RegionConfig[]) => void;
}

export default function FleetManagerTab({
  vehicles,
  drivers,
  routes,
  trips = [],
  currentRegion = EswatiniRegion.Hhohho,
  activeRegion = EswatiniRegion.Hhohho,
  onUpdateVehicles,
  onUpdateDrivers,
  onAddVehicle,
  onAddDriver,
  onEditVehicle,
  onEditDriver,
  onDeleteVehicle,
  onDeleteDriver,
  onAddRoute,
  onEditRoute,
  onDeleteRoute,
  notifications = [],
  onAddNotification,
  onTabChange,
  marshals = INITIAL_MARSHALS,
  onUpdateMarshals,
  marshalTransactions = INITIAL_MARSHAL_TRANSACTIONS,
  rankFee = 25,
  splitOperational = 20,
  splitNRTC = 3.5,
  splitMaintenance = 1.5,
  onUpdateRankFee,
  onUpdateRankFeeSplits,
  regionConfigs = INITIAL_REGION_CONFIGS,
  onUpdateRegionConfigs
}: FleetManagerTabProps) {
  const [activeSubTab, setActiveSubTab] = useState<
    "fleet" | "queue" | "drivers" | "routes" | "revenue" | "terminals" | "permits" | "renewals" | "audits" | "reports"
  >("fleet");

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedRegionFilter, setSelectedRegionFilter] = useState<string>("All");
  const [selectedRouteFilter, setSelectedRouteFilter] = useState<string>("All");
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>("All");
  const [viewMode, setViewMode] = useState<"table" | "grid">("table");

  // Modals state
  const [isVehicleModalOpen, setIsVehicleModalOpen] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);

  const [isDriverModalOpen, setIsDriverModalOpen] = useState(false);
  const [editingDriver, setEditingDriver] = useState<Driver | null>(null);

  const [qrModalVehicle, setQrModalVehicle] = useState<Vehicle | null>(null);
  const [validityCertVehicle, setValidityCertVehicle] = useState<Vehicle | null>(null);
  const [printA4Vehicle, setPrintA4Vehicle] = useState<Vehicle | null>(null);
  const [inspectedMetadataVehicle, setInspectedMetadataVehicle] = useState<Vehicle | null>(null);
  const [deleteConfirmVehicle, setDeleteConfirmVehicle] = useState<Vehicle | null>(null);
  const [virtualCardVehicle, setVirtualCardVehicle] = useState<Vehicle | null>(null);
  const [isVirtualCardModalOpen, setIsVirtualCardModalOpen] = useState(false);
  const [isNewCardRegistration, setIsNewCardRegistration] = useState(false);

  // Marshal Registration & Card Modal State
  const [isMarshalModalOpen, setIsMarshalModalOpen] = useState(false);
  const [editingMarshal, setEditingMarshal] = useState<MarshalAccount | null>(null);
  const [activeCardMarshal, setActiveCardMarshal] = useState<MarshalAccount | null>(null);
  const [isMarshalCardModalOpen, setIsMarshalCardModalOpen] = useState(false);
  const [isNewMarshalRegistration, setIsNewMarshalRegistration] = useState(false);

  // Queue View state with Multi-Year Calendar Cycle & YoY Comparison
  const [queueMode, setQueueMode] = useState<"roster30day" | "trips" | "positions15" | "live" | "yoy">("roster30day");
  const availableYears = useMemo(() => getAvailableYears(), []);
  const [rosterYear, setRosterYear] = useState<number>(() => {
    const currentStr = getCurrentMonthStr();
    return parseInt(currentStr.split("-")[0], 10) || 2026;
  });
  const [compareYear, setCompareYear] = useState<number>(2025);
  const [selectedQueueRouteId, setSelectedQueueRouteId] = useState<string>(routes[0]?.id || "h_mb_mz");
  const [rosterMonth, setRosterMonth] = useState<string>(() => getCurrentMonthStr());
  const [selectedRosterDay, setSelectedRosterDay] = useState<number>(() => {
    const today = new Date().getDate();
    return today <= 30 ? today : 1;
  });
  const [queueSearchQuery, setQueueSearchQuery] = useState("");
  const [copiedYoYReport, setCopiedYoYReport] = useState(false);

  // Route Editor state
  const [isRouteModalOpen, setIsRouteModalOpen] = useState(false);
  const [editingRoute, setEditingRoute] = useState<Route | null>(null);
  const [routeForm, setRouteForm] = useState<Partial<Route>>({
    origin: "",
    destination: "",
    region: EswatiniRegion.Hhohho,
    baseFareE: 50,
    estimatedMinutes: 45,
    distanceKm: 35,
    defaultBay: "Bay 01",
    timetableStartTime: "05:30"
  });

  // Renewals & Audit storage
  const [renewalRequests, setRenewalRequests] = useState<PermitRenewalRequest[]>(() => {
    try {
      const saved = localStorage.getItem("kombiflow_permit_renewal_requests");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [renewalArchives, setRenewalArchives] = useState<RenewalArchive[]>(() => {
    try {
      const saved = localStorage.getItem("kombiflow_permit_renewal_archives");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [auditLogs, setAuditLogs] = useState<PermitAuditLog[]>(() => {
    try {
      const saved = localStorage.getItem("kombiflow_permit_audit_logs");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [isRenewalRequestModalOpen, setIsRenewalRequestModalOpen] = useState(false);
  const [isRenewalProcessModalOpen, setIsRenewalProcessModalOpen] = useState(false);
  const [selectedRenewalVehicle, setSelectedRenewalVehicle] = useState<Vehicle | null>(null);

  const saveRenewalRequests = (reqs: PermitRenewalRequest[]) => {
    setRenewalRequests(reqs);
    localStorage.setItem("kombiflow_permit_renewal_requests", JSON.stringify(reqs));
  };

  const saveRenewalArchives = (arcs: RenewalArchive[]) => {
    setRenewalArchives(arcs);
    localStorage.setItem("kombiflow_permit_renewal_archives", JSON.stringify(arcs));
  };

  const saveAuditLogs = (logs: PermitAuditLog[]) => {
    setAuditLogs(logs);
    localStorage.setItem("kombiflow_permit_audit_logs", JSON.stringify(logs));
  };

  // Filtered vehicles list
  const filteredVehicles = useMemo(() => {
    return vehicles.filter((v) => {
      const matchesSearch =
        v.registrationNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (v.vic && v.vic.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (v.permitNumber && v.permitNumber.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (v.ownerName && v.ownerName.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (v.make && v.make.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (v.model && v.model.toLowerCase().includes(searchQuery.toLowerCase()));

      const routeObj = routes.find((r) => r.id === v.routeAssignmentId);
      const matchesRegion =
        selectedRegionFilter === "All" ||
        (routeObj && routeObj.region === selectedRegionFilter);

      const matchesRoute =
        selectedRouteFilter === "All" || v.routeAssignmentId === selectedRouteFilter;

      const matchesStatus =
        selectedStatusFilter === "All" || (v.permitStatus || "Active") === selectedStatusFilter;

      return matchesSearch && matchesRegion && matchesRoute && matchesStatus;
    });
  }, [vehicles, routes, searchQuery, selectedRegionFilter, selectedRouteFilter, selectedStatusFilter]);

  // Queue vehicles for selected route
  const queueVehicles = useMemo(() => {
    return vehicles
      .filter((v) => v.routeAssignmentId === selectedQueueRouteId)
      .sort((a, b) => (a.currentQueuePosition || 99) - (b.currentQueuePosition || 99));
  }, [vehicles, selectedQueueRouteId]);

  // Compute monthly roster plan using calendar month logic (ends on last day of month)
  const monthlyRosterPlan = useMemo(() => {
    return computeMonthlyRoster(queueVehicles, rosterMonth, drivers, trips);
  }, [queueVehicles, rosterMonth, drivers, trips]);

  const activeRosterDayVehicles = useMemo(() => {
    return monthlyRosterPlan.dailyRosterMap[selectedRosterDay] || [];
  }, [monthlyRosterPlan, selectedRosterDay]);

  // Vehicle trips statistics for corridor in this month
  const routeTripStats = useMemo(() => {
    const selectedRoute = routes.find(r => r.id === selectedQueueRouteId);
    return computeVehicleTripStats(queueVehicles, rosterMonth, drivers, trips, selectedRoute?.baseFareE || 50);
  }, [queueVehicles, rosterMonth, drivers, trips, routes, selectedQueueRouteId]);

  // Last 15 queuing positions (positions 1..15)
  const last15Positions = useMemo(() => {
    return getLast15QueuePositions(queueVehicles, drivers, trips, rosterMonth);
  }, [queueVehicles, drivers, trips, rosterMonth]);

  // Available selectable months for selected cycle year
  const availableMonths = useMemo(() => {
    return getAvailableMonths(rosterYear);
  }, [rosterYear]);

  const selectedMonthOption = useMemo(() => {
    return availableMonths.find(m => m.id === rosterMonth) || {
      id: rosterMonth,
      label: monthlyRosterPlan.monthName,
      shortLabel: monthlyRosterPlan.monthName.slice(0, 8),
      monthName: monthlyRosterPlan.monthName,
      year: monthlyRosterPlan.year,
      monthIndex: monthlyRosterPlan.monthIndex,
      totalDays: monthlyRosterPlan.totalDays,
      lastDayDateStr: monthlyRosterPlan.cycleEndDate,
      isCurrent: rosterMonth === getCurrentMonthStr()
    };
  }, [availableMonths, rosterMonth, monthlyRosterPlan]);

  // Year-on-Year comparison computation
  const yoyMonthIndex = useMemo(() => {
    const parts = rosterMonth.split("-");
    return (parseInt(parts[1], 10) || 9) - 1;
  }, [rosterMonth]);

  const yoyComparison: YoYComparisonResult = useMemo(() => {
    const selectedRoute = routes.find(r => r.id === selectedQueueRouteId);
    return computeYoYComparison(
      queueVehicles,
      drivers,
      trips,
      yoyMonthIndex,
      rosterYear,
      compareYear,
      availableYears,
      selectedRoute?.baseFareE || 50
    );
  }, [queueVehicles, drivers, trips, yoyMonthIndex, rosterYear, compareYear, availableYears, routes, selectedQueueRouteId]);

  const handleSelectYear = (year: number) => {
    setRosterYear(year);
    const monthPart = rosterMonth.split("-")[1] || "09";
    const newMonthId = `${year}-${monthPart}`;
    setRosterMonth(newMonthId);
  };

  const handleSelectMonth = (monthId: string) => {
    setRosterMonth(monthId);
    const yr = parseInt(monthId.split("-")[0], 10);
    if (yr && yr !== rosterYear) {
      setRosterYear(yr);
    }
    const targetMonth = availableMonths.find(m => m.id === monthId);
    const daysInTarget = targetMonth ? targetMonth.totalDays : 30;
    if (selectedRosterDay > daysInTarget) {
      setSelectedRosterDay(daysInTarget);
    }
  };

  const handleStepMonth = (direction: -1 | 1) => {
    const parts = rosterMonth.split("-");
    let y = parseInt(parts[0], 10) || 2026;
    let m = (parseInt(parts[1], 10) || 9) + direction;
    if (m < 1) {
      m = 12;
      y -= 1;
    } else if (m > 12) {
      m = 1;
      y += 1;
    }
    if (y < availableYears[0]) y = availableYears[0];
    if (y > availableYears[availableYears.length - 1]) y = availableYears[availableYears.length - 1];
    const newMonthId = `${y}-${String(m).padStart(2, "0")}`;
    setRosterYear(y);
    handleSelectMonth(newMonthId);
  };

  const handleCopyYoYReport = () => {
    const route = routes.find(r => r.id === selectedQueueRouteId);
    const text = `
=== KOMBI ROTATION ENGINE: YEAR-ON-YEAR AUDIT REPORT ===
Corridor: ${route?.origin} -> ${route?.destination}
Focus Month: ${yoyComparison.monthName}
Comparison: Year ${yoyComparison.yearA} vs Year ${yoyComparison.yearB}

--- CORRIDOR PERFORMANCE SUMMARY ---
Total Trips: ${yoyComparison.yearA}: ${yoyComparison.tripsDelta.yearAValue} dispatches vs ${yoyComparison.yearB}: ${yoyComparison.tripsDelta.yearBValue} (${yoyComparison.tripsDelta.percentageChange >= 0 ? "+" : ""}${yoyComparison.tripsDelta.percentageChange}%)
Passenger Volume: ${yoyComparison.yearA}: ${yoyComparison.passengersDelta.yearAValue.toLocaleString()} vs ${yoyComparison.yearB}: ${yoyComparison.passengersDelta.yearBValue.toLocaleString()} (${yoyComparison.passengersDelta.percentageChange >= 0 ? "+" : ""}${yoyComparison.passengersDelta.percentageChange}%)
Corridor Revenue: ${yoyComparison.yearA}: E ${yoyComparison.revenueDelta.yearAValue.toLocaleString()} vs ${yoyComparison.yearB}: E ${yoyComparison.revenueDelta.yearBValue.toLocaleString()} (${yoyComparison.revenueDelta.percentageChange >= 0 ? "+" : ""}${yoyComparison.revenueDelta.percentageChange}%)

--- ROTATIONAL EQUITY & LEAD VEHICLE TIMELINE ---
${yoyComparison.leadTimeline.map(lt => `${lt.year} (${yoyComparison.monthName}): Lead ${lt.leadVehicleReg} (${lt.leadFleetNumber}) - Driver: ${lt.leadDriverName}`).join("\n")}

--- VEHICLE QUEUE MOVEMENTS ---
${yoyComparison.vehicleComparisons.map(vc => `${vc.vehicleReg} (${vc.fleetNumber}): ${yoyComparison.yearB} Pos #${vc.yearBPosition} (${vc.yearBTrips} trips) -> ${yoyComparison.yearA} Pos #${vc.yearAPosition} (${vc.yearATrips} trips) [${vc.positionDelta > 0 ? `+${vc.positionDelta} spots` : vc.positionDelta < 0 ? `${vc.positionDelta} spots` : `Retained spot`}]`).join("\n")}

Generated by Sisonkhe In transit Management System
Date: ${new Date().toLocaleDateString()}
    `.trim();

    if (navigator.clipboard) {
      navigator.clipboard.writeText(text);
      setCopiedYoYReport(true);
      setTimeout(() => setCopiedYoYReport(false), 3000);
    }
  };

  const handleAdvanceMonth = () => {
    const nextParts = rosterMonth.split("-");
    const y = parseInt(nextParts[0], 10) || 2026;
    const m = parseInt(nextParts[1], 10) || 9;
    const nextDate = new Date(y, m, 1);
    const nextMonthStr = `${nextDate.getFullYear()}-${String(nextDate.getMonth() + 1).padStart(2, "0")}`;

    const updated = advanceMonthlyRotation(vehicles, selectedQueueRouteId, nextMonthStr);
    onUpdateVehicles(updated);
    localStorage.setItem("kombiflow_vehicles", JSON.stringify(updated));
    pushServerState({ vehicles: updated });
    handleSelectMonth(nextMonthStr);

    if (onAddNotification) {
      onAddNotification({
        type: "Push",
        recipientName: "Rank Marshal",
        recipientPhone: "+268 7600 0000",
        message: `Monthly rotation cycle advanced to ${nextMonthStr}. Previous lead rotated to bottom; mid-month entries graduated.`,
        status: "Sent"
      });
    }
  };

  // Handle Vehicle Save (Create or Update)
  const handleSaveVehicle = (vehicleData: Partial<Vehicle>) => {
    const isEditing = !!editingVehicle;
    const regUpper = (vehicleData.registrationNumber || "").toUpperCase();
    const vicGen = vehicleData.vic || generateVIC(regUpper);
    const isMidMonth = vehicleData.isMidMonthAddition;

    if (isEditing && editingVehicle) {
      let savedVeh: Vehicle | null = null;
      const updatedList = vehicles.map((v) => {
        if (v.registrationNumber === editingVehicle.registrationNumber) {
          savedVeh = {
            ...v,
            ...vehicleData,
            registrationNumber: regUpper,
            vic: vicGen,
            fleetNumber: vicGen
          } as Vehicle;
          return savedVeh;
        }
        return v;
      });

      if (savedVeh) {
        syncVehicleQRIfNeeded(savedVeh);
      }

      onUpdateVehicles(updatedList);
      localStorage.setItem("kombiflow_vehicles", JSON.stringify(updatedList));
      pushServerState({ vehicles: updatedList });

      logQREvent("GENERATION", regUpper, `Vehicle profile updated for ${regUpper}.`);
      if (onAddNotification) {
        onAddNotification({
          type: "Push",
          recipientName: "Fleet Manager",
          recipientPhone: "+268 7600 0000",
          message: `Vehicle profile updated for ${regUpper} (VIC: ${vicGen}).`,
          status: "Sent"
        });
      }
    } else {
      // New Vehicle
      const routeVehiclesCount = vehicles.filter(v => v.routeAssignmentId === vehicleData.routeAssignmentId).length;
      const newVeh: Vehicle = {
        registrationNumber: regUpper,
        fleetNumber: vicGen,
        vic: vicGen,
        make: vehicleData.make || "Toyota",
        model: vehicleData.model || "Quantum",
        seatingCapacity: Number(vehicleData.seatingCapacity) || 15,
        classification: vehicleData.classification || "kombi",
        routeAssignmentId: vehicleData.routeAssignmentId || routes[0]?.id || "rt_1",
        loadingBay: vehicleData.loadingBay || "Bay 01",
        ownerName: vehicleData.ownerName || "Registered Fleet Owner",
        ownerPhone: vehicleData.ownerPhone || "+268 7600 0000",
        driverId: vehicleData.driverId || "",
        association: vehicleData.association || DEFAULT_ASSOCIATIONS[0],
        insuranceExpiry: "2027-08-01",
        roadworthinessExpiry: "2027-08-01",
        permitNumber: vehicleData.permitNumber || `RPT-${regUpper.replace(/\s+/g, "")}`,
        permitStatus: vehicleData.permitStatus || "Active",
        permitIssueDate: vehicleData.permitIssueDate || "2026-08-01",
        permitExpiryDate: vehicleData.permitExpiryDate || "2027-08-01",
        cofNumber: vehicleData.cofNumber || `COF-${regUpper.replace(/\s+/g, "")}`,
        cofIssueDate: vehicleData.cofIssueDate || "2026-08-01",
        cofExpiryDate: vehicleData.cofExpiryDate || "2027-08-01",
        lastInspectionDate: vehicleData.lastInspectionDate || "2026-08-01",
        status: KombiStatus.Waiting,
        currentQueuePosition: isMidMonth ? 99 : routeVehiclesCount + 1,
        tripsToday: 0,
        lastActive: new Date().toISOString(),
        vehiclePhotoUrl: vehicleData.vehiclePhotoUrl || VEHICLE_IMAGES[0],
        isMidMonthAddition: isMidMonth,
        addedMidMonth: isMidMonth,
        monthRegistered: rosterMonth,
        registrationDate: new Date().toISOString().split("T")[0],
        registeredTimestamp: Date.now(),
        registeredByRole: "Fleet Manager",
        midMonthJoinDay: isMidMonth ? selectedRosterDay : undefined,
        rosterStatusLabel: isMidMonth
          ? "Mid-Month Entry (Tail Locked for Current 30-Day Cycle)"
          : "Standard 30-Day Rotation Sequence",
        metadataOriginExplanation: isMidMonth
          ? `Registered on Day ${selectedRosterDay} of cycle. Pinned to queue tail for remainder of month; automatically graduates to standard rotation sequence next month.`
          : "Registered as regular fleet entrant. Eligible for standard monthly 30-day fair rotation.",
        monthlySequenceBaseIndex: isMidMonth ? 99 : routeVehiclesCount + 1
      };

      syncVehicleQRIfNeeded(newVeh);
      const updatedList = [...vehicles, newVeh];
      onUpdateVehicles(updatedList);
      localStorage.setItem("kombiflow_vehicles", JSON.stringify(updatedList));
      pushServerState({ vehicles: updatedList });

      // Issue Unique Virtual Card for Registration Fee & Transactions
      const linkedDriver = drivers.find(d => d.id === newVeh.driverId);
      const virtualCard = getOrCreateVehicleVirtualCard(newVeh, linkedDriver);

      logQREvent("GENERATION", regUpper, `New vehicle ${regUpper} registered with VIC ${vicGen}. Virtual card ${virtualCard.cardNumber} issued.`);
      if (onAddNotification) {
        onAddNotification({
          type: "Push",
          recipientName: "Fleet Manager",
          recipientPhone: "+268 7600 0000",
          message: `New commercial vehicle ${regUpper} registered with VIC ${vicGen}. Virtual Transit Card issued with registration fee recorded.`,
          status: "Sent"
        });
      }

      // Automatically open the Virtual Card modal to show the issued card & registration fee
      setVirtualCardVehicle(newVeh);
      setIsVirtualCardModalOpen(true);
      setIsNewCardRegistration(true);
    }

    setIsVehicleModalOpen(false);
    setEditingVehicle(null);
  };

  // Handle Driver Save (Create or Update)
  const handleSaveDriver = (driverData: Partial<Driver>) => {
    const isEditing = !!editingDriver;

    if (isEditing && editingDriver) {
      const updatedDrivers = drivers.map((d) => {
        if (d.id === editingDriver.id) {
          return {
            ...d,
            ...driverData
          } as Driver;
        }
        return d;
      });

      onUpdateDrivers(updatedDrivers);
      localStorage.setItem("kombiflow_drivers", JSON.stringify(updatedDrivers));
      pushServerState({ drivers: updatedDrivers });

      // If assigned vehicle changed, sync vehicle object
      if (driverData.assignedVehicleReg) {
        const updatedVehicles = vehicles.map(v => {
          if (v.registrationNumber === driverData.assignedVehicleReg) {
            return { ...v, driverId: editingDriver.id };
          }
          if (v.driverId === editingDriver.id && v.registrationNumber !== driverData.assignedVehicleReg) {
            return { ...v, driverId: "" };
          }
          return v;
        });
        onUpdateVehicles(updatedVehicles);
      }
    } else {
      // New Driver
      const newDriverId = `drv_${Date.now()}`;
      const newDriver: Driver = {
        id: newDriverId,
        fullName: driverData.fullName || "Commercial Driver",
        phone: driverData.phone || "+268 7600 0000",
        nationalId: driverData.nationalId || "020101-8100-24",
        licenseNumber: driverData.licenseNumber || `DL-${Date.now().toString().slice(-5)}`,
        licenseClass: driverData.licenseClass || "Heavy Duty / Class C1",
        pdpNumber: driverData.pdpNumber || `PDP-2026-${Date.now().toString().slice(-4)}`,
        pdpIssueDate: driverData.pdpIssueDate || "2026-07-14",
        pdpExpiryDate: driverData.pdpExpiryDate || "2028-07-14",
        pdpIssuingAuthority: driverData.pdpIssuingAuthority || "Mbabane",
        pdpStatus: driverData.pdpStatus || "Valid",
        emergencyContactName: driverData.emergencyContactName || "",
        emergencyContactPhone: driverData.emergencyContactPhone || "+268 7600 0000",
        emergencyContactRelation: driverData.emergencyContactRelation || "Next of Kin",
        residentialAddress: driverData.residentialAddress || "Ndlavane",
        cellPhone: driverData.cellPhone || "",
        whatsappPhone: driverData.whatsappPhone || "",
        sameAsCell: driverData.sameAsCell !== undefined ? driverData.sameAsCell : true,
        homeTel: driverData.homeTel || "",
        dateOfBirth: driverData.dateOfBirth || "",
        gender: driverData.gender || "Male",
        assignedVehicleReg: driverData.assignedVehicleReg || "",
        username: driverData.username || `driver_${(driverData.fullName || "driver").toLowerCase().replace(/\s+/g, "_")}`,
        password: driverData.password || "kombi2026",
        avatarSeed: (driverData.fullName || "driver").toLowerCase().replace(/\s+/g, "_"),
        profilePictureUrl: driverData.profilePictureUrl || "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=120&auto=format&fit=crop&q=80",
        status: "Active"
      };

      const updatedDrivers = [...drivers, newDriver];
      onUpdateDrivers(updatedDrivers);
      localStorage.setItem("kombiflow_drivers", JSON.stringify(updatedDrivers));
      pushServerState({ drivers: updatedDrivers });

      // If assigned vehicle selected, update vehicle
      if (driverData.assignedVehicleReg) {
        const updatedVehicles = vehicles.map(v => {
          if (v.registrationNumber === driverData.assignedVehicleReg) {
            return { ...v, driverId: newDriverId };
          }
          return v;
        });
        onUpdateVehicles(updatedVehicles);
      }
    }

    setIsDriverModalOpen(false);
    setEditingDriver(null);
  };

  // Handle Marshal Save (Create or Update)
  const handleSaveMarshal = (marshalData: MarshalAccount) => {
    const isEditing = !!editingMarshal;
    let updatedMarshals: MarshalAccount[];

    if (isEditing && editingMarshal) {
      updatedMarshals = marshals.map((m) => {
        if (m.id === editingMarshal.id) {
          return {
            ...m,
            ...marshalData
          };
        }
        return m;
      });
    } else {
      updatedMarshals = [marshalData, ...marshals];
    }

    if (onUpdateMarshals) {
      onUpdateMarshals(updatedMarshals);
    }
    localStorage.setItem("kombiflow_marshals", JSON.stringify(updatedMarshals));
    pushServerState({ marshals: updatedMarshals });

    // Open their card immediately after registration!
    setActiveCardMarshal(marshalData);
    setIsNewMarshalRegistration(!isEditing);
    setIsMarshalCardModalOpen(true);
    setIsMarshalModalOpen(false);
    setEditingMarshal(null);
  };

  const handleOpenAddMarshal = () => {
    setEditingMarshal(null);
    setIsMarshalModalOpen(true);
  };

  const handleOpenEditMarshal = (m: MarshalAccount) => {
    setEditingMarshal(m);
    setIsMarshalModalOpen(true);
  };

  const handleOpenMarshalCard = (m: MarshalAccount) => {
    setActiveCardMarshal(m);
    setIsNewMarshalRegistration(false);
    setIsMarshalCardModalOpen(true);
  };

  // Delete Vehicle Action
  const handleConfirmDelete = (v: Vehicle) => {
    if (onDeleteVehicle) {
      onDeleteVehicle(v.registrationNumber);
    } else {
      const updated = vehicles.filter((item) => item.registrationNumber !== v.registrationNumber);
      onUpdateVehicles(updated);
      localStorage.setItem("kombiflow_vehicles", JSON.stringify(updated));
      pushServerState({ vehicles: updated });
    }
    setDeleteConfirmVehicle(null);
  };

  // Revoke / Suspend Permit Action
  const handleRevokePermit = (v: Vehicle) => {
    const updated = vehicles.map((item) => {
      if (item.registrationNumber === v.registrationNumber) {
        const suspendedVeh = {
          ...item,
          permitStatus: "Suspended" as const
        };
        syncVehicleQRIfNeeded(suspendedVeh);
        logQREvent("VERIFICATION_FAILURE", v.registrationNumber, `Permit suspended/revoked by Fleet Manager for ${v.registrationNumber}.`);
        return suspendedVeh;
      }
      return item;
    });
    onUpdateVehicles(updated);
    localStorage.setItem("kombiflow_vehicles", JSON.stringify(updated));
    pushServerState({ vehicles: updated });
    setDeleteConfirmVehicle(null);
  };

  // Reorder queue positions
  const handleMoveQueue = (reg: string, direction: "up" | "down") => {
    const currentRouteVehicles = vehicles.filter((v) => v.routeAssignmentId === selectedQueueRouteId);
    const sorted = [...currentRouteVehicles].sort(
      (a, b) => (a.currentQueuePosition || 99) - (b.currentQueuePosition || 99)
    );

    const index = sorted.findIndex((v) => v.registrationNumber === reg);
    if (index === -1) return;

    if (direction === "up" && index > 0) {
      const temp = sorted[index];
      sorted[index] = sorted[index - 1];
      sorted[index - 1] = temp;
    } else if (direction === "down" && index < sorted.length - 1) {
      const temp = sorted[index];
      sorted[index] = sorted[index + 1];
      sorted[index + 1] = temp;
    } else {
      return;
    }

    const updatedMap = new Map<string, number>();
    sorted.forEach((v, idx) => {
      updatedMap.set(v.registrationNumber, idx + 1);
    });

    const newVehiclesList = vehicles.map((v) => {
      if (updatedMap.has(v.registrationNumber)) {
        return { ...v, currentQueuePosition: updatedMap.get(v.registrationNumber)! };
      }
      return v;
    });

    onUpdateVehicles(newVehiclesList);
    localStorage.setItem("kombiflow_vehicles", JSON.stringify(newVehiclesList));
    pushServerState({ vehicles: newVehiclesList });
  };

  // Save Route handler
  const handleSaveRoute = (e: React.FormEvent) => {
    e.preventDefault();
    if (!routeForm.origin || !routeForm.destination) return;

    if (editingRoute && onEditRoute) {
      onEditRoute({
        ...editingRoute,
        origin: routeForm.origin,
        destination: routeForm.destination,
        region: routeForm.region as EswatiniRegion,
        baseFareE: Number(routeForm.baseFareE),
        defaultBay: routeForm.defaultBay || "Bay 01",
        timetableStartTime: routeForm.timetableStartTime || "05:30"
      });
    } else if (onAddRoute) {
      const newRoute: Route = {
        id: `rt_${Date.now()}`,
        origin: routeForm.origin,
        destination: routeForm.destination,
        region: routeForm.region as EswatiniRegion,
        fare: Number(routeForm.baseFareE) || 50,
        baseFareE: Number(routeForm.baseFareE) || 50,
        estimatedMinutes: Number(routeForm.estimatedMinutes) || 45,
        distanceKm: Number(routeForm.distanceKm) || 35,
        defaultBay: routeForm.defaultBay || "Bay 01",
        timetableStartTime: routeForm.timetableStartTime || "05:30"
      };
      onAddRoute(newRoute);
    }

    setIsRouteModalOpen(false);
    setEditingRoute(null);
  };

  return (
    <div className="space-y-6">
      
      {/* TOP BANNER: Government Style */}
      <div className="bg-emerald-800 dark:bg-emerald-950 text-white rounded-3xl p-6 border border-emerald-700 dark:border-emerald-900 shadow-xl relative overflow-hidden">
        <div className="absolute right-0 bottom-0 opacity-10 translate-x-10 translate-y-10 scale-150 select-none">
          <Award className="w-96 h-96" />
        </div>
        <div className="relative z-10 space-y-3">
          <div className="flex items-center gap-2.5">
            <span className="bg-white/20 px-3 py-1 rounded-full text-[10px] font-black tracking-widest uppercase">
              Official Portal
            </span>
            <span className="text-emerald-300 text-xs font-mono">
              Kingdom of Eswatini • Ministry of Public Works & Transport
            </span>
          </div>

          <h2 className="text-2xl md:text-3xl font-black font-space tracking-tight uppercase">
            National Fleet Registry & Road Carrier Permits
          </h2>
          <p className="text-emerald-100/90 text-xs max-w-2xl leading-relaxed">
            Centralized commercial vehicle registry, 30-day fair queuing rotation sequence, driver cab credentialing, and secure QR-encrypted road permits.
          </p>

          {/* Sub-Tab Navigation Bar */}
          <div className="pt-3 flex flex-wrap items-center gap-2 border-t border-emerald-700/60">
            {[
              { id: "fleet", label: "Fleet Registry & Permits", icon: Car },
              { id: "queue", label: "30-Day Monthly Rotation Queue", icon: Layers },
              { id: "drivers", label: "Driver Cab & Chat", icon: Users },
              { id: "routes", label: "Corridors & Regions", icon: MapPin },
              { id: "revenue", label: "Rank Marshals & Ledger", icon: CreditCard },
              { id: "terminals", label: "Regional Terminals", icon: Building2 },
              { id: "permits", label: "Permits & Compliance", icon: Award },
              { id: "renewals", label: "Renewals", icon: RotateCw },
              { id: "audits", label: "Security Audits", icon: ShieldCheck },
              { id: "reports", label: "Reports", icon: FileText }
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = activeSubTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveSubTab(tab.id as any)}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                    isActive
                      ? "bg-white text-emerald-950 shadow-md"
                      : "bg-emerald-900/60 text-emerald-100 hover:bg-emerald-700/60"
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* SUB-PANEL 1: FLEET REGISTRY & PERMITS */}
      {activeSubTab === "fleet" && (
        <div className="space-y-6">
          
          {/* Controls Strip */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-4 shadow-sm">
            
            {/* Search Input */}
            <div className="relative flex-1 min-w-[220px]">
              <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search by plate, FLEET-VIC, permit #, owner, make..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs text-zinc-900 dark:text-white placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            {/* Filters */}
            <div className="flex flex-wrap items-center gap-2">
              <select
                value={selectedRegionFilter}
                onChange={(e) => setSelectedRegionFilter(e.target.value)}
                className="px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs text-zinc-800 dark:text-zinc-200"
              >
                <option value="All">All Regions</option>
                <option value={EswatiniRegion.Hhohho}>Hhohho</option>
                <option value={EswatiniRegion.Manzini}>Manzini</option>
                <option value={EswatiniRegion.Lubombo}>Lubombo</option>
                <option value={EswatiniRegion.Shiselweni}>Shiselweni</option>
              </select>

              <select
                value={selectedRouteFilter}
                onChange={(e) => setSelectedRouteFilter(e.target.value)}
                className="px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs text-zinc-800 dark:text-zinc-200 max-w-[150px] truncate"
              >
                <option value="All">All Routes</option>
                {routes.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.origin} ➔ {r.destination}
                  </option>
                ))}
              </select>

              <select
                value={selectedStatusFilter}
                onChange={(e) => setSelectedStatusFilter(e.target.value)}
                className="px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs text-zinc-800 dark:text-zinc-200"
              >
                <option value="All">All Statuses</option>
                <option value="Active">Active / Valid</option>
                <option value="Expired">Expired</option>
                <option value="Suspended">Suspended</option>
              </select>

              {/* View Toggle */}
              <div className="inline-flex rounded-xl bg-zinc-100 dark:bg-zinc-800 p-1 border border-zinc-200 dark:border-zinc-700">
                <button
                  onClick={() => setViewMode("table")}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold ${
                    viewMode === "table" ? "bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white shadow" : "text-zinc-500"
                  }`}
                >
                  Table
                </button>
                <button
                  onClick={() => setViewMode("grid")}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold ${
                    viewMode === "grid" ? "bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white shadow" : "text-zinc-500"
                  }`}
                >
                  Grid
                </button>
              </div>

              {/* Register Action Buttons */}
              <div className="flex items-center gap-2 ml-auto">
                <button
                  onClick={handleOpenAddMarshal}
                  className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow flex items-center gap-1.5 cursor-pointer transition-all"
                >
                  <Plus className="w-4 h-4" />
                  <span>Register Marshal</span>
                </button>

                <button
                  onClick={() => {
                    setEditingVehicle(null);
                    setIsVehicleModalOpen(true);
                  }}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow flex items-center gap-1.5 cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Register Vehicle</span>
                </button>
              </div>
            </div>

          </div>

          {/* TABLE VIEW */}
          {viewMode === "table" && (
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-zinc-200 dark:border-zinc-800 font-bold text-zinc-500 dark:text-zinc-400 uppercase bg-zinc-50/50 dark:bg-zinc-800/40">
                      <th className="py-3 px-4">Vehicle & Photo</th>
                      <th className="py-3 px-4">FLEET-VIC</th>
                      <th className="py-3 px-4">Permit # & Expiry</th>
                      <th className="py-3 px-4">Fitness (COF)</th>
                      <th className="py-3 px-4">Bay & Corridor</th>
                      <th className="py-3 px-4">Assigned Driver</th>
                      <th className="py-3 px-4">Permit Status</th>
                      <th className="py-3 px-4 text-right">Actions & QR</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                    {filteredVehicles.map((v) => {
                      const routeObj = routes.find((r) => r.id === v.routeAssignmentId);
                      const driverObj = drivers.find((d) => d.id === v.driverId || d.assignedVehicleReg === v.registrationNumber);
                      const isExpired = v.permitStatus === "Expired" || new Date(v.permitExpiryDate || "2026-08-01") < new Date();

                      return (
                        <tr key={v.registrationNumber} className="hover:bg-zinc-50/80 dark:hover:bg-zinc-800/50 transition-colors">
                          
                          {/* Plate & Photo */}
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-3">
                              <img
                                src={v.vehiclePhotoUrl || VEHICLE_IMAGES[0]}
                                alt={v.registrationNumber}
                                className="w-10 h-10 rounded-xl object-cover border border-zinc-200 dark:border-zinc-700 shadow-xs shrink-0"
                                referrerPolicy="no-referrer"
                              />
                              <div>
                                <div className="font-bold font-mono text-zinc-900 dark:text-white flex items-center gap-1.5">
                                  <span>{v.registrationNumber}</span>
                                  {v.isMidMonthAddition && (
                                    <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300">
                                      Mid-Month
                                    </span>
                                  )}
                                </div>
                                <span className="text-[11px] text-zinc-500">
                                  {v.make} {v.model} ({v.seatingCapacity} Seater)
                                </span>
                              </div>
                            </div>
                          </td>

                          {/* VIC */}
                          <td className="py-3 px-4 font-mono font-bold text-emerald-600 dark:text-emerald-400">
                            {v.fleetNumber || v.vic}
                          </td>

                          {/* Permit # & Expiry */}
                          <td className="py-3 px-4 font-mono">
                            <div className="text-zinc-900 dark:text-zinc-100 font-semibold">{v.permitNumber || "RPT-PENDING"}</div>
                            <div className="text-[11px] text-zinc-500">Exp: {v.permitExpiryDate || "2027-08-01"}</div>
                          </td>

                          {/* COF */}
                          <td className="py-3 px-4 font-mono text-zinc-600 dark:text-zinc-400">
                            <div>{v.cofNumber || "COF-VALID"}</div>
                            <div className="text-[10px] text-zinc-400">Exp: {v.cofExpiryDate || "2027-08-01"}</div>
                          </td>

                          {/* Bay & Corridor */}
                          <td className="py-3 px-4">
                            <div className="font-bold text-emerald-700 dark:text-emerald-400">{v.loadingBay || "Bay 01"}</div>
                            <div className="text-[11px] text-zinc-500 truncate max-w-[140px]">
                              {routeObj ? `${routeObj.origin} ➔ ${routeObj.destination}` : "General Route"}
                            </div>
                          </td>

                          {/* Assigned Driver */}
                          <td className="py-3 px-4">
                            {driverObj ? (
                              <div className="flex items-center gap-2">
                                <img
                                  src={driverObj.profilePictureUrl || "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=120&auto=format&fit=crop&q=80"}
                                  alt={driverObj.fullName}
                                  className="w-6 h-6 rounded-full object-cover border border-zinc-200 shrink-0"
                                  referrerPolicy="no-referrer"
                                />
                                <span className="font-medium text-zinc-800 dark:text-zinc-200 truncate">{driverObj.fullName}</span>
                              </div>
                            ) : (
                              <span className="text-zinc-400 italic">Unassigned</span>
                            )}
                          </td>

                          {/* Permit Status */}
                          <td className="py-3 px-4">
                            <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full ${
                              v.permitStatus === "Active" && !isExpired
                                ? "bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300"
                                : v.permitStatus === "Suspended"
                                ? "bg-red-100 dark:bg-red-950/60 text-red-700 dark:text-red-300"
                                : "bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300"
                            }`}>
                              {v.permitStatus || "Active"}
                            </span>
                          </td>

                          {/* Action Buttons */}
                          <td className="py-3 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => {
                                  setVirtualCardVehicle(v);
                                  setIsVirtualCardModalOpen(true);
                                  setIsNewCardRegistration(false);
                                }}
                                className="px-2.5 py-1.5 rounded-lg bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 hover:bg-amber-100 border border-amber-200 dark:border-amber-800/80 transition-colors cursor-pointer flex items-center gap-1.5 text-xs font-bold shadow-xs"
                                title="Open Unique Vehicle Virtual Transit Card"
                              >
                                <CreditCard className="w-3.5 h-3.5 text-amber-600" />
                                <span className="hidden xl:inline">Virtual Card</span>
                              </button>

                              <button
                                onClick={() => setValidityCertVehicle(v)}
                                className="p-1.5 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 hover:bg-blue-100 transition-colors cursor-pointer"
                                title="Check Cryptographic QR & Permit Validity"
                              >
                                <ShieldCheck className="w-3.5 h-3.5" />
                              </button>

                              <button
                                onClick={() => setQrModalVehicle(v)}
                                className="p-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 transition-colors cursor-pointer"
                                title="View Government Plaque & QR"
                              >
                                <QrCode className="w-3.5 h-3.5" />
                              </button>

                              <button
                                onClick={() => setPrintA4Vehicle(v)}
                                className="p-1.5 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 transition-colors cursor-pointer"
                                title="Print A4 Permit"
                              >
                                <Printer className="w-3.5 h-3.5" />
                              </button>

                              <button
                                onClick={() => {
                                  setEditingVehicle(v);
                                  setIsVehicleModalOpen(true);
                                }}
                                className="p-1.5 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 transition-colors cursor-pointer"
                                title="Edit Vehicle Particulars"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>

                              <button
                                onClick={() => setDeleteConfirmVehicle(v)}
                                className="p-1.5 rounded-lg bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 hover:bg-red-100 transition-colors cursor-pointer"
                                title="Revoke or Delete"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>

                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* GRID VIEW */}
          {viewMode === "grid" && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredVehicles.map((v) => {
                const routeObj = routes.find((r) => r.id === v.routeAssignmentId);
                const driverObj = drivers.find((d) => d.id === v.driverId || d.assignedVehicleReg === v.registrationNumber);

                return (
                  <div
                    key={v.registrationNumber}
                    className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-5 shadow-sm space-y-4 hover:shadow-md transition-all"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <img
                          src={v.vehiclePhotoUrl || VEHICLE_IMAGES[0]}
                          alt={v.registrationNumber}
                          className="w-14 h-14 rounded-2xl object-cover border border-zinc-200 dark:border-zinc-700 shadow-sm"
                          referrerPolicy="no-referrer"
                        />
                        <div>
                          <h4 className="font-mono font-black text-zinc-900 dark:text-white text-base">
                            {v.registrationNumber}
                          </h4>
                          <span className="text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400">
                            VIC: {v.fleetNumber || v.vic}
                          </span>
                          <div className="text-[11px] text-zinc-500">
                            {v.make} {v.model} • {v.seatingCapacity} Seater
                          </div>
                        </div>
                      </div>

                      <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full ${
                        v.permitStatus === "Active"
                          ? "bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300"
                          : "bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300"
                      }`}>
                        {v.permitStatus || "Active"}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-[11px] bg-zinc-50 dark:bg-zinc-800/40 p-3 rounded-xl border border-zinc-200 dark:border-zinc-750 font-mono">
                      <div>
                        <span className="text-[9px] uppercase text-zinc-400 block">Loading Bay</span>
                        <strong className="text-emerald-700 dark:text-emerald-300 font-bold">{v.loadingBay || "Bay 01"}</strong>
                      </div>
                      <div>
                        <span className="text-[9px] uppercase text-zinc-400 block">Permit Expiry</span>
                        <strong className="text-zinc-900 dark:text-zinc-100">{v.permitExpiryDate || "2027-08-01"}</strong>
                      </div>
                      <div className="col-span-2 pt-1 border-t border-zinc-200 dark:border-zinc-700">
                        <span className="text-[9px] uppercase text-zinc-400 block">Corridor Route</span>
                        <strong className="text-zinc-800 dark:text-zinc-200 truncate block">
                          {routeObj ? `${routeObj.origin} ➔ ${routeObj.destination}` : "General Route"}
                        </strong>
                      </div>
                      <div className="col-span-2">
                        <span className="text-[9px] uppercase text-zinc-400 block">Assigned Driver</span>
                        <strong className="text-zinc-800 dark:text-zinc-200 truncate block">
                          {driverObj ? driverObj.fullName : "No Driver Assigned"}
                        </strong>
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-1.5 pt-2 border-t border-zinc-100 dark:border-zinc-800">
                      <button
                        onClick={() => {
                          setVirtualCardVehicle(v);
                          setIsVirtualCardModalOpen(true);
                          setIsNewCardRegistration(false);
                        }}
                        className="py-2 px-2.5 bg-amber-50 dark:bg-amber-950/60 hover:bg-amber-100 border border-amber-200 dark:border-amber-800/80 text-amber-800 dark:text-amber-300 rounded-xl text-xs font-bold flex items-center justify-center gap-1 cursor-pointer"
                        title="Vehicle Virtual Card"
                      >
                        <CreditCard className="w-3.5 h-3.5 text-amber-600" />
                        <span>Card</span>
                      </button>

                      <button
                        onClick={() => setValidityCertVehicle(v)}
                        className="py-2 px-2 bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-100 text-blue-700 dark:text-blue-300 rounded-xl text-xs font-bold flex items-center justify-center gap-1 cursor-pointer"
                        title="Check Cryptographic QR & Permit Validity"
                      >
                        <ShieldCheck className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">Validity</span>
                      </button>

                      <button
                        onClick={() => setQrModalVehicle(v)}
                        className="flex-1 py-2 px-2 bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 text-emerald-700 dark:text-emerald-300 rounded-xl text-xs font-bold flex items-center justify-center gap-1 cursor-pointer"
                      >
                        <QrCode className="w-3.5 h-3.5" />
                        <span>QR</span>
                      </button>

                      <button
                        onClick={() => setPrintA4Vehicle(v)}
                        className="p-2 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 text-zinc-700 dark:text-zinc-300 rounded-xl text-xs font-semibold cursor-pointer"
                        title="Print A4 Permit"
                      >
                        <Printer className="w-3.5 h-3.5" />
                      </button>

                      <button
                        onClick={() => {
                          setEditingVehicle(v);
                          setIsVehicleModalOpen(true);
                        }}
                        className="p-2 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 text-zinc-700 dark:text-zinc-300 rounded-xl text-xs font-semibold cursor-pointer"
                        title="Edit"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                  </div>
                );
              })}
            </div>
          )}

        </div>
      )}

      {/* SUB-PANEL 2: CALENDAR-AWARE MONTHLY ROTATION QUEUING SYSTEM */}
      {activeSubTab === "queue" && (
        <div className="space-y-6">
          
          {/* Header Controls for Queue Engine */}
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 shadow-sm space-y-4">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div>
                <h3 className="text-base font-black text-zinc-900 dark:text-white flex items-center gap-2">
                  <Layers className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                  <span>Monthly Rotation Queuing Engine (Calendar Cycle)</span>
                </h3>
                <p className="text-xs text-zinc-500 mt-1">
                  30-Day Circular Rotation: runs from Day 1 to the <strong>last day of the month ({monthlyRosterPlan.totalDays} days)</strong>. Rule: #1 on Day 1 is last on Day 2, and #2 on Day 1 is 1st on Day 2. Mid-month additions locked to tail.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                {/* Route Selector */}
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider hidden sm:inline">Corridor:</span>
                  <select
                    value={selectedQueueRouteId}
                    onChange={(e) => setSelectedQueueRouteId(e.target.value)}
                    className="px-3.5 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs font-bold text-zinc-900 dark:text-white"
                  >
                    {routes.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.region}: {r.origin} ➔ {r.destination} ({r.distanceKm}km)
                      </option>
                    ))}
                  </select>
                </div>

                {/* Advance Rotation Rollover Button */}
                <button
                  onClick={handleAdvanceMonth}
                  className="px-3 py-2 bg-purple-50 dark:bg-purple-950/60 hover:bg-purple-100 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                  title="Rotate current #1 to bottom, graduate mid-month additions, and advance to next month"
                >
                  <RotateCw className="w-3.5 h-3.5 text-purple-600" />
                  <span>Advance Rollover</span>
                </button>
              </div>
            </div>

            {/* CALENDAR YEAR & MONTH CONTROLS BAR */}
            <div className="pt-3 border-t border-zinc-100 dark:border-zinc-800 space-y-3">
              {/* Year Selector Row */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-zinc-50 dark:bg-zinc-800/50 p-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700/60">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-bold uppercase tracking-wider text-zinc-600 dark:text-zinc-400 flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-purple-600" />
                    <span>Cycle Year:</span>
                  </span>

                  <div className="flex items-center gap-1.5 flex-wrap">
                    {availableYears.map((yr) => {
                      const isSelected = yr === rosterYear;
                      const isBaseCurrent = yr === 2026;
                      return (
                        <button
                          key={yr}
                          onClick={() => handleSelectYear(yr)}
                          className={`px-3 py-1 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                            isSelected
                              ? "bg-purple-600 text-white shadow-sm scale-105"
                              : "bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 hover:border-purple-300 text-zinc-700 dark:text-zinc-300"
                          }`}
                        >
                          <span>{yr}</span>
                          {isBaseCurrent && (
                            <span className={`text-[9px] font-sans px-1 rounded uppercase font-black ${
                              isSelected ? "bg-purple-800 text-purple-100" : "bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300"
                            }`}>
                              System
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Compare YoY Direct Action */}
                <div className="flex items-center gap-2">
                  <span className="text-xs text-zinc-500 font-medium hidden md:inline">Compare with:</span>
                  <select
                    value={compareYear}
                    onChange={(e) => setCompareYear(parseInt(e.target.value, 10))}
                    className="px-2.5 py-1 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-xs font-bold text-zinc-900 dark:text-white"
                  >
                    {availableYears.filter(y => y !== rosterYear).map((y) => (
                      <option key={y} value={y}>Year {y}</option>
                    ))}
                  </select>

                  <button
                    onClick={() => setQueueMode("yoy")}
                    className={`px-3 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all ${
                      queueMode === "yoy"
                        ? "bg-purple-600 text-white shadow-sm"
                        : "bg-purple-100 dark:bg-purple-950/70 text-purple-700 dark:text-purple-300 hover:bg-purple-200"
                    }`}
                  >
                    <Scale className="w-3.5 h-3.5" />
                    <span>YoY Mode</span>
                  </button>
                </div>
              </div>

              {/* Month Selector Row & Cycle Info */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-bold uppercase tracking-wider text-zinc-500">
                    Month ({rosterYear}):
                  </span>
                  
                  {/* Prev Month */}
                  <button
                    onClick={() => handleStepMonth(-1)}
                    className="p-1.5 rounded-lg bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 text-zinc-700 dark:text-zinc-300 cursor-pointer"
                    title="Previous Month"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>

                  {/* Clickable Month Pills */}
                  <div className="flex items-center gap-1 overflow-x-auto py-1 max-w-full">
                    {availableMonths.map((m) => {
                      const isSelected = m.id === rosterMonth;
                      return (
                        <button
                          key={m.id}
                          onClick={() => handleSelectMonth(m.id)}
                          className={`px-2.5 py-1 rounded-lg text-xs font-bold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1 ${
                            isSelected
                              ? "bg-purple-600 text-white shadow-sm scale-105"
                              : "bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 text-zinc-600 dark:text-zinc-400"
                          }`}
                        >
                          <span>{m.monthName.slice(0, 3)}</span>
                          {m.isCurrent && (
                            <span className={`w-1.5 h-1.5 rounded-full ${isSelected ? "bg-emerald-300" : "bg-emerald-500"}`} title="Current Month" />
                          )}
                        </button>
                      );
                    })}
                  </div>

                  {/* Next Month */}
                  <button
                    onClick={() => handleStepMonth(1)}
                    className="p-1.5 rounded-lg bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 text-zinc-700 dark:text-zinc-300 cursor-pointer"
                    title="Next Month"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>

                {/* Active Cycle Details Badge */}
                <div className="inline-flex items-center gap-2 bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800 px-3 py-1.5 rounded-xl text-xs font-medium text-purple-900 dark:text-purple-200">
                  <Calendar className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                  <span>
                    <strong>{selectedMonthOption.label}</strong>: {monthlyRosterPlan.totalDays} Days (Cycle Ends <strong>{monthlyRosterPlan.cycleEndDate}</strong>)
                  </span>
                  {selectedMonthOption.isCurrent && (
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-black uppercase bg-emerald-600 text-white">
                      Current
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* 5 CORE VIEW TABS */}
            <div className="flex flex-wrap items-center gap-2 pt-2">
              <button
                onClick={() => setQueueMode("roster30day")}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all ${
                  queueMode === "roster30day"
                    ? "bg-purple-600 text-white shadow-sm"
                    : "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200"
                }`}
              >
                <Calendar className="w-3.5 h-3.5" />
                <span>Month Roster ({monthlyRosterPlan.totalDays} Days)</span>
              </button>

              <button
                onClick={() => setQueueMode("trips")}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all ${
                  queueMode === "trips"
                    ? "bg-purple-600 text-white shadow-sm"
                    : "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200"
                }`}
              >
                <TrendingUp className="w-3.5 h-3.5" />
                <span>Vehicle Trips ({routeTripStats.totalTripsMonth} Dispatches)</span>
              </button>

              <button
                onClick={() => setQueueMode("positions15")}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all ${
                  queueMode === "positions15"
                    ? "bg-purple-600 text-white shadow-sm"
                    : "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200"
                }`}
              >
                <ListOrdered className="w-3.5 h-3.5" />
                <span>Last 15 Queuing Positions</span>
              </button>

              <button
                onClick={() => setQueueMode("yoy")}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all ${
                  queueMode === "yoy"
                    ? "bg-purple-600 text-white shadow-sm ring-2 ring-purple-300 dark:ring-purple-700"
                    : "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200"
                }`}
              >
                <Scale className="w-3.5 h-3.5" />
                <span>Year-on-Year (YoY) Comparison</span>
              </button>

              <button
                onClick={() => setQueueMode("live")}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all ${
                  queueMode === "live"
                    ? "bg-purple-600 text-white shadow-sm"
                    : "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200"
                }`}
              >
                <Clock className="w-3.5 h-3.5" />
                <span>Live Corridor Queue</span>
              </button>
            </div>
          </div>

          {/* VIEW 1: CALENDAR-BASED MONTH ROSTER */}
          {queueMode === "roster30day" && (
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 shadow-sm space-y-6">
              
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-zinc-200 dark:border-zinc-800">
                <div>
                  <h4 className="font-bold text-zinc-900 dark:text-white text-sm flex items-center gap-2">
                    <span>{selectedMonthOption.label} Calendar Rotation Schedule</span>
                    <span className="text-xs font-mono font-normal text-zinc-500">
                      (Ends on {monthlyRosterPlan.cycleEndDate})
                    </span>
                  </h4>
                  <p className="text-xs text-zinc-500 mt-0.5">
                    Click any day from Day 1 to Day {monthlyRosterPlan.totalDays} to inspect the verified sequence and lead kombi for that date.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono font-bold text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/60 px-3 py-1.5 rounded-xl border border-purple-200 dark:border-purple-800">
                    Inspecting Day {selectedRosterDay} of {monthlyRosterPlan.totalDays}
                  </span>
                </div>
              </div>

              {/* Dynamic Calendar Grid: 1 to totalDays (ends on last day of month) */}
              <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-7 lg:grid-cols-10 gap-2">
                {monthlyRosterPlan.dailyRoster.map((dayEntry) => {
                  const dayNum = dayEntry.dayNumber;
                  const isSelected = selectedRosterDay === dayNum;
                  const leadVeh = dayEntry.queueOrder[0];

                  return (
                    <button
                      key={dayNum}
                      onClick={() => setSelectedRosterDay(dayNum)}
                      className={`p-2.5 rounded-2xl border text-center transition-all cursor-pointer relative ${
                        isSelected
                          ? "bg-purple-600 text-white border-purple-600 shadow-md scale-105 z-10"
                          : "bg-zinc-50 dark:bg-zinc-800/40 border-zinc-200 dark:border-zinc-700/60 hover:border-purple-400 text-zinc-800 dark:text-zinc-200"
                      }`}
                    >
                      {dayEntry.isToday && (
                        <span className="absolute top-1 right-1 px-1 rounded text-[7.5px] font-black uppercase bg-emerald-500 text-white">
                          Today
                        </span>
                      )}
                      <span className="text-[10px] uppercase block opacity-70 font-bold">
                        {dayEntry.dayOfWeekShort}
                      </span>
                      <strong className="text-base font-mono font-black block my-0.5">
                        {dayNum}
                      </strong>
                      <span className="text-[9px] block truncate font-mono opacity-85">
                        {leadVeh ? (leadVeh.vic || leadVeh.fleetNumber || leadVeh.vehicleReg) : "No Lead"}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Day Details Inspector Box */}
              <div className="p-5 rounded-2xl bg-zinc-50 dark:bg-zinc-800/30 border border-zinc-200 dark:border-zinc-700 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <span className="text-xs font-black uppercase tracking-wider text-purple-600 dark:text-purple-400 block">
                      Day {selectedRosterDay} Queue Order ({monthlyRosterPlan.dailyRoster.find(d => d.dayNumber === selectedRosterDay)?.dayOfWeek}, {monthlyRosterPlan.dailyRoster.find(d => d.dayNumber === selectedRosterDay)?.date})
                    </span>
                    <p className="text-xs text-zinc-500 mt-0.5">
                      {activeRosterDayVehicles[0] ? (
                        <>
                          Day {selectedRosterDay} Lead: <strong className="text-emerald-600 dark:text-emerald-400 font-mono">VIC: {activeRosterDayVehicles[0].vic || activeRosterDayVehicles[0].fleetNumber} ({activeRosterDayVehicles[0].vehicleReg})</strong> holds Bay 01 departure priority today. Rotation Rule: #1 on Day 1 is last on Day 2, and #2 on Day 1 is 1st on Day 2.
                        </>
                      ) : (
                        <>Corridor Lead priority holds Bay 01 priority through {monthlyRosterPlan.cycleEndDate}.</>
                      )}
                    </p>
                  </div>
                  <div className="text-xs font-mono font-bold text-zinc-600 dark:text-zinc-400">
                    {activeRosterDayVehicles.length} Vehicles in Rotation
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  {activeRosterDayVehicles.map((veh) => {
                    const isLead = veh.position === 1;
                    return (
                      <div
                        key={veh.vehicleReg}
                        className={`p-3.5 rounded-xl border flex flex-col justify-between gap-2.5 ${
                          isLead
                            ? "bg-emerald-50/80 dark:bg-emerald-950/20 border-emerald-300 dark:border-emerald-800 shadow-sm"
                            : veh.isMidMonthAddition
                            ? "bg-purple-50/50 dark:bg-purple-950/20 border-purple-200 dark:border-purple-900"
                            : "bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className={`w-6 h-6 rounded-lg flex items-center justify-center font-bold text-[11px] font-mono ${
                              isLead
                                ? "bg-emerald-600 text-white shadow"
                                : "bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300"
                            }`}>
                              #{veh.position}
                            </span>
                            <div>
                              <div className="flex items-center gap-1.5">
                                <span className="px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wider bg-amber-100 text-amber-900 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-300 dark:border-amber-800 font-mono">
                                  VIC: {veh.vic || veh.fleetNumber}
                                </span>
                              </div>
                              <strong className="text-zinc-900 dark:text-white font-mono text-xs block mt-0.5">
                                {veh.vic || veh.fleetNumber}
                              </strong>
                              <span className="text-[10px] text-zinc-500 font-mono">
                                Plate: {veh.vehicleReg} • {veh.loadingBay}
                              </span>
                            </div>
                          </div>

                          {isLead ? (
                            <span className="px-2 py-0.5 rounded text-[8.5px] font-black uppercase bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300">
                              Day {selectedRosterDay} Lead
                            </span>
                          ) : veh.isMidMonthAddition ? (
                            <span className="px-2 py-0.5 rounded text-[8.5px] font-black uppercase bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300 border border-purple-300">
                              Tail Lock
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded text-[8.5px] font-bold uppercase bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400">
                              Position #{veh.position}
                            </span>
                          )}
                        </div>

                        <div className="text-[11px] text-zinc-600 dark:text-zinc-400 border-t border-zinc-100 dark:border-zinc-800 pt-2 flex items-center justify-between">
                          <span>Driver: <strong>{veh.driverName}</strong></span>
                          <span>{veh.tripsThisMonth} trips/mo</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

            </div>
          )}

          {/* VIEW 2: VEHICLE TRIPS FOR THE MONTH */}
          {queueMode === "trips" && (
            <div className="space-y-6">
              
              {/* Monthly KPI Metrics */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 shadow-sm">
                  <div className="flex items-center justify-between text-zinc-500 mb-2">
                    <span className="text-xs font-bold uppercase tracking-wider">Total Route Trips</span>
                    <TrendingUp className="w-4 h-4 text-purple-500" />
                  </div>
                  <div className="text-2xl font-mono font-black text-zinc-900 dark:text-white">
                    {routeTripStats.totalTripsMonth}
                  </div>
                  <span className="text-[11px] text-zinc-500 mt-1 block">
                    Completed dispatches in {selectedMonthOption.monthName}
                  </span>
                </div>

                <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 shadow-sm">
                  <div className="flex items-center justify-between text-zinc-500 mb-2">
                    <span className="text-xs font-bold uppercase tracking-wider">Passengers Moved</span>
                    <Users className="w-4 h-4 text-blue-500" />
                  </div>
                  <div className="text-2xl font-mono font-black text-zinc-900 dark:text-white">
                    {routeTripStats.totalPassengersMonth.toLocaleString()}
                  </div>
                  <span className="text-[11px] text-zinc-500 mt-1 block">
                    Total commuter volume transported
                  </span>
                </div>

                <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 shadow-sm">
                  <div className="flex items-center justify-between text-zinc-500 mb-2">
                    <span className="text-xs font-bold uppercase tracking-wider">Corridor Revenue</span>
                    <Award className="w-4 h-4 text-emerald-500" />
                  </div>
                  <div className="text-2xl font-mono font-black text-emerald-600 dark:text-emerald-400">
                    E {routeTripStats.totalRevenueSZL.toLocaleString()}
                  </div>
                  <span className="text-[11px] text-zinc-500 mt-1 block">
                    SZL collected from corridor operations
                  </span>
                </div>

                <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 shadow-sm">
                  <div className="flex items-center justify-between text-zinc-500 mb-2">
                    <span className="text-xs font-bold uppercase tracking-wider">Active Kombis</span>
                    <Truck className="w-4 h-4 text-amber-500" />
                  </div>
                  <div className="text-2xl font-mono font-black text-zinc-900 dark:text-white">
                    {routeTripStats.activeVehiclesCount} / {queueVehicles.length}
                  </div>
                  <span className="text-[11px] text-zinc-500 mt-1 block">
                    Avg {routeTripStats.averageTripsPerVehicle} trips per vehicle
                  </span>
                </div>
              </div>

              {/* Vehicle Trips Table */}
              <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 shadow-sm space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-zinc-200 dark:border-zinc-800">
                  <div>
                    <h4 className="font-bold text-zinc-900 dark:text-white text-sm">
                      Vehicle Trip Roster & Dispatches ({selectedMonthOption.label})
                    </h4>
                    <p className="text-xs text-zinc-500 mt-0.5">
                      Breakdown of trip performance, passengers carried, and revenue for all vehicles on this corridor.
                    </p>
                  </div>
                  <div className="text-xs font-mono font-bold text-purple-600 dark:text-purple-400">
                    Cycle: Day 1 through {monthlyRosterPlan.cycleEndDate}
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-zinc-200 dark:border-zinc-800 text-zinc-500 uppercase tracking-wider font-bold">
                        <th className="py-3 px-3">Position</th>
                        <th className="py-3 px-3">Vehicle Plate & VIC</th>
                        <th className="py-3 px-3">Assigned Driver</th>
                        <th className="py-3 px-3">Loading Bay</th>
                        <th className="py-3 px-3 text-center">Trips ({selectedMonthOption.monthName.slice(0, 3)})</th>
                        <th className="py-3 px-3 text-center">Today</th>
                        <th className="py-3 px-3 text-right">Passengers</th>
                        <th className="py-3 px-3 text-right">Estimated Revenue</th>
                        <th className="py-3 px-3 text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                      {routeTripStats.stats.map((stat, idx) => (
                        <tr key={stat.vehicleReg} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/40 transition-colors">
                          <td className="py-3 px-3">
                            <span className={`w-6 h-6 rounded-lg inline-flex items-center justify-center font-mono font-bold text-[11px] ${
                              idx === 0
                                ? "bg-emerald-600 text-white"
                                : "bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300"
                            }`}>
                              #{idx + 1}
                            </span>
                          </td>
                          <td className="py-3 px-3">
                            <div className="font-mono font-bold text-zinc-900 dark:text-white">
                              {stat.vehicleReg}
                            </div>
                            <div className="text-[10px] font-mono text-zinc-500">
                              {stat.fleetNumber} • {stat.make} {stat.model}
                            </div>
                          </td>
                          <td className="py-3 px-3">
                            <div className="font-semibold text-zinc-800 dark:text-zinc-200">
                              {stat.driverName}
                            </div>
                            <div className="text-[10px] text-zinc-500">
                              {stat.driverPhone || "No contact"}
                            </div>
                          </td>
                          <td className="py-3 px-3 font-mono font-bold text-zinc-600 dark:text-zinc-400">
                            {stat.loadingBay}
                          </td>
                          <td className="py-3 px-3 text-center">
                            <span className="font-mono font-black text-sm text-purple-600 dark:text-purple-400">
                              {stat.tripsThisMonth}
                            </span>
                            <div className="w-16 h-1 bg-zinc-200 dark:bg-zinc-700 rounded-full mx-auto mt-1 overflow-hidden">
                              <div
                                className="h-full bg-purple-600 rounded-full"
                                style={{
                                  width: `${Math.min(100, Math.round((stat.tripsThisMonth / Math.max(1, routeTripStats.topVehicle?.tripsThisMonth || 1)) * 100))}%`
                                }}
                              />
                            </div>
                          </td>
                          <td className="py-3 px-3 text-center font-mono font-bold text-zinc-700 dark:text-zinc-300">
                            {stat.tripsToday}
                          </td>
                          <td className="py-3 px-3 text-right font-mono font-bold text-zinc-900 dark:text-white">
                            {stat.totalPassengersMonth.toLocaleString()}
                          </td>
                          <td className="py-3 px-3 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">
                            E {stat.estimatedRevenueSZL.toLocaleString()}
                          </td>
                          <td className="py-3 px-3 text-center">
                            {stat.isLead ? (
                              <span className="px-2 py-0.5 rounded text-[9px] font-black uppercase bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300">
                                Month Lead
                              </span>
                            ) : stat.isMidMonth ? (
                              <span className="px-2 py-0.5 rounded text-[9px] font-black uppercase bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300 border border-purple-300">
                                Tail Lock
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded text-[9px] font-bold uppercase bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400">
                                Completed
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>
          )}

          {/* VIEW 3: LAST 15 QUEUING POSITIONS */}
          {queueMode === "positions15" && (
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 shadow-sm space-y-6">
              
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-zinc-200 dark:border-zinc-800">
                <div>
                  <h4 className="font-bold text-zinc-900 dark:text-white text-sm flex items-center gap-2">
                    <ListOrdered className="w-4 h-4 text-purple-600" />
                    <span>Corridor Queuing Positions #1 through #15 ({selectedMonthOption.label})</span>
                  </h4>
                  <p className="text-xs text-zinc-500 mt-0.5">
                    Designated queuing priority for {routes.find(r => r.id === selectedQueueRouteId)?.origin} ➔ {routes.find(r => r.id === selectedQueueRouteId)?.destination}. Active cycle ends on <strong>{monthlyRosterPlan.cycleEndDate}</strong>.
                  </p>
                </div>

                <div className="text-xs font-mono font-bold text-purple-600 bg-purple-50 dark:bg-purple-950/60 px-3 py-1.5 rounded-xl border border-purple-200 dark:border-purple-800">
                  Showing {Math.min(15, last15Positions.length)} of {queueVehicles.length} Corridor Positions
                </div>
              </div>

              {/* Positions 1 to 15 List Cards */}
              <div className="space-y-3">
                {last15Positions.map((item) => {
                  const isLead = item.position === 1;
                  const originalVeh = vehicles.find(v => v.registrationNumber === item.vehicleReg);

                  return (
                    <div
                      key={item.vehicleReg}
                      className={`p-4 rounded-2xl border transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                        isLead
                          ? "bg-emerald-50/70 dark:bg-emerald-950/20 border-emerald-300 dark:border-emerald-800 shadow-sm"
                          : item.isMidMonthAddition
                          ? "bg-purple-50/50 dark:bg-purple-950/20 border-purple-200 dark:border-purple-900"
                          : "bg-zinc-50 dark:bg-zinc-800/40 border-zinc-200 dark:border-zinc-700/60"
                      }`}
                    >
                      <div className="flex items-center gap-3.5">
                        {/* Position Badge 1..15 */}
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-mono font-black text-sm shrink-0 ${
                          isLead
                            ? "bg-emerald-600 text-white shadow-md"
                            : "bg-zinc-200 dark:bg-zinc-700 text-zinc-800 dark:text-zinc-200"
                        }`}>
                          #{item.position}
                        </div>

                        {/* Vehicle Photo */}
                        <img
                          src={item.driverProfilePictureUrl || originalVeh?.vehiclePhotoUrl || VEHICLE_IMAGES[0]}
                          alt={item.vehicleReg}
                          className="w-12 h-12 rounded-xl object-cover border border-zinc-200 dark:border-zinc-700 shrink-0"
                          referrerPolicy="no-referrer"
                        />

                        {/* Plate, Fleet VIC, Driver */}
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-mono font-black text-zinc-900 dark:text-white text-sm">
                              {item.vehicleReg}
                            </span>
                            <span className="text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400">
                              ({item.fleetNumber})
                            </span>
                            
                            {isLead ? (
                              <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300">
                                Month Lead (Bay Priority)
                              </span>
                            ) : item.isMidMonthAddition ? (
                              <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300 border border-purple-300">
                                Mid-Month Tail Lock
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-full text-[9px] font-bold uppercase bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 border border-zinc-300 dark:border-zinc-700">
                                Position #{item.position}
                              </span>
                            )}
                          </div>

                          <div className="text-xs text-zinc-600 dark:text-zinc-400 mt-1 flex items-center gap-3 flex-wrap">
                            <span>Driver: <strong>{item.driverName}</strong></span>
                            <span>•</span>
                            <span>Bay: <strong>{item.loadingBay}</strong></span>
                            <span>•</span>
                            <span>Trips this Month: <strong>{item.tripsThisMonth}</strong></span>
                            <span>•</span>
                            <span>Today: <strong>{item.tripsToday}</strong></span>
                          </div>

                          <div className="text-[10.5px] text-zinc-500 dark:text-zinc-400 mt-1 italic">
                            {item.metadataOriginExplanation}
                          </div>
                        </div>
                      </div>

                      {/* Controls & Metadata Inspection */}
                      <div className="flex items-center gap-2 self-end md:self-center shrink-0">
                        <button
                          onClick={() => handleMoveQueue(item.vehicleReg, "up")}
                          disabled={item.position === 1}
                          className="p-2 rounded-xl bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 disabled:opacity-30 cursor-pointer"
                          title="Move up in queue sequence"
                        >
                          <ArrowUp className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleMoveQueue(item.vehicleReg, "down")}
                          disabled={item.position === queueVehicles.length}
                          className="p-2 rounded-xl bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 disabled:opacity-30 cursor-pointer"
                          title="Move down in queue sequence"
                        >
                          <ArrowDown className="w-3.5 h-3.5" />
                        </button>

                        <button
                          onClick={() => originalVeh && setInspectedMetadataVehicle(originalVeh)}
                          className="px-3 py-2 bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 hover:bg-purple-200 rounded-xl text-xs font-bold cursor-pointer"
                        >
                          Inspect Metadata
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

            </div>
          )}

          {/* VIEW 4: LIVE CORRIDOR QUEUE */}
          {queueMode === "live" && (
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-zinc-200 dark:border-zinc-800">
                <span className="text-xs font-bold uppercase tracking-wider text-zinc-500">
                  Live Corridor Sequence: {routes.find(r => r.id === selectedQueueRouteId)?.origin} ➔ {routes.find(r => r.id === selectedQueueRouteId)?.destination}
                </span>
                <span className="text-xs font-mono font-bold text-purple-600 dark:text-purple-400">
                  {queueVehicles.length} Vehicles in Queue Sequence
                </span>
              </div>

              <div className="space-y-3">
                {queueVehicles.map((v, index) => {
                  const driverObj = drivers.find((d) => d.id === v.driverId || d.assignedVehicleReg === v.registrationNumber);
                  const isLead = index === 0;

                  return (
                    <div
                      key={v.registrationNumber}
                      className={`p-4 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                        isLead
                          ? "bg-emerald-50/70 dark:bg-emerald-950/20 border-emerald-300 dark:border-emerald-800 shadow-sm"
                          : v.isMidMonthAddition
                          ? "bg-purple-50/50 dark:bg-purple-950/20 border-purple-200 dark:border-purple-900"
                          : "bg-zinc-50 dark:bg-zinc-800/40 border-zinc-200 dark:border-zinc-700/60"
                      }`}
                    >
                      <div className="flex items-center gap-3.5">
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-mono font-black text-sm ${
                          isLead
                            ? "bg-emerald-600 text-white shadow"
                            : "bg-zinc-200 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-300"
                        }`}>
                          #{index + 1}
                        </div>

                        <img
                          src={driverObj?.profilePictureUrl || v.vehiclePhotoUrl || VEHICLE_IMAGES[0]}
                          alt={v.registrationNumber}
                          className="w-12 h-12 rounded-xl object-cover border border-zinc-200 dark:border-zinc-700"
                          referrerPolicy="no-referrer"
                        />

                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-black text-zinc-900 dark:text-white text-sm">
                              {v.registrationNumber}
                            </span>
                            <span className="text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400">
                              ({v.fleetNumber || v.vic})
                            </span>
                            {v.isMidMonthAddition && (
                              <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300 border border-purple-300">
                                Mid-Month Tail Lock
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-zinc-600 dark:text-zinc-400">
                            Driver: <strong>{driverObj ? driverObj.fullName : "Unassigned"}</strong> • Bay: <strong>{v.loadingBay || "Bay 01"}</strong>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleMoveQueue(v.registrationNumber, "up")}
                          disabled={index === 0}
                          className="p-2 rounded-xl bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 disabled:opacity-30 cursor-pointer"
                        >
                          <ArrowUp className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleMoveQueue(v.registrationNumber, "down")}
                          disabled={index === queueVehicles.length - 1}
                          className="p-2 rounded-xl bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 disabled:opacity-30 cursor-pointer"
                        >
                          <ArrowDown className="w-3.5 h-3.5" />
                        </button>

                        <button
                          onClick={() => setInspectedMetadataVehicle(v)}
                          className="px-3 py-2 bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 hover:bg-purple-200 rounded-xl text-xs font-bold cursor-pointer"
                        >
                          Inspect Metadata
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* VIEW 5: YEAR-ON-YEAR (YoY) ROTATION & QUEUE COMPARISON */}
          {queueMode === "yoy" && (
            <YoYQueueComparisonView
              yoyComparison={yoyComparison}
              availableYears={availableYears}
              rosterYear={rosterYear}
              compareYear={compareYear}
              onSelectRosterYear={handleSelectYear}
              onSelectCompareYear={(yr) => setCompareYear(yr)}
              onSelectMonth={handleSelectMonth}
              availableMonths={availableMonths}
              rosterMonth={rosterMonth}
              selectedRouteName={`${routes.find(r => r.id === selectedQueueRouteId)?.origin || "Mbabane"} ➔ ${routes.find(r => r.id === selectedQueueRouteId)?.destination || "Manzini"}`}
              vehicles={vehicles}
              onInspectVehicle={(v) => setInspectedMetadataVehicle(v)}
              copiedYoYReport={copiedYoYReport}
              onCopyYoYReport={handleCopyYoYReport}
            />
          )}

        </div>
      )}

      {/* SUB-PANEL 3: DRIVER CAB CREDENTIALS & CHAT */}
      {activeSubTab === "drivers" && (
        <DriverCredentialsChatSubTab
          drivers={drivers}
          vehicles={vehicles}
          onOpenAddDriver={() => {
            setEditingDriver(null);
            setIsDriverModalOpen(true);
          }}
          onOpenEditDriver={(d) => {
            setEditingDriver(d);
            setIsDriverModalOpen(true);
          }}
          onUpdateDrivers={onUpdateDrivers}
          onOpenVirtualCard={(veh, drv) => {
            setVirtualCardVehicle(veh);
            setIsVirtualCardModalOpen(true);
            setIsNewCardRegistration(false);
          }}
        />
      )}

      {/* SUB-PANEL 4: CORRIDOR ROUTES */}
      {activeSubTab === "routes" && (
        <div className="space-y-6">
          <div className="flex items-center justify-between bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 shadow-sm">
            <div>
              <h3 className="text-base font-black text-zinc-900 dark:text-white flex items-center gap-2">
                <MapPin className="w-5 h-5 text-amber-500" />
                <span>National Transport Corridors & Terminal Bays</span>
              </h3>
              <p className="text-xs text-zinc-500">
                Official route networks, standardized passenger fares, timetable departures, and designated loading bays.
              </p>
            </div>

            <button
              onClick={() => {
                setEditingRoute(null);
                setRouteForm({
                  origin: "",
                  destination: "",
                  region: EswatiniRegion.Hhohho,
                  baseFareE: 50,
                  defaultBay: "Bay 01",
                  timetableStartTime: "05:30"
                });
                setIsRouteModalOpen(true);
              }}
              className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold shadow flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Add New Route</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {routes.map((route) => {
              const routeVehiclesCount = vehicles.filter(v => v.routeAssignmentId === route.id).length;

              return (
                <div
                  key={route.id}
                  className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-5 shadow-sm space-y-4 hover:shadow-md transition-all"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300">
                        {route.region}
                      </span>
                      <h4 className="text-base font-bold text-zinc-900 dark:text-white mt-1">
                        {route.origin} ➔ {route.destination}
                      </h4>
                    </div>

                    <div className="text-right">
                      <span className="text-lg font-black font-mono text-emerald-600 dark:text-emerald-400 block">
                        E{route.fare || route.baseFareE}
                      </span>
                      <span className="text-[10px] text-zinc-400">Standard Fare</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-[11px] bg-zinc-50 dark:bg-zinc-800/40 p-2.5 rounded-xl border border-zinc-200 dark:border-zinc-750 font-mono">
                    <div>
                      <span className="text-[9px] uppercase text-zinc-400 block">Terminal Bay</span>
                      <strong className="text-zinc-900 dark:text-zinc-100">{route.defaultBay || "Bay 01"}</strong>
                    </div>
                    <div>
                      <span className="text-[9px] uppercase text-zinc-400 block">First Departure</span>
                      <strong className="text-zinc-900 dark:text-zinc-100">{route.timetableStartTime || "05:30"}</strong>
                    </div>
                    <div className="col-span-2 pt-1 border-t border-zinc-200 dark:border-zinc-700">
                      <span className="text-[9px] uppercase text-zinc-400 block">Active Vehicles in Corridor</span>
                      <strong className="text-purple-600 font-bold">{routeVehiclesCount} Licensed Vehicles</strong>
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-100 dark:border-zinc-800">
                    <button
                      onClick={() => {
                        setEditingRoute(route);
                        setRouteForm({
                          origin: route.origin,
                          destination: route.destination,
                          region: route.region,
                          baseFareE: route.fare || route.baseFareE,
                          defaultBay: route.defaultBay || "Bay 01",
                          timetableStartTime: route.timetableStartTime || "05:30"
                        });
                        setIsRouteModalOpen(true);
                      }}
                      className="px-3 py-1.5 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 text-zinc-700 dark:text-zinc-300 rounded-xl text-xs font-semibold cursor-pointer"
                    >
                      Edit Route
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* SUB-PANEL: RANK FEE LEDGER (PER MARSHAL & REGION) */}
      {activeSubTab === "revenue" && (
        <RankLedgerSubTab
          marshals={marshals}
          marshalTransactions={marshalTransactions}
          routes={routes}
          rankFee={rankFee}
          splitOperational={splitOperational}
          splitNRTC={splitNRTC}
          splitMaintenance={splitMaintenance}
          onUpdateRankFee={onUpdateRankFee}
          onUpdateRankFeeSplits={onUpdateRankFeeSplits}
          onOpenAddMarshal={handleOpenAddMarshal}
          onOpenEditMarshal={handleOpenEditMarshal}
          onOpenMarshalCard={handleOpenMarshalCard}
        />
      )}

      {/* SUB-PANEL: REGIONAL TERMINALS & EMERGENCY BROADCAST */}
      {activeSubTab === "terminals" && (
        <RegionalTerminalsSubTab
          regionConfigs={regionConfigs}
          onUpdateRegionConfigs={onUpdateRegionConfigs}
        />
      )}

      {/* SUB-PANEL 5: PERMITS & COMPLIANCE */}
      {activeSubTab === "permits" && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 shadow-sm space-y-4">
            <h3 className="text-base font-black text-zinc-900 dark:text-white flex items-center gap-2">
              <Award className="w-5 h-5 text-emerald-500" />
              <span>National Road Carrier Permits & Roadworthiness Compliance</span>
            </h3>
            <p className="text-xs text-zinc-500">
              Bi-annual Certificate of Fitness (COF) audit tracking, PDP validity schedules, and QR code plaque generation.
            </p>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-zinc-200 dark:border-zinc-800 font-bold text-zinc-500 uppercase bg-zinc-50/50 dark:bg-zinc-800/40">
                    <th className="py-3 px-4">Vehicle Plate</th>
                    <th className="py-3 px-4">Permit Number</th>
                    <th className="py-3 px-4">Permit Expiry</th>
                    <th className="py-3 px-4">COF Certificate</th>
                    <th className="py-3 px-4">COF Expiry</th>
                    <th className="py-3 px-4">Permit Status</th>
                    <th className="py-3 px-4 text-right">Plaque & QR</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                  {vehicles.map((v) => (
                    <tr key={v.registrationNumber} className="hover:bg-zinc-50/80 dark:hover:bg-zinc-800/50">
                      <td className="py-3 px-4 font-mono font-bold text-zinc-900 dark:text-white">
                        {v.registrationNumber}
                      </td>
                      <td className="py-3 px-4 font-mono text-zinc-700 dark:text-zinc-300">
                        {v.permitNumber || "RPT-PENDING"}
                      </td>
                      <td className="py-3 px-4 font-mono font-semibold text-emerald-700 dark:text-emerald-400">
                        {v.permitExpiryDate || "2027-08-01"}
                      </td>
                      <td className="py-3 px-4 font-mono text-zinc-600 dark:text-zinc-400">
                        {v.cofNumber || "COF-VALID"}
                      </td>
                      <td className="py-3 px-4 font-mono text-zinc-600 dark:text-zinc-400">
                        {v.cofExpiryDate || "2027-08-01"}
                      </td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300">
                          {v.permitStatus || "Active"}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => setQrModalVehicle(v)}
                          className="px-2.5 py-1 bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 text-emerald-700 dark:text-emerald-300 rounded-lg text-xs font-bold inline-flex items-center gap-1 cursor-pointer"
                        >
                          <QrCode className="w-3.5 h-3.5" />
                          <span>View Plaque</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* SUB-PANEL 6: RENEWALS */}
      {activeSubTab === "renewals" && (
        <PermitRenewalsSubTab
          userRole="Admin"
          vehicles={vehicles}
          drivers={drivers}
          renewalRequests={renewalRequests}
          renewalArchives={renewalArchives}
          auditLogs={auditLogs}
          onUpdateVehicles={onUpdateVehicles}
          onSaveRenewalRequests={saveRenewalRequests}
          onSaveRenewalArchives={saveRenewalArchives}
          onSaveAuditLogs={saveAuditLogs}
          onAddNotification={onAddNotification || (() => {})}
          selectedVehicle={selectedRenewalVehicle}
          setSelectedVehicle={setSelectedRenewalVehicle}
          isRequestModalOpen={isRenewalRequestModalOpen}
          setIsRequestModalOpen={setIsRenewalRequestModalOpen}
          isProcessModalOpen={isRenewalProcessModalOpen}
          setIsProcessModalOpen={setIsRenewalProcessModalOpen}
        />
      )}

      {/* SUB-PANEL 7: SECURITY AUDIT TRAIL */}
      {activeSubTab === "audits" && (
        <SecurityAuditTrailSubTab
          auditLogs={auditLogs}
        />
      )}

      {/* SUB-PANEL 8: COMPLIANCE REPORTS */}
      {activeSubTab === "reports" && (
        <ComplianceReportsSubTab
          vehicles={vehicles}
          routes={routes}
          drivers={drivers}
          renewalRequests={renewalRequests}
        />
      )}

      {/* MODAL: VEHICLE REGISTRATION / EDIT FORM */}
      <VehicleRegistrationModal
        isOpen={isVehicleModalOpen}
        onClose={() => {
          setIsVehicleModalOpen(false);
          setEditingVehicle(null);
        }}
        onSubmit={handleSaveVehicle}
        editingVehicle={editingVehicle}
        routes={routes}
        drivers={drivers}
        associations={DEFAULT_ASSOCIATIONS}
      />

      {/* MODAL: DRIVER REGISTRATION / EDIT FORM */}
      <DriverRegistrationModal
        isOpen={isDriverModalOpen}
        onClose={() => {
          setIsDriverModalOpen(false);
          setEditingDriver(null);
        }}
        onSubmit={handleSaveDriver}
        editingDriver={editingDriver}
        vehicles={vehicles}
      />

      {/* MODAL: OFFICIAL NRTC PLAQUE & QR CODE */}
      {qrModalVehicle && (
        <OfficialPlaqueQRModal
          vehicle={qrModalVehicle}
          vehicles={vehicles}
          routes={routes}
          drivers={drivers}
          onClose={() => setQrModalVehicle(null)}
          onPrintA4={(v) => {
            setQrModalVehicle(null);
            setPrintA4Vehicle(v);
          }}
        />
      )}

      {/* MODAL: VEHICLE VIRTUAL TRANSIT CARD & REGISTRATION FEE LEDGER */}
      {isVirtualCardModalOpen && virtualCardVehicle && (
        <VehicleVirtualCardModal
          vehicle={virtualCardVehicle}
          driver={drivers.find(d => d.id === virtualCardVehicle.driverId || d.assignedVehicleReg === virtualCardVehicle.registrationNumber)}
          onClose={() => {
            setIsVirtualCardModalOpen(false);
            setVirtualCardVehicle(null);
            setIsNewCardRegistration(false);
          }}
          isNewRegistration={isNewCardRegistration}
        />
      )}

      {/* MODAL: CRYPTOGRAPHIC QR & PERMIT VALIDITY CERTIFICATE */}
      {validityCertVehicle && (
        <QRValidityCertificateModal
          vehicle={validityCertVehicle}
          vehicles={vehicles}
          routes={routes}
          drivers={drivers}
          onClose={() => setValidityCertVehicle(null)}
        />
      )}

      {/* MODAL: A4 PERMIT PRINTABLE SHEET */}
      {printA4Vehicle && (
        <A4PermitPrintModal
          vehicle={printA4Vehicle}
          routes={routes}
          drivers={drivers}
          onClose={() => setPrintA4Vehicle(null)}
        />
      )}

      {/* MODAL: DELETE / REVOKE CONFIRMATION */}
      {deleteConfirmVehicle && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-red-600">
              <AlertTriangle className="w-6 h-6 shrink-0" />
              <h3 className="font-bold text-base text-zinc-900 dark:text-white">
                Revoke or Remove Vehicle
              </h3>
            </div>

            <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
              Are you sure you want to modify the status or delete commercial vehicle{" "}
              <strong className="font-mono text-zinc-900 dark:text-white">
                {deleteConfirmVehicle.registrationNumber}
              </strong>{" "}
              (FLEET-VIC: {deleteConfirmVehicle.fleetNumber || deleteConfirmVehicle.vic})?
            </p>

            <div className="space-y-2 pt-2">
              <button
                onClick={() => handleRevokePermit(deleteConfirmVehicle)}
                className="w-full py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-bold text-xs shadow cursor-pointer flex items-center justify-center gap-1.5"
              >
                <AlertTriangle className="w-4 h-4" />
                <span>Revoke & Suspend Permit</span>
              </button>

              <button
                onClick={() => handleConfirmDelete(deleteConfirmVehicle)}
                className="w-full py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold text-xs shadow cursor-pointer flex items-center justify-center gap-1.5"
              >
                <Trash2 className="w-4 h-4" />
                <span>Delete Vehicle from Registry</span>
              </button>

              <button
                onClick={() => setDeleteConfirmVehicle(null)}
                className="w-full py-2 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 rounded-xl font-semibold text-xs cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: QUEUE METADATA ORIGIN INSPECTOR */}
      {inspectedMetadataVehicle && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-200 dark:border-zinc-800">
              <h3 className="font-bold text-zinc-900 dark:text-white text-sm flex items-center gap-2">
                <Layers className="w-4 h-4 text-purple-500" />
                <span>30-Day Queue Sequence Source of Truth</span>
              </h3>
              <button
                onClick={() => setInspectedMetadataVehicle(null)}
                className="text-zinc-400 hover:text-zinc-600"
              >
                ✕
              </button>
            </div>

            <div className="p-4 bg-zinc-50 dark:bg-zinc-800/50 rounded-2xl border border-zinc-200 dark:border-zinc-700 space-y-2">
              <div className="font-mono font-black text-base text-zinc-900 dark:text-white">
                {inspectedMetadataVehicle.registrationNumber} ({inspectedMetadataVehicle.fleetNumber || inspectedMetadataVehicle.vic})
              </div>
              <div className="text-xs text-zinc-600 dark:text-zinc-400">
                {inspectedMetadataVehicle.make} {inspectedMetadataVehicle.model} • {inspectedMetadataVehicle.seatingCapacity} Seater
              </div>
              <div className="text-xs text-purple-700 dark:text-purple-300 font-bold">
                {inspectedMetadataVehicle.rosterStatusLabel || (inspectedMetadataVehicle.isMidMonthAddition ? "Mid-Month Entry (Tail Locked)" : "Standard 30-Day Sequence")}
              </div>
            </div>

            <div className="text-xs text-zinc-600 dark:text-zinc-400 space-y-2">
              <p>
                {inspectedMetadataVehicle.metadataOriginExplanation || (
                  inspectedMetadataVehicle.isMidMonthAddition
                    ? "This vehicle joined mid-month. In accordance with national 30-day queuing regulations, it remains locked to the tail position of the queue sequence for all remaining days of the current 30-day term. Next month, it will graduate to the regular rotation sequence."
                    : "This vehicle is part of the standard 30-day rotation sequence. Once a vehicle serves as #1 (Bay Lead) for the month, it rotates to the tail next month and cannot repeat as #1 until all vehicles in the route have completed their turn."
                )}
              </p>
            </div>

            <button
              onClick={() => setInspectedMetadataVehicle(null)}
              className="w-full py-2.5 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl text-xs cursor-pointer"
            >
              Done Inspecting
            </button>
          </div>
        </div>
      )}

      {/* MODAL: CORRIDOR ROUTE EDITOR */}
      {isRouteModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-zinc-900 dark:text-white flex items-center gap-2">
              <MapPin className="w-5 h-5 text-amber-500" />
              <span>{editingRoute ? "Edit Corridor Route" : "Add New Corridor Route"}</span>
            </h3>

            <form onSubmit={handleSaveRoute} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold uppercase text-zinc-500 mb-1">Origin *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Mbabane"
                    value={routeForm.origin}
                    onChange={(e) => setRouteForm({ ...routeForm, origin: e.target.value })}
                    className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs font-bold text-zinc-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold uppercase text-zinc-500 mb-1">Destination *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Manzini"
                    value={routeForm.destination}
                    onChange={(e) => setRouteForm({ ...routeForm, destination: e.target.value })}
                    className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs font-bold text-zinc-900 dark:text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold uppercase text-zinc-500 mb-1">Region</label>
                  <select
                    value={routeForm.region}
                    onChange={(e) => setRouteForm({ ...routeForm, region: e.target.value as any })}
                    className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs text-zinc-900 dark:text-white"
                  >
                    <option value={EswatiniRegion.Hhohho}>Hhohho</option>
                    <option value={EswatiniRegion.Manzini}>Manzini</option>
                    <option value={EswatiniRegion.Lubombo}>Lubombo</option>
                    <option value={EswatiniRegion.Shiselweni}>Shiselweni</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-bold uppercase text-zinc-500 mb-1">Standard Fare (E)</label>
                  <input
                    type="number"
                    value={routeForm.baseFareE}
                    onChange={(e) => setRouteForm({ ...routeForm, baseFareE: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs font-bold text-zinc-900 dark:text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold uppercase text-zinc-500 mb-1">Default Bay</label>
                  <input
                    type="text"
                    value={routeForm.defaultBay}
                    onChange={(e) => setRouteForm({ ...routeForm, defaultBay: e.target.value })}
                    className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs text-zinc-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold uppercase text-zinc-500 mb-1">First Departure</label>
                  <input
                    type="text"
                    placeholder="05:30"
                    value={routeForm.timetableStartTime}
                    onChange={(e) => setRouteForm({ ...routeForm, timetableStartTime: e.target.value })}
                    className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs font-mono text-zinc-900 dark:text-white"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-zinc-200 dark:border-zinc-800">
                <button
                  type="button"
                  onClick={() => setIsRouteModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white rounded-xl shadow cursor-pointer"
                >
                  Save Corridor Route
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MARSHAL REGISTRATION & EDIT MODAL */}
      {isMarshalModalOpen && (
        <MarshalRegistrationModal
          isOpen={isMarshalModalOpen}
          onClose={() => {
            setIsMarshalModalOpen(false);
            setEditingMarshal(null);
          }}
          onSubmit={handleSaveMarshal}
          editingMarshal={editingMarshal}
          routes={routes}
        />
      )}

      {/* MARSHAL VIRTUAL CARD MODAL */}
      {isMarshalCardModalOpen && activeCardMarshal && (
        <MarshalVirtualCardModal
          isOpen={isMarshalCardModalOpen}
          onClose={() => {
            setIsMarshalCardModalOpen(false);
            setActiveCardMarshal(null);
            setIsNewMarshalRegistration(false);
          }}
          marshal={activeCardMarshal}
          assignedRoute={routes.find(r => r.id === activeCardMarshal.assignedRouteId)}
          isNewRegistration={isNewMarshalRegistration}
        />
      )}

    </div>
  );
}
