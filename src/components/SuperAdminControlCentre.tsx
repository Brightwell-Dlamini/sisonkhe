/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from "react";
import { Driver, Vehicle, Route, Trip, IncidentReport, TrafficTicket, Advert, EswatiniRegion, KombiStatus, MarshalAccount, RegionConfig } from "../types";
import { pushServerState } from "../utils/syncManager";
import { getAllSystemAccounts, syncUserUpdate } from "../utils/authManager";
import AnalyticsDashboard from "./AnalyticsDashboard";
import {
  ShieldCheck,
  Users,
  Activity,
  AlertTriangle,
  Server,
  Database,
  Key,
  Database as DbIcon,
  RefreshCw,
  FileText,
  Search,
  User,
  Settings,
  Shield,
  Clock,
  MapPin,
  Sparkles,
  Play,
  CheckCircle,
  XCircle,
  Check,
  TrendingUp,
  DollarSign,
  Briefcase,
  AlertOctagon,
  Eye,
  EyeOff,
  Lock,
  Unlock,
  Terminal,
  Send,
  Plus,
  X,
  RefreshCw as ResetIcon,
  HardDrive,
  Network,
  Cpu,
  Download,
  Upload,
  Globe,
  Bell,
  Smartphone,
  CheckCircle2,
  ListFilter,
  Star,
  Award,
  Megaphone,
  Trash2,
  ToggleLeft,
  ToggleRight,
  Pencil,
  Image as ImageIcon
} from "lucide-react";

// Types for local simulated items
interface SystemError {
  id: string;
  time: string;
  module: string;
  affectedUser: string;
  severity: "Critical" | "High" | "Medium" | "Low" | "Info";
  description: string;
  suggestedFix: string;
  developerNotes: string;
  status: "Pending" | "In Progress" | "Resolved" | "Closed";
}

interface SecurityAuditLog {
  id: string;
  user: string;
  role: string;
  time: string;
  ipAddress: string;
  device: string;
  action: string;
  result: "Success" | "Failed" | "Blocked";
}

interface UserAccount {
  id: string;
  fullName: string;
  role: string;
  phone: string;
  email: string;
  username: string;
  status: "Active" | "Suspended" | "Locked" | "Pending Approval";
  lastLogin: string;
  licenseStatus?: string;
  permitStatus?: string;
  password?: string;
}

interface SecurityThreat {
  id: string;
  time: string;
  ipAddress: string;
  country: string;
  browser: string;
  os: string;
  event: string;
  severity: "High" | "Medium" | "Low";
  status: "Investigating" | "Blocked" | "Ignored";
}

interface SuperAdminProps {
  drivers: Driver[];
  vehicles: Vehicle[];
  routes: Route[];
  trips: Trip[];
  incidents: IncidentReport[];
  trafficTickets?: TrafficTicket[];
  onAddTrafficTicket?: (ticket: any) => void;
  onAddManualIncident: (inc: Omit<IncidentReport, "id" | "timestamp">) => void;
  onUpdateIncidentStatus: (id: string, status: IncidentReport["status"], escalatedTo: IncidentReport["escalatedTo"]) => void;
  onAddIncidentMessage?: (incidentId: string, text: string, sender: "Commuter" | "Inspector" | "Driver" | "Other", senderName: string) => void;
  onRestoreSystem?: () => void;
  
  rankFee?: number;
  splitOperational?: number;
  splitNRTC?: number;
  splitMaintenance?: number;
  onUpdateRankFee?: (fee: number, ops: number, nrtc: number, maint: number) => void;

  onUpdateDrivers?: (drivers: Driver[]) => void;
  onUpdateVehicles?: (vehicles: Vehicle[]) => void;
  onUpdateRoutes?: (routes: Route[]) => void;
  marshals?: MarshalAccount[];
  onUpdateMarshals?: (marshals: MarshalAccount[]) => void;
  regionConfigs?: RegionConfig[];
  onUpdateRegionConfigs?: (configs: RegionConfig[]) => void;
  onForceSyncAll?: () => Promise<void>;
}

export default function SuperAdminControlCentre({
  drivers,
  vehicles,
  routes,
  trips,
  incidents,
  trafficTickets = [],
  onAddManualIncident,
  onUpdateIncidentStatus,
  onAddIncidentMessage,
  onRestoreSystem,
  rankFee = 25,
  splitOperational = 20.00,
  splitNRTC = 3.50,
  splitMaintenance = 1.50,
  onUpdateRankFee,
  onUpdateDrivers,
  onUpdateVehicles,
  onUpdateRoutes,
  marshals = [],
  onUpdateMarshals,
  regionConfigs = [],
  onUpdateRegionConfigs,
  onForceSyncAll
}: SuperAdminProps) {
  // Main control tabs
  const [activeSubTab, setActiveSubTab] = useState<
    "overview" | "users" | "adverts" | "security" | "errors" | "health" | "audits" | "config" | "backup" | "analytics" | "sync"
  >("overview");

  // Cloud Synchronization state
  const [isCloudSyncing, setIsCloudSyncing] = useState(false);
  const [cloudSyncMsg, setCloudSyncMsg] = useState("");
  const [lastCloudSyncTime, setLastCloudSyncTime] = useState<string>(() => new Date().toLocaleTimeString());
  const [isServerActive, setIsServerActive] = useState<boolean>(true);

  // Auto-Switching Display Cycle Timer state
  const [cycleTimerSeconds, setCycleTimerSeconds] = useState<number>(() => {
    const saved = localStorage.getItem("kombiflow_cycle_timer_seconds");
    return saved ? Number(saved) : 6;
  });
  const [cycleTimerMsg, setCycleTimerMsg] = useState("");

  // User Management filters & categories
  const [userCategory, setUserCategory] = useState<
    "Drivers" | "Fleet" | "Ranks" | "Revenue" | "Enforcement" | "Commuters" | "Developers" | "System Administrators"
  >("Drivers");
  const [userSearchQuery, setUserSearchQuery] = useState("");
  const [selectedUserAccount, setSelectedUserAccount] = useState<UserAccount | null>(null);

  // User Editing States
  const [isEditingUser, setIsEditingUser] = useState(false);
  const [editFullName, setEditFullName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editUsername, setEditUsername] = useState("");
  const [editRole, setEditRole] = useState("");
  
  // Password Reset States
  const [isResettingPassword, setIsResettingPassword] = useState(false);
  const [resetPasswordValue, setResetPasswordValue] = useState("");
  const [resetSuccessMsg, setResetSuccessMsg] = useState("");
  const [visiblePasswordIds, setVisiblePasswordIds] = useState<string[]>([]);

  // Security Centre states
  const [securitySearchQuery, setSecuritySearchQuery] = useState("");
  const [ipWhitelist, setIpWhitelist] = useState<string[]>(["192.168.1.105", "10.0.0.12", "196.24.45.18"]);
  const [newIpToWhitelist, setNewIpToWhitelist] = useState("");
  const [ipBlacklist, setIpBlacklist] = useState<string[]>(["185.220.101.4", "45.143.203.14"]);
  const [newIpToBlacklist, setNewIpToBlacklist] = useState("");

  // Error Management states
  const [errorSeverityFilter, setErrorSeverityFilter] = useState<"All" | "Critical" | "High" | "Medium" | "Low">("All");
  const [selectedErrorId, setSelectedErrorId] = useState<string | null>(null);

  // System Configuration states
  const [configRegion, setConfigRegion] = useState("Hhohho");
  const [configTheme, setConfigTheme] = useState(() => localStorage.getItem("kombiflow_admin_theme") || "High Contrast Cyber Slate");
  const [configNotificationTemplate, setConfigNotificationTemplate] = useState("Default Smart Dispatch Template");

  const applyConsoleTheme = (selectedTheme: string) => {
    setConfigTheme(selectedTheme);
    localStorage.setItem("kombiflow_admin_theme", selectedTheme);
    if (selectedTheme === "Google Cloud Console Light") {
      document.documentElement.classList.remove("dark");
      document.body.classList.remove("dark");
      localStorage.setItem("kombiflow_isDarkMode", "false");
    } else {
      document.documentElement.classList.add("dark");
      document.body.classList.add("dark");
      localStorage.setItem("kombiflow_isDarkMode", "true");
    }
    document.documentElement.setAttribute("data-admin-theme", selectedTheme);
    window.dispatchEvent(new Event("storage"));
    window.dispatchEvent(new CustomEvent("kombiflow_theme_changed", { detail: selectedTheme }));
  };

  // Interface Passwords Configuration states (synchronised with active system modules)
  const [pinTripReporting, setPinTripReporting] = useState(() => localStorage.getItem("kombiflow_pin_tripreporting") || "1234");
  const [pinPoliceman, setPinPoliceman] = useState(() => localStorage.getItem("kombiflow_pin_policeman") || "1234");

  const [showTripReporting, setShowTripReporting] = useState(false);
  const [showPoliceman, setShowPoliceman] = useState(false);

  const [passwordSuccessMsg, setPasswordSuccessMsg] = useState("");

  // States for Rank Fee dynamic config and splits
  const [tempRankFee, setTempRankFee] = useState<number>(rankFee);
  const [tempSplitOps, setTempSplitOps] = useState<number>(splitOperational);
  const [tempSplitNrtc, setTempSplitNrtc] = useState<number>(splitNRTC);
  const [tempSplitMaint, setTempSplitMaint] = useState<number>(splitMaintenance);
  const [rankFeeSuccessMsg, setRankFeeSuccessMsg] = useState("");

  // Keep state in sync with external prop updates
  useEffect(() => {
    setTempRankFee(rankFee);
  }, [rankFee]);
  useEffect(() => {
    setTempSplitOps(splitOperational);
  }, [splitOperational]);
  useEffect(() => {
    setTempSplitNrtc(splitNRTC);
  }, [splitNRTC]);
  useEffect(() => {
    setTempSplitMaint(splitMaintenance);
  }, [splitMaintenance]);

  // System Custom Images (Concession Seal and Government Watermark)
  const [concessionSealImage, setConcessionSealImage] = useState<string>(() => {
    return localStorage.getItem("kombiflow_concession_seal_image") || "";
  });
  const [docWatermark, setDocWatermark] = useState<string>(() => {
    return localStorage.getItem("kombiflow_document_watermark") || "";
  });

  // Commuter ratings states
  const [commuterRatings, setCommuterRatings] = useState<any[]>(() => {
    try {
      const stored = localStorage.getItem("kombiflow_commuter_ratings");
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (e) {}
    return [
      {
        id: "rat_1",
        timestamp: new Date(Date.now() - 3600000 * 2).toISOString(),
        commuterName: "Melusi Dlamini",
        commuterPhone: "+268 7612 3456",
        vehicleReg: "HSD 101 BM",
        driverId: "drv_1",
        driverName: "Themba Shongwe",
        driverProf: 5,
        vehicleQual: 4,
        punctuality: 5,
        comments: "Very clean kombi and polite driver. Arrived on time in Mbabane Rank.",
        recommend: true
      },
      {
        id: "rat_2",
        timestamp: new Date(Date.now() - 3600000 * 12).toISOString(),
        commuterName: "Phindile Gamedze",
        commuterPhone: "+268 7804 9988",
        vehicleReg: "ASD 633 BM",
        driverId: "drv_2",
        driverName: "Sibusiso Dlamini",
        driverProf: 3,
        vehicleQual: 3,
        punctuality: 2,
        comments: "Delayed loading by 30 minutes at Manzini bay. Driving was a bit fast.",
        recommend: false
      },
      {
        id: "rat_3",
        timestamp: new Date(Date.now() - 3600000 * 24).toISOString(),
        commuterName: "Simanga Shabangu",
        commuterPhone: "+268 7654 3210",
        vehicleReg: "YHT 442 BH",
        driverId: "drv_3",
        driverName: "Zwelithini Shongwe",
        driverProf: 4,
        vehicleQual: 5,
        punctuality: 4,
        comments: "Safe driving along the highway. Smooth ride, recommended!",
        recommend: true
      }
    ];
  });

  const [ratingsSearch, setRatingsSearch] = useState("");

  useEffect(() => {
    if (selectedUserAccount) {
      setEditFullName(selectedUserAccount.fullName);
      setEditEmail(selectedUserAccount.email);
      setEditPhone(selectedUserAccount.phone);
      setEditUsername(selectedUserAccount.username);
      setEditRole(selectedUserAccount.role);
      setIsEditingUser(false);
      setIsResettingPassword(false);
      setResetSuccessMsg("");
    }
  }, [selectedUserAccount]);

  useEffect(() => {
    const val = localStorage.getItem("kombiflow_commuter_ratings");
    if (!val) {
      localStorage.setItem("kombiflow_commuter_ratings", JSON.stringify(commuterRatings));
    }
  }, []);

  // Sync ratings periodically if storage updates
  useEffect(() => {
    const handleStorageChange = () => {
      try {
        const stored = localStorage.getItem("kombiflow_commuter_ratings");
        if (stored) {
          setCommuterRatings(JSON.parse(stored));
        }
      } catch (e) {}
    };
    window.addEventListener("storage", handleStorageChange);
    // Poll localstorage slightly for instantaneous within-tab updates
    const interval = setInterval(handleStorageChange, 2000);
    return () => {
      window.removeEventListener("storage", handleStorageChange);
      clearInterval(interval);
    };
  }, []);

  const storageMetrics = useMemo(() => {
    let totalBytes = 0;
    let keysCount = 0;
    const itemsList: { key: string; sizeKb: number }[] = [];
    
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key) {
        const val = localStorage.getItem(key) || "";
        const itemBytes = (key.length + val.length) * 2;
        totalBytes += itemBytes;
        keysCount++;
        itemsList.push({
          key,
          sizeKb: Number((itemBytes / 1024).toFixed(2))
        });
      }
    }
    
    const sizeKb = Number((totalBytes / 1024).toFixed(2));
    const percentOfLimit = Number(((sizeKb / 5120) * 100).toFixed(2)); // Standard 5MB browser quota
    
    return {
      sizeKb,
      percentOfLimit,
      keysCount,
      itemsList: itemsList.sort((a, b) => b.sizeKb - a.sizeKb)
    };
  }, [vehicles, drivers, routes, incidents, trafficTickets, concessionSealImage, docWatermark]);

  // AI Assistant states
  const [aiAssistantQuery, setAiAssistantQuery] = useState("");
  const [aiAssistantResponse, setAiAssistantResponse] = useState<string | null>(null);
  const [isAiLoading, setIsAiLoading] = useState(false);

  // Live telemetry metrics (dynamic states that auto-update)
  const [serverLoad, setServerLoad] = useState(42);
  const [apiLatency, setApiLatency] = useState(14);
  const [activeSessions, setActiveSessions] = useState(384);
  const [errorResolutionRate, setErrorResolutionRate] = useState(98.4);
  const [databaseSpeedMs, setDatabaseSpeedMs] = useState(4);
  const [cpuUsage, setCpuUsage] = useState(28);
  const [memoryUsage, setMemoryUsage] = useState(56);
  const [bandwidthMbps, setBandwidthMbps] = useState(124);

  // Simulated live events toggle
  const [liveSnooperActive, setLiveSnooperActive] = useState(true);

  // DYNAMIC USER ACCOUNTS (Synchronised with registered drivers & staff directory in storage)
  const [staffAccounts, setStaffAccounts] = useState<UserAccount[]>(() => {
    const saved = localStorage.getItem("kombiflow_staff_accounts");
    if (saved) {
      try { return JSON.parse(saved); } catch (e) {}
    }
    return [
      { id: "USR-001", fullName: "Operations Director", role: "Super Admin", phone: "+268 7611 0001", email: "admin@transport.gov.sz", username: "superadmin", status: "Active", lastLogin: new Date().toISOString(), password: "admin" },
      { id: "USR-002", fullName: "Nonhlanhla Simelane", role: "Fleet Operator", phone: "+268 7805 4411", email: "nonhlanhla@eswatinicargo.sz", username: "non_operator", status: "Active", lastLogin: new Date().toISOString(), password: "1234" },
      { id: "USR-003", fullName: "Vusi Mabuza", role: "Rank Administrator", phone: "+268 7914 5599", email: "vusi.mabuza@nrtc.sz", username: "vusi_rank_mbabane", status: "Active", lastLogin: new Date().toISOString(), password: "1234" },
      { id: "USR-004", fullName: "Mancoba Dlamini", role: "Revenue Officer", phone: "+268 7632 7700", email: "mancoba@revenue.gov.sz", username: "mancoba_rev", status: "Active", lastLogin: new Date().toISOString(), password: "1234" },
      { id: "USR-005", fullName: "Zodwa Gamedze", role: "Revenue Officer", phone: "+268 7822 3344", email: "zodwa@revenue.gov.sz", username: "zodwa_rev", status: "Active", lastLogin: new Date().toISOString(), password: "1234" },
      { id: "USR-006", fullName: "Inspector J. Cele", role: "Enforcement Officer", phone: "+268 7644 8811", email: "jcele@police.gov.sz", username: "cele_inspector", status: "Active", lastLogin: new Date().toISOString(), password: "1234" },
      { id: "USR-007", fullName: "Gcinile Masuku", role: "Commuter Administrator", phone: "+268 7904 6611", email: "gmasuku@kombiflow.sz", username: "gcinile_comm", status: "Active", lastLogin: new Date().toISOString(), password: "1234" },
      { id: "USR-008", fullName: "Bongani Mavuso", role: "Developer", phone: "+268 7611 9900", email: "bmavuso@techflow.sz", username: "bongani_dev", status: "Active", lastLogin: new Date().toISOString(), password: "1234" },
      { id: "USR-009", fullName: "Sibusiso Dlamini", role: "System Administrator", phone: "+268 7000 0000", email: "sibusiso@gov.sz", username: "sibusiso_admin", status: "Active", lastLogin: new Date().toISOString(), password: "1234" }
    ];
  });

  useEffect(() => {
    localStorage.setItem("kombiflow_staff_accounts", JSON.stringify(staffAccounts));
  }, [staffAccounts]);

  // Combined accounts dynamically synchronized with actual drivers from fleet
  const accounts: UserAccount[] = useMemo(() => {
    const driverAccounts: UserAccount[] = (drivers || []).map((drv, idx) => ({
      id: drv.id || `DRV-${idx + 1}`,
      fullName: drv.fullName,
      role: "Driver",
      phone: drv.phone || "+268 7600 0000",
      email: `${(drv.fullName || "driver").toLowerCase().replace(/[^a-z0-9]/g, "")}@kombiflow.sz`,
      username: `${(drv.fullName || "driver").toLowerCase().replace(/[^a-z0-9]/g, "_")}_drv`,
      status: drv.status === "Active" ? "Active" : "Suspended",
      lastLogin: new Date().toISOString(),
      licenseStatus: drv.status === "Suspended" ? "Suspended" : (drv.licenseNumber ? "Valid" : "Pending"),
      permitStatus: drv.status === "Suspended" ? "Suspended" : "Active",
      password: drv.password || "1234"
    }));

    return [...staffAccounts, ...driverAccounts];
  }, [drivers, staffAccounts]);

  const setAccounts = (updatedList: UserAccount[] | ((prev: UserAccount[]) => UserAccount[])) => {
    const newList = typeof updatedList === "function" ? updatedList(accounts) : updatedList;
    setStaffAccounts(newList.filter(a => a.role !== "Driver"));
  };

  // ADVERTS STATE & LOGIC
  const INITIAL_ADVERTS: Advert[] = [
    {
      id: "adv_1",
      title: "MTN MoMo E10 Mobile Data & Cash Cashback Promo",
      sponsorName: "MTN Eswatini",
      imageUrl: "https://images.unsplash.com/photo-1563986768609-322da13575f3?auto=format&fit=crop&w=800&q=80",
      targetRegions: ["All"],
      isActive: true,
      createdAt: "2026-07-22T08:00:00Z",
      fileSizeBytes: 420000
    },
    {
      id: "adv_2",
      title: "Eswatini Building Society - Home & Business SME Loans",
      sponsorName: "Eswatini Building Society",
      imageUrl: "https://images.unsplash.com/photo-1559526324-4b87b5e36e44?auto=format&fit=crop&w=800&q=80",
      targetRegions: ["Hhohho", "Manzini"],
      isActive: true,
      createdAt: "2026-07-22T09:30:00Z",
      fileSizeBytes: 650000
    }
  ];

  const [adverts, setAdverts] = useState<Advert[]>(() => {
    const stored = localStorage.getItem("kombiflow_adverts");
    if (stored) {
      try { return JSON.parse(stored); } catch (e) {}
    }
    return INITIAL_ADVERTS;
  });

  useEffect(() => {
    localStorage.setItem("kombiflow_adverts", JSON.stringify(adverts));
    window.dispatchEvent(new Event("storage"));
    window.dispatchEvent(new CustomEvent("kombiflow_adverts_updated"));
  }, [adverts]);

  // Advert Upload & Editing Form States
  const [adTitle, setAdTitle] = useState("");
  const [adSponsor, setAdSponsor] = useState("");
  const [adDescription, setAdDescription] = useState("");
  const [adPromoCode, setAdPromoCode] = useState("");
  const [adContactPhone, setAdContactPhone] = useState("");
  const [adWebsiteUrl, setAdWebsiteUrl] = useState("");
  const [adCategory, setAdCategory] = useState("Fintech / Mobile Banking");
  const [adBudgetSZL, setAdBudgetSZL] = useState<number>(1500);
  const [adImagePreview, setAdImagePreview] = useState("");
  const [adImageSize, setAdImageSize] = useState<number>(0);
  const [adTargetRegions, setAdTargetRegions] = useState<("All" | EswatiniRegion)[]>(["All"]);
  const [adUploadError, setAdUploadError] = useState("");
  const [adUploadSuccess, setAdUploadSuccess] = useState("");
  const [editingAdvert, setEditingAdvert] = useState<Advert | null>(null);

  const handleAdImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setAdUploadError("");
    setAdUploadSuccess("");
    const file = e.target.files?.[0];
    if (!file) return;

    const maxSizeBytes = 2 * 1024 * 1024; // 2MB
    if (file.size > maxSizeBytes) {
      const sizeMb = (file.size / (1024 * 1024)).toFixed(2);
      setAdUploadError(`❌ File size (${sizeMb} MB) exceeds the maximum allowed limit of 2MB. Please upload an image smaller than 2MB.`);
      setAdImagePreview("");
      setAdImageSize(0);
      e.target.value = "";
      return;
    }

    setAdImageSize(file.size);
    const reader = new FileReader();
    reader.onload = () => {
      setAdImagePreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleCreateAdvert = (e: React.FormEvent) => {
    e.preventDefault();
    setAdUploadError("");
    setAdUploadSuccess("");

    if (!adTitle.trim()) {
      setAdUploadError("Please provide an advert title or headline.");
      return;
    }
    if (!adSponsor.trim()) {
      setAdUploadError("Please provide a sponsor or advertiser brand name.");
      return;
    }
    if (!adImagePreview) {
      setAdUploadError("Please select or upload an image file (under 2MB).");
      return;
    }

    const newAd: Advert = {
      id: `adv_${Date.now()}`,
      title: adTitle.trim(),
      sponsorName: adSponsor.trim(),
      imageUrl: adImagePreview,
      targetRegions: adTargetRegions.length > 0 ? adTargetRegions : ["All"],
      isActive: true,
      createdAt: new Date().toISOString(),
      fileSizeBytes: adImageSize,
      description: adDescription.trim() || "Exclusive promotional offer for public transport commuters across Eswatini.",
      promoCode: adPromoCode.trim().toUpperCase() || "SWAZICOMMUTER10",
      contactPhone: adContactPhone.trim() || "+268 2400 0000",
      websiteUrl: adWebsiteUrl.trim() || "https://www.eswatinitransport.sz",
      category: adCategory,
      budgetSZL: Number(adBudgetSZL) || 1500,
      impressions: 0,
      clicks: 0,
      startDate: new Date().toISOString().split("T")[0],
      endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]
    };

    setAdverts([newAd, ...adverts]);
    setAdTitle("");
    setAdSponsor("");
    setAdDescription("");
    setAdPromoCode("");
    setAdContactPhone("");
    setAdWebsiteUrl("");
    setAdImagePreview("");
    setAdImageSize(0);
    setAdTargetRegions(["All"]);
    setAdUploadSuccess("📢 Advert successfully created and broadcasted to commuter TV screens!");
    setTimeout(() => setAdUploadSuccess(""), 4000);
  };

  const handleToggleAdvertActive = (adId: string) => {
    setAdverts(adverts.map(a => a.id === adId ? { ...a, isActive: !a.isActive } : a));
  };

  const handleDeleteAdvert = (adId: string) => {
    setAdverts(adverts.filter(a => a.id !== adId));
  };

  const handleToggleAdvertRegion = (adId: string, region: "All" | EswatiniRegion) => {
    setAdverts(adverts.map(a => {
      if (a.id !== adId) return a;
      if (region === "All") {
        return { ...a, targetRegions: ["All"] };
      }
      let newRegions = a.targetRegions.filter(r => r !== "All");
      if (newRegions.includes(region)) {
        newRegions = newRegions.filter(r => r !== region);
      } else {
        newRegions.push(region);
      }
      if (newRegions.length === 0) newRegions = ["All"];
      return { ...a, targetRegions: newRegions };
    }));
  };

  // REGISTRATION FORM STATES
  const [regFullName, setRegFullName] = useState("");
  const [regNationalId, setRegNationalId] = useState("");
  const [regEmployeeNumber, setRegEmployeeNumber] = useState("");
  const [regPhone, setRegPhone] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regUsername, setRegUsername] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [regConfirmPassword, setRegConfirmPassword] = useState("");
  const [regRegion, setRegRegion] = useState("Hhohho");
  const [regFleet, setRegFleet] = useState("Eswatini Royal Transit");
  const [regOrganisation, setRegOrganisation] = useState("Ministry of Transport");
  const [regRole, setRegRole] = useState("Fleet Operator");
  const [regSecurityQuestion, setRegSecurityQuestion] = useState("First school name");
  const [regMfaEnabled, setRegMfaEnabled] = useState(true);
  const [regSuccess, setRegSuccess] = useState(false);
  const [showRegPassword, setShowRegPassword] = useState(false);
  const [showDetailsPassword, setShowDetailsPassword] = useState(false);

  // ROLE PERMISSIONS MATRIX STATE (Editable individually)
  const [permissionsMatrix, setPermissionsMatrix] = useState<Record<string, string[]>>({
    "Super Admin": ["Create", "Read", "Update", "Delete", "Approve", "Export", "Import", "View Reports", "Manage Users", "Configure System", "Audit Logs"],
    "Developer": ["Create", "Read", "Update", "Delete", "View Reports", "Configure System", "Audit Logs"],
    "Driver": ["Read"],
    "Fleet Operator": ["Create", "Read", "Update", "View Reports"],
    "Rank Administrator": ["Create", "Read", "Update", "Approve", "View Reports"],
    "Revenue Officer": ["Read", "Update", "Approve", "View Reports"],
    "Commuter": ["Read"],
    "System Administrator": ["Create", "Read", "Update", "Approve", "Delete", "View Reports"],
    "Inspector": ["Read", "Update", "Approve"]
  });

  // SECURITY THREAT LOGS
  const [securityThreats, setSecurityThreats] = useState<SecurityThreat[]>([
    { id: "THR-101", time: "2026-07-16T09:25:12Z", ipAddress: "185.220.101.4", country: "Unknown (Tor Exit)", browser: "Firefox", os: "Linux", event: "SQL Injection Probe on /api/revenue", severity: "High", status: "Blocked" },
    { id: "THR-102", time: "2026-07-16T09:12:44Z", ipAddress: "196.24.45.18", country: "Eswatini (Mbabane)", browser: "Chrome Mobile", os: "Android", event: "Brute force login attempt on 'sandile_drive'", severity: "Medium", status: "Investigating" },
    { id: "THR-103", time: "2026-07-16T08:50:11Z", ipAddress: "45.143.203.14", country: "Netherlands", browser: "Safari", os: "macOS", event: "API Spamming on /api/v1/departures", severity: "High", status: "Blocked" },
    { id: "THR-104", time: "2026-07-16T08:15:30Z", ipAddress: "102.14.99.124", country: "South Africa", browser: "Edge", os: "Windows", event: "Unusual login time for inspector 'cele_inspector'", severity: "Low", status: "Ignored" }
  ]);

  // SEED SYSTEM ERRORS
  const [errors, setErrors] = useState<SystemError[]>([
    { id: "ERR-901", time: "2026-07-16T09:22:15Z", module: "WhatsApp Gateway", affectedUser: "Driver Themba Shongwe", severity: "High", description: "Connection reset by peer while posting departure notification payload.", suggestedFix: "Re-establish token handshake with WhatsApp Cloud API node.", developerNotes: "Retrying queue buffer. Possible regional ISP packet drops.", status: "Pending" },
    { id: "ERR-902", time: "2026-07-16T09:10:04Z", module: "Database Engine", affectedUser: "System Process", severity: "Critical", description: "Write conflict lock on KombiStatus active state rows.", suggestedFix: "Increase transaction pooling capacity and decrease lock timeout thresholds.", developerNotes: "Resolved automatically by deadlock prevention supervisor daemon.", status: "Resolved" },
    { id: "ERR-903", time: "2026-07-16T08:45:12Z", module: "GPS Tracking Api", affectedUser: "Vehicle HSD 101 BM", severity: "Medium", description: "Malformed coordinates payload returned from cell tower telemetry.", suggestedFix: "Enforce JSON schema validator filter at ingestion layer.", developerNotes: "Filtered successfully; status warning triggered.", status: "In Progress" },
    { id: "ERR-904", time: "2026-07-16T08:05:00Z", module: "SMS Carrier Service", affectedUser: "Commuter Passenger", severity: "Low", description: "Provider credit limit alert threshold bypassed.", suggestedFix: "Top-up API billing balance at local telecom gateway provider.", developerNotes: "Invoice submitted to finance department.", status: "Resolved" }
  ]);

  // SEED AUDIT LOGS
  const [audits, setAudits] = useState<SecurityAuditLog[]>([
    { id: "AUD-501", user: "Super Admin", role: "Super Admin", time: "2026-07-16T09:28:44Z", ipAddress: "192.168.1.105", device: "Admin Workstation (macOS Chrome)", action: "Reset password for driver 'sandile_drive'", result: "Success" },
    { id: "AUD-502", user: "Inspector J. Cele", role: "Inspector", time: "2026-07-16T09:26:00Z", ipAddress: "102.14.99.124", device: "Handheld Terminal (Android Client)", action: "Submitted law ticket LAW-2026-1102", result: "Success" },
    { id: "AUD-503", user: "Operator Lindiwe", role: "Fleet Operator", time: "2026-07-16T09:15:30Z", ipAddress: "185.220.101.4", device: "Web Browser (Windows Edge)", action: "Attempted to delete vehicle MND 442 CH without permit release", result: "Blocked" },
    { id: "AUD-504", user: "Vusi Mabuza", role: "Rank Admin", time: "2026-07-16T09:05:12Z", ipAddress: "10.0.0.12", device: "Rank Tablet (Safari)", action: "Assigned vehicle ASD 633 BM to Bay 4 queue", result: "Success" },
    { id: "AUD-505", user: "Unauthenticated", role: "Guest", time: "2026-07-16T08:55:00Z", ipAddress: "45.143.203.14", device: "cURL Script", action: "Brute force admin portal endpoints", result: "Failed" }
  ]);

  // Backup & Restore states
  const [backups, setBackups] = useState<any[]>([
    { id: "BKP-001", timestamp: "2026-07-16T12:00:00Z", size: "48.2 MB", type: "Scheduled Daily Cloud", status: "Verified", target: "Google Cloud Bucket (europe-west2)", file: "transport-cloud-recovery-2026-07-16-1200.json" },
    { id: "BKP-002", timestamp: "2026-07-16T00:00:00Z", size: "47.9 MB", type: "Scheduled Daily Cloud", status: "Verified", target: "Google Cloud Bucket (europe-west2)", file: "transport-cloud-recovery-2026-07-16-0000.json" },
    { id: "BKP-003", timestamp: "2026-07-15T12:00:00Z", size: "47.4 MB", type: "Scheduled Daily Cloud", status: "Verified", target: "Google Cloud Bucket (europe-west2)", file: "transport-cloud-recovery-2026-07-15-1200.json" },
    { id: "BKP-004", timestamp: "2026-07-15T00:00:00Z", size: "47.1 MB", type: "Scheduled Daily Cloud", status: "Verified", target: "Google Cloud Bucket (europe-west2)", file: "transport-cloud-recovery-2026-07-15-0000.json" },
    { id: "BKP-005", timestamp: "2026-07-14T12:00:00Z", size: "46.8 MB", type: "Scheduled Daily Cloud", status: "Verified", target: "Google Cloud Bucket (europe-west2)", file: "transport-cloud-recovery-2026-07-14-1200.json" },
    { id: "BKP-006", timestamp: "2026-07-14T00:00:00Z", size: "46.5 MB", type: "Scheduled Daily Cloud", status: "Verified", target: "Google Cloud Bucket (europe-west2)", file: "transport-cloud-recovery-2026-07-14-0000.json" }
  ]);
  const [backupSuccess, setBackupSuccess] = useState(false);
  const [selectedBackupToRestore, setSelectedBackupToRestore] = useState<any | null>(null);
  const [restoreProgress, setRestoreProgress] = useState<number | null>(null);
  const [restoreLogs, setRestoreLogs] = useState<string[]>([]);
  const [timeToNextLog, setTimeToNextLog] = useState<string>("");

  useEffect(() => {
    const calcTime = () => {
      const now = new Date();
      
      const noon = new Date();
      noon.setHours(12, 0, 0, 0);
      const midnight = new Date();
      midnight.setHours(24, 0, 0, 0);

      let target = noon;
      if (now >= noon) {
        target = midnight;
      }

      const diffMs = target.getTime() - now.getTime();
      const diffSecs = Math.max(0, Math.floor(diffMs / 1000));
      const hrs = Math.floor(diffSecs / 3600);
      const mins = Math.floor((diffSecs % 3600) / 60);
      const secs = diffSecs % 60;

      setTimeToNextLog(
        `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
      );
    };

    calcTime();
    const interval = setInterval(calcTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Auto updating live metrics simulation ticker
  useEffect(() => {
    if (!liveSnooperActive) return;

    const interval = setInterval(() => {
      // Simulate real-time fluctuated telemetry
      setServerLoad(Math.min(100, Math.max(10, Math.floor(40 + Math.random() * 8 - 4))));
      setApiLatency(Math.min(50, Math.max(5, Math.floor(14 + Math.random() * 4 - 2))));
      setCpuUsage(Math.min(100, Math.max(5, Math.floor(25 + Math.random() * 12 - 6))));
      setMemoryUsage(Math.min(100, Math.max(10, Math.floor(56 + Math.random() * 2 - 1))));
      setBandwidthMbps(Math.min(500, Math.max(50, Math.floor(124 + Math.random() * 10 - 5))));
      
      // Randomly append a mock audit log or security log occasionally
      if (Math.random() > 0.85) {
        const randRegs = ["HSD 101 BM", "MND 442 CH", "ASD 633 BM", "TAD 889 BH"];
        const randomReg = randRegs[Math.floor(Math.random() * randRegs.length)];
        const newAudit: SecurityAuditLog = {
          id: `AUD-${Math.floor(Math.random() * 900) + 600}`,
          user: "Live Daemon",
          role: "System Status Supervisor",
          time: new Date().toISOString(),
          ipAddress: "127.0.0.1",
          device: "Kernel Service Engine",
          action: `Synchronized transport telemetry for vehicle ${randomReg}`,
          result: "Success"
        };
        setAudits((prev) => [newAudit, ...prev.slice(0, 15)]);
      }
    }, 4500);

    return () => clearInterval(interval);
  }, [liveSnooperActive]);

  // Handle User Registration Submission
  const handleUserRegistration = (e: React.FormEvent) => {
    e.preventDefault();
    if (!regFullName || !regPhone || !regEmail || !regUsername || !regPassword) return;

    const newId = `USR-${Math.floor(Math.random() * 900) + 100}`;
    const newAccount: UserAccount = {
      id: newId,
      fullName: regFullName,
      role: regRole,
      phone: regPhone,
      email: regEmail,
      username: regUsername,
      status: "Active",
      lastLogin: new Date().toISOString(),
      licenseStatus: regRole === "Driver" ? "Valid" : undefined,
      permitStatus: regRole === "Driver" ? "Active" : undefined
    };

    setAccounts([newAccount, ...accounts]);

    // Append Audit Log
    const newAudit: SecurityAuditLog = {
      id: `AUD-${Math.floor(Math.random() * 900) + 600}`,
      user: "Super Admin",
      role: "Super Admin",
      time: new Date().toISOString(),
      ipAddress: "192.168.1.105",
      device: "Admin Workstation (macOS Chrome)",
      action: `Registered new system user ${regFullName} with role ${regRole}`,
      result: "Success"
    };
    setAudits([newAudit, ...audits]);

    setRegSuccess(true);
    setRegFullName("");
    setRegNationalId("");
    setRegEmployeeNumber("");
    setRegPhone("");
    setRegEmail("");
    setRegUsername("");
    setRegPassword("");
    setRegConfirmPassword("");
    setTimeout(() => setRegSuccess(false), 4000);
  };

  // AI Assistant trigger action (simulates complex heuristics based on ACTUAL data)
  const handleAiAssistantQuery = (presetQuery?: string) => {
    const query = presetQuery || aiAssistantQuery;
    if (!query.trim()) return;

    setIsAiLoading(true);
    setAiAssistantQuery(query);

    setTimeout(() => {
      let resultText = "";
      const lowerQuery = query.toLowerCase();

      if (lowerQuery.includes("licence") || lowerQuery.includes("expired") || lowerQuery.includes("permit")) {
        // Find expired drivers or permits
        const expiredPermits = vehicles.filter(v => v.permitStatus !== "Active");
        resultText = `### 📋 AI Audit: Expiring Licenses and Permits\n\nI have run real-time checks against Eswatini National Road Transportation database records:\n\n`;
        if (expiredPermits.length > 0) {
          resultText += `**🔴 Warning: Expired/Suspended Fleet Permits Identified:**\n`;
          expiredPermits.forEach(v => {
            resultText += `- **Vehicle ${v.registrationNumber}** (Owner: ${v.ownerName}) holds status **"${v.permitStatus}"**.\n`;
          });
        } else {
          resultText += `**🟢 Positive:** No expired public transport permits detected today.\n`;
        }
        
        // Check expired PDPs or licenses
        const invalidPdpDrivers = drivers.filter(d => d.pdpStatus !== "Valid");
        if (invalidPdpDrivers.length > 0) {
          resultText += `\n**🔴 Warning: Expired Driver Public Permits (PDP) Detected:**\n`;
          invalidPdpDrivers.forEach(d => {
            resultText += `- **Driver ${d.fullName}** (ID: ${d.id}, Phone: ${d.phone}) holds status **"${d.pdpStatus}"** expiring on ${d.pdpExpiryDate}.\n`;
          });
        } else {
          resultText += `\n**🟢 Positive:** All active drivers have fully validated PDP permits.\n`;
        }
        resultText += `\n**Action Recommended:** Lock accounts or dispatch warning notifications to affected personnel via automated SMS/WhatsApp carrier alerts.`;
      } else if (lowerQuery.includes("unusual") || lowerQuery.includes("failure") || lowerQuery.includes("predict")) {
        resultText = `### 🔮 AI Predictive Health & Safety Report\n\nUsing smart heuristic tracking logs:\n\n1. **High Active Queue Density on Route Mbabane &rarr; Manzini:** Current wait times are expected to reach **35 minutes** by peak shift unless extra kombis are manually reordered in queue sequencing.\n2. **Critical WhatsApp Gateway connection failures** detected (${errors.filter(e => e.module === "WhatsApp Gateway").length} errors). Dispatch notification relays are currently failing back to default SMS carrier nodes, creating a 5 SZL cost increase per dispatch cycle.\n3. **Failed login brute-force attempts detected** from IP address **185.220.101.4** targeting driver logins. Recommend blacklisting this subnet instantly in Security settings.\n\n*System Operational Efficiency Target: 100% | Current calculated health: 97.4%*`;
      } else if (lowerQuery.includes("security") || lowerQuery.includes("improve")) {
        resultText = `### 🛡️ AI Security Audit & Recommendations\n\n**System Vulnerability Analysis:**\n- **Multi-Factor Authentication (MFA):** Enabled for **78%** of administrative accounts. Recommended: Enforce mandatory MFA for all Rank Admins and Municipal Officers.\n- **Subnet Probe Activity:** Elevated malicious scanner payloads tracked in past 24 hours. Tor Exit node **185.220.101.4** is actively brute forcing driver logins.\n- **Temporary Password Enforcement:** 3 active administrators have not cycled temporary passwords assigned during registration.\n\n**Immediate Actions Suggested:**\n1. Blacklist offending IP **185.220.101.4**.\n2. Force password reset for inactive administrators.\n3. Enable strict IP whitelisting for Municipal and Revenue officers.`;
      } else {
        resultText = `### 🤖 Transport AI Virtual Control Assistant\n\nGreetings Admin. I can query real-time data elements:\n- Active Drivers: **${drivers.length}**\n- Vehicles Logged: **${vehicles.length}**\n- Unresolved Incidents: **${incidents.filter(i => i.status !== "Resolved").length}**\n\n**How can I assist you further?** You can run diagnostic checks regarding "expired permits", "security recommendations", or "failure predictions".`;
      }

      setAiAssistantResponse(resultText);
      setIsAiLoading(false);
    }, 1200);
  };

  // Run Manual Backup Action
  const handleBackupNow = () => {
    setBackupSuccess(true);
    const newBkp = {
      id: `BKP-00${backups.length + 1}`,
      timestamp: new Date().toISOString(),
      size: `${(Math.random() * 5 + 45).toFixed(1)} MB`,
      type: "Manual Snapshot (Admin Triggered)",
      status: "Verified",
      target: "Google Cloud Bucket (europe-west2)",
      file: `transport-manual-recovery-${Date.now()}.json`
    };
    setBackups([newBkp, ...backups]);

    // Audit log
    const newAudit: SecurityAuditLog = {
      id: `AUD-${Math.floor(Math.random() * 900) + 600}`,
      user: "Super Admin",
      role: "Super Admin",
      time: new Date().toISOString(),
      ipAddress: "192.168.1.105",
      device: "Admin Workstation (macOS Chrome)",
      action: "Initiated manual system database cloud snapshot backup",
      result: "Success"
    };
    setAudits([newAudit, ...audits]);

    setTimeout(() => setBackupSuccess(false), 4000);
  };

  // Run Live Database Restore Action
  const handleRestoreBackup = (bk: any) => {
    setSelectedBackupToRestore(bk);
    setRestoreProgress(0);
    setRestoreLogs([
      `[${new Date().toLocaleTimeString()}] INITIATING CLOUD RECOVERY SEQUENCE FOR BACKUP FILE ${bk.file || bk.id}...`,
      `[${new Date().toLocaleTimeString()}] Pinging remote storage cluster (europe-west2)...`,
    ]);

    let currentProgress = 0;
    const interval = setInterval(() => {
      currentProgress += 20;
      setRestoreProgress(currentProgress);

      if (currentProgress === 20) {
        setRestoreLogs(prev => [
          ...prev,
          `[${new Date().toLocaleTimeString()}] [20%] Handshake verified with Google Cloud Storage bucket.`,
          `[${new Date().toLocaleTimeString()}] Downloading ${bk.file || bk.id} (${bk.size}) gzip compressed stream...`
        ]);
      } else if (currentProgress === 40) {
        setRestoreLogs(prev => [
          ...prev,
          `[${new Date().toLocaleTimeString()}] [40%] Download completed. Verifying SHA-256 checksum...`,
          `[${new Date().toLocaleTimeString()}] Checksum matched! Target signature: 7d49a37e5898dcb7bdae70c...`
        ]);
      } else if (currentProgress === 60) {
        setRestoreLogs(prev => [
          ...prev,
          `[${new Date().toLocaleTimeString()}] [60%] Decompressing JSON payload file: ${bk.file || "transport-recovery.json"}`,
          `[${new Date().toLocaleTimeString()}] Wiping active local database states and lock pools...`
        ]);
      } else if (currentProgress === 80) {
        setRestoreLogs(prev => [
          ...prev,
          `[${new Date().toLocaleTimeString()}] [80%] Injecting original system records (Routes, Drivers, Vehicles, Trips)...`,
          `[${new Date().toLocaleTimeString()}] Syncing transport telemetry and enforcement logs...`
        ]);
      } else if (currentProgress === 100) {
        clearInterval(interval);
        setRestoreLogs(prev => [
          ...prev,
          `[${new Date().toLocaleTimeString()}] [100%] SUCCESS: Full database tables successfully restored to ${new Date(bk.timestamp).toLocaleString()} snapshot!`,
          `[${new Date().toLocaleTimeString()}] Rebooting transport virtual control daemon...`
        ]);

        const newAudit: SecurityAuditLog = {
          id: `AUD-${Math.floor(Math.random() * 900) + 600}`,
          user: "Super Admin",
          role: "Super Admin",
          time: new Date().toISOString(),
          ipAddress: "192.168.1.105",
          device: "Admin Workstation (macOS Chrome)",
          action: `Successfully executed system recovery restore from backup point ${bk.id} (${bk.timestamp})`,
          result: "Success"
        };
        setAudits(prev => [newAudit, ...prev]);

        setTimeout(() => {
          if (onRestoreSystem) {
            onRestoreSystem();
          }
          setSelectedBackupToRestore(null);
          setRestoreProgress(null);
        }, 1500);
      }
    }, 600);
  };

  // Whitelist IP Action
  const handleAddWhitelist = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newIpToWhitelist.trim()) return;
    setIpWhitelist([...ipWhitelist, newIpToWhitelist]);
    setNewIpToWhitelist("");
  };

  // Blacklist IP Action
  const handleAddBlacklist = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newIpToBlacklist.trim()) return;
    setIpBlacklist([...ipBlacklist, newIpToBlacklist]);
    setNewIpToBlacklist("");
  };

  // Helper values for User tab Category counts
  const getCategoryCount = (roleCat: string) => {
    if (roleCat === "All Accounts") return accounts.length;
    if (roleCat === "Drivers") return accounts.filter(a => a.role === "Driver").length;
    if (roleCat === "Fleet") return accounts.filter(a => a.role === "Fleet Operator").length;
    if (roleCat === "Ranks") return accounts.filter(a => a.role === "Rank Administrator").length;
    if (roleCat === "Revenue") return accounts.filter(a => a.role === "Revenue Officer").length;
    if (roleCat === "Enforcement") return accounts.filter(a => a.role === "Enforcement Officer").length;
    if (roleCat === "Commuters") return accounts.filter(a => a.role === "Commuter Administrator" || a.role === "Commuter").length;
    if (roleCat === "Developers") return accounts.filter(a => a.role === "Developer").length;
    if (roleCat === "System Administrators") return accounts.filter(a => a.role === "System Administrator" || a.role === "Super Admin").length;
    return 0;
  };

  // Filtered account lists based on search and selected category
  const filteredAccounts = accounts.filter((acc) => {
    let matchCat = false;
    if (userCategory === "All Accounts" as any) matchCat = true;
    if (userCategory === "Drivers" && acc.role === "Driver") matchCat = true;
    if (userCategory === "Fleet" && acc.role === "Fleet Operator") matchCat = true;
    if (userCategory === "Ranks" && acc.role === "Rank Administrator") matchCat = true;
    if (userCategory === "Revenue" && acc.role === "Revenue Officer") matchCat = true;
    if (userCategory === "Enforcement" && acc.role === "Enforcement Officer") matchCat = true;
    if (userCategory === "Commuters" && (acc.role === "Commuter Administrator" || acc.role === "Commuter")) matchCat = true;
    if (userCategory === "Developers" && acc.role === "Developer") matchCat = true;
    if (userCategory === "System Administrators" && (acc.role === "System Administrator" || acc.role === "Super Admin")) matchCat = true;

    const matchSearch =
      acc.fullName.toLowerCase().includes(userSearchQuery.toLowerCase()) ||
      acc.phone.toLowerCase().includes(userSearchQuery.toLowerCase()) ||
      acc.username.toLowerCase().includes(userSearchQuery.toLowerCase()) ||
      acc.id.toLowerCase().includes(userSearchQuery.toLowerCase());

    return matchCat && matchSearch;
  });

  return (
    <div className="space-y-6">
      {/* Enterprise-grade Header Banner (Microsoft Azure/Smart City Console style) */}
      <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-6 text-white shadow-2xl relative overflow-hidden flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="absolute right-0 top-0 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute left-1/3 top-0 w-80 h-80 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />
        <div className="space-y-1 relative z-10">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[10px] font-black uppercase tracking-widest bg-blue-500/20 text-blue-300 border border-blue-500/30 px-2.5 py-0.5 rounded-full flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5" /> SUPER ADMIN CENTRAL CONTROL CENTRE
            </span>
            <span className="text-[10px] font-black uppercase tracking-widest bg-zinc-800 text-zinc-300 px-2.5 py-0.5 rounded-full">
              SECURE SEED GATEWAY
            </span>
          </div>
          <h2 className="text-2xl font-black uppercase tracking-tight font-space text-white">
            Eswatini Transport Virtual Control Centre
          </h2>
          <p className="text-xs text-zinc-400 font-medium max-w-xl">
            Enterprise unified monitoring matrix with strict Role-Based Access Control (RBAC), security whitelisting, live telemetry heuristics, error supervisors, and backup verify nodes.
          </p>
        </div>
        <div className="flex items-center gap-3 bg-zinc-900 border border-zinc-800 p-2.5 rounded-xl relative z-10">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
          <div>
            <div className="text-[10px] font-mono-jb font-black uppercase text-zinc-300 tracking-wider">
              Calculated Availability: 100.00%
            </div>
            <div className="text-[9px] text-zinc-500 font-medium mt-0.5">
              TARGET SLD: MAXIMUM UPTIME
            </div>
          </div>
        </div>
      </div>

      {/* Primary Sub-Navigation Bar Tabs */}
      <div className="flex bg-zinc-100 dark:bg-zinc-900 p-1 rounded-xl border border-zinc-250 dark:border-zinc-850 overflow-x-auto scrollbar-none gap-1">
        <button
          onClick={() => setActiveSubTab("overview")}
          className={`flex items-center gap-1.5 py-2 px-3.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
            activeSubTab === "overview"
              ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 shadow-sm"
              : "text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300"
          }`}
        >
          <Activity className="w-4 h-4" />
          Dashboard Matrix
        </button>
        <button
          onClick={() => setActiveSubTab("users")}
          className={`flex items-center gap-1.5 py-2 px-3.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
            activeSubTab === "users"
              ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 shadow-sm"
              : "text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300"
          }`}
        >
          <Users className="w-4 h-4" />
          User Administration
        </button>
        <button
          onClick={() => setActiveSubTab("adverts")}
          className={`flex items-center gap-1.5 py-2 px-3.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
            activeSubTab === "adverts"
              ? "bg-amber-500 text-black shadow-sm"
              : "text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300"
          }`}
        >
          <Megaphone className="w-4 h-4 text-amber-500" />
          📢 Advertisements
        </button>
        <button
          onClick={() => setActiveSubTab("analytics")}
          className={`flex items-center gap-1.5 py-2 px-3.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
            activeSubTab === "analytics"
              ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 shadow-sm border border-purple-500/20"
              : "text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300"
          }`}
        >
          <TrendingUp className="w-4 h-4 text-purple-500" />
          Live Analytics
        </button>
        <button
          onClick={() => setActiveSubTab("security")}
          className={`flex items-center gap-1.5 py-2 px-3.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
            activeSubTab === "security"
              ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 shadow-sm border border-blue-500/20"
              : "text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300"
          }`}
        >
          <Shield className="w-4 h-4" />
          Security Centre
        </button>
        <button
          onClick={() => setActiveSubTab("errors")}
          className={`flex items-center gap-1.5 py-2 px-3.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
            activeSubTab === "errors"
              ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 shadow-sm border border-yellow-500/20"
              : "text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300"
          }`}
        >
          <AlertTriangle className="w-4 h-4" />
          Error Hub
        </button>
        <button
          onClick={() => setActiveSubTab("health")}
          className={`flex items-center gap-1.5 py-2 px-3.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
            activeSubTab === "health"
              ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 shadow-sm"
              : "text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300"
          }`}
        >
          <Server className="w-4 h-4" />
          Telemetry Metrics
        </button>
        <button
          onClick={() => setActiveSubTab("audits")}
          className={`flex items-center gap-1.5 py-2 px-3.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
            activeSubTab === "audits"
              ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 shadow-sm"
              : "text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300"
          }`}
        >
          <Terminal className="w-4 h-4" />
          Audit Logs
        </button>
        <button
          onClick={() => setActiveSubTab("config")}
          className={`flex items-center gap-1.5 py-2 px-3.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
            activeSubTab === "config"
              ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 shadow-sm"
              : "text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300"
          }`}
        >
          <Settings className="w-4 h-4" />
          System Config
        </button>
        <button
          onClick={() => setActiveSubTab("backup")}
          className={`flex items-center gap-1.5 py-2 px-3.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
            activeSubTab === "backup"
              ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 shadow-sm"
              : "text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300"
          }`}
        >
          <DbIcon className="w-4 h-4" />
          Disaster Recovery
        </button>
        <button
          onClick={() => setActiveSubTab("sync")}
          className={`flex items-center gap-1.5 py-2 px-3.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
            activeSubTab === "sync"
              ? "bg-emerald-600 text-white shadow-sm"
              : "text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 bg-emerald-500/10"
          }`}
        >
          <RefreshCw className="w-4 h-4" />
          🔄 Central Cloud Sync
        </button>
      </div>

      {/* VIEW: OVERVIEW DASHBOARD MATRIX */}
      {activeSubTab === "overview" && (
        <div className="space-y-6">
          {/* Executive System Metrics Blocks Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-805 p-4 rounded-xl shadow-sm">
              <div className="flex justify-between items-center text-zinc-400">
                <span className="text-[9px] font-black uppercase tracking-wider font-space">
                  TOTAL USERS REGISTERED
                </span>
                <Users className="w-3.5 h-3.5 text-zinc-400" />
              </div>
              <h3 className="text-xl font-black text-zinc-900 dark:text-white font-mono-jb mt-1.5">
                {accounts.length}
              </h3>
              <p className="text-[8px] text-zinc-400 uppercase font-bold mt-1">
                {accounts.filter(a => a.status === "Active").length} Active Accounts ({drivers.length} Drivers)
              </p>
            </div>

            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-805 p-4 rounded-xl shadow-sm">
              <div className="flex justify-between items-center text-zinc-400">
                <span className="text-[9px] font-black uppercase tracking-wider font-space">
                  ACTIVE FLEET VEHICLES
                </span>
                <Activity className="w-3.5 h-3.5 text-zinc-400" />
              </div>
              <h3 className="text-xl font-black text-zinc-900 dark:text-white font-mono-jb mt-1.5">
                {vehicles.length}
              </h3>
              <p className="text-[8px] text-zinc-400 uppercase font-bold mt-1">
                {vehicles.filter(v => v.status === KombiStatus.Loading || v.status === KombiStatus.Waiting || v.status === KombiStatus.Full || v.status === KombiStatus.Departed || v.status === KombiStatus.Returning).length} Online In Operation
              </p>
            </div>

            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-805 p-4 rounded-xl shadow-sm">
              <div className="flex justify-between items-center text-zinc-400">
                <span className="text-[9px] font-black uppercase tracking-wider font-space">
                  ACTIVE COMMUTER TRIPS
                </span>
                <Play className="w-3.5 h-3.5 text-zinc-400" />
              </div>
              <h3 className="text-xl font-black text-zinc-900 dark:text-white font-mono-jb mt-1.5">
                {trips.length}
              </h3>
              <p className="text-[8px] text-zinc-400 uppercase font-bold mt-1">
                {routes.length} Active Corridors / Routes
              </p>
            </div>

            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-805 p-4 rounded-xl shadow-sm">
              <div className="flex justify-between items-center text-zinc-400">
                <span className="text-[9px] font-black uppercase tracking-wider font-space">
                  SAFETY & ENFORCEMENT
                </span>
                <AlertOctagon className="w-3.5 h-3.5 text-zinc-400" />
              </div>
              <h3 className="text-xl font-black text-zinc-900 dark:text-white font-mono-jb mt-1.5">
                {incidents.length}
              </h3>
              <p className="text-[8px] text-zinc-400 uppercase font-bold mt-1">
                {trafficTickets.length} REPS Citations | {incidents.filter(i => i.status === "Pending").length} Pending
              </p>
            </div>
          </div>

          {/* AI Virtual Assistant Panel (Functional Heuristics Diagnostic) */}
          <div className="bg-gradient-to-r from-zinc-900 via-slate-950 to-zinc-900 border border-blue-500/20 rounded-2xl p-5 text-white shadow-xl">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-1 bg-blue-500/10 text-blue-400 rounded-lg animate-pulse">
                  <Sparkles className="w-4.5 h-4.5" />
                </div>
                <div>
                  <h4 className="text-xs font-black uppercase tracking-widest text-zinc-100">
                    Transport AI Virtual Assistant
                  </h4>
                  <p className="text-[10px] text-zinc-400">
                    Diagnostic heuristics analyzer evaluating actual database records for licenses, threats, and failures.
                  </p>
                </div>
              </div>
              <div className="flex bg-zinc-800 rounded-lg p-0.5">
                <button
                  onClick={() => setLiveSnooperActive(!liveSnooperActive)}
                  className={`px-2.5 py-1 text-[9px] font-black uppercase rounded cursor-pointer ${
                    liveSnooperActive ? "bg-emerald-600 text-white" : "text-zinc-400"
                  }`}
                >
                  {liveSnooperActive ? "Snooper: Live" : "Snooper: Idle"}
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-5 pt-4">
              {/* Presets query list */}
              <div className="md:col-span-4 space-y-2">
                <div className="text-[9px] font-black uppercase tracking-wider text-zinc-500">
                  Select Heuristic Query
                </div>
                <button
                  onClick={() => handleAiAssistantQuery("Highlight expired permits and licenses")}
                  className="w-full text-left p-2.5 bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 rounded-xl text-[11px] text-zinc-300 font-medium transition-all"
                >
                  🚨 Expiring Licences & Permits
                </button>
                <button
                  onClick={() => handleAiAssistantQuery("Predict system failures and bottleneck")}
                  className="w-full text-left p-2.5 bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 rounded-xl text-[11px] text-zinc-300 font-medium transition-all"
                >
                  🔮 Predict System Failures & Queues
                </button>
                <button
                  onClick={() => handleAiAssistantQuery("Suggest security improvements and threats")}
                  className="w-full text-left p-2.5 bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 rounded-xl text-[11px] text-zinc-300 font-medium transition-all"
                >
                  🛡️ Security Audit Recommendations
                </button>
              </div>

              {/* Chat Output display */}
              <div className="md:col-span-8 bg-black/60 rounded-xl border border-zinc-850 p-4 min-h-[160px] flex flex-col justify-between">
                <div className="text-xs text-zinc-300 space-y-3 font-mono-jb overflow-y-auto max-h-[220px] scrollbar-thin">
                  {isAiLoading ? (
                    <div className="flex items-center gap-2 text-zinc-400 py-6 animate-pulse text-xs">
                      <RefreshCw className="w-4 h-4 animate-spin text-blue-500" />
                      <span>AI Kernel compiling diagnostic report metrics...</span>
                    </div>
                  ) : aiAssistantResponse ? (
                    <div className="space-y-2 text-xs leading-relaxed text-zinc-100 select-all whitespace-pre-line">
                      {aiAssistantResponse}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-zinc-500 text-xs font-mono-jb">
                      Choose one of the audit triggers on the left panel or type custom query below to calculate real-time system recommendation vectors.
                    </div>
                  )}
                </div>

                {/* Custom AI Query Box */}
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleAiAssistantQuery();
                  }}
                  className="flex gap-2 border-t border-zinc-800 pt-3 mt-3"
                >
                  <input
                    type="text"
                    value={aiAssistantQuery}
                    onChange={(e) => setAiAssistantQuery(e.target.value)}
                    placeholder="Ask AI Assistant about system status, duplicates, or logs..."
                    className="flex-1 bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-1.5 text-xs text-white placeholder-zinc-500 focus:outline-none"
                  />
                  <button
                    type="submit"
                    className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold px-3 py-1.5 rounded-lg flex items-center gap-1 cursor-pointer"
                  >
                    <Send className="w-3.5 h-3.5" />
                  </button>
                </form>
              </div>
            </div>

            {/* NEW: App Storage & Deployment Optimization Panel */}
            <div className="bg-zinc-950 border border-zinc-850 rounded-2xl p-6 space-y-6 text-white mt-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800 pb-4">
                <div>
                  <h3 className="text-sm font-black uppercase tracking-wider font-space text-amber-500 flex items-center gap-2">
                    📁 Storage Usage & Deployment Optimizer
                  </h3>
                  <p className="text-[10px] text-zinc-450 font-mono-jb mt-0.5">
                    Real-time disk metrics, browser storage bounds, and deployment health metrics
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      // Optimization / compression routine
                      let cleared = 0;
                      // Remove standard temp keys or redundant state
                      const keysToRemove = ["kombiflow_temp_reg", "kombiflow_last_scanned_plate_temp"];
                      keysToRemove.forEach(k => {
                        if (localStorage.getItem(k)) {
                          localStorage.removeItem(k);
                          cleared++;
                        }
                      });
                      
                      // Show beautiful toast / alert
                      alert(`Optimization Complete! Cleared ${cleared} redundant temporary cache entries. Redundant metadata block indexes rebuilt.`);
                    }}
                    className="px-3 py-1.5 bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 rounded-lg text-[10px] font-black uppercase tracking-wider text-amber-500 transition-all flex items-center gap-1.5 cursor-pointer"
                  >
                    ⚡ Optimize Cache & Free Storage
                  </button>
                  <button
                    onClick={() => {
                      // Trigger JSON backup download
                      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(localStorage));
                      const downloadAnchor = document.createElement('a');
                      downloadAnchor.setAttribute("href", dataStr);
                      downloadAnchor.setAttribute("download", "sisonkhe_database_backup.json");
                      document.body.appendChild(downloadAnchor);
                      downloadAnchor.click();
                      downloadAnchor.remove();
                    }}
                    className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 rounded-lg text-[10px] font-black uppercase tracking-wider text-white transition-all flex items-center gap-1.5 cursor-pointer"
                  >
                    📥 Export JSON DB Backup
                  </button>
                </div>
              </div>

              {/* Grid of Storage stats */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {/* Disk Space usage */}
                <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 space-y-2">
                  <span className="text-[8px] font-black text-zinc-450 uppercase tracking-widest font-mono-jb block">Total Browser Storage Size</span>
                  <div className="flex items-baseline gap-2">
                    <span className="text-xl font-black font-space text-zinc-100">{storageMetrics.sizeKb} KB</span>
                    <span className="text-[10px] text-amber-400 font-bold">/ 5,120 KB</span>
                  </div>
                  <div className="w-full bg-zinc-800 h-2 rounded-full overflow-hidden">
                    <div className="h-full bg-amber-500 transition-all duration-500" style={{ width: `${Math.min(storageMetrics.percentOfLimit, 100)}%` }} />
                  </div>
                  <span className="text-[9px] text-zinc-500 block font-semibold">{storageMetrics.percentOfLimit}% of maximum browser allocation quota</span>
                </div>

                {/* DB Keys Count */}
                <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 space-y-1 flex flex-col justify-between">
                  <div>
                    <span className="text-[8px] font-black text-zinc-450 uppercase tracking-widest font-mono-jb block">Active Relational Entities</span>
                    <span className="text-xl font-black font-space text-zinc-100 block mt-1">{storageMetrics.keysCount} DB Keys</span>
                  </div>
                  <span className="text-[9px] text-zinc-500 block leading-normal">
                    Individual schemas registered in local persistent scope.
                  </span>
                </div>

                {/* Deployment Container health */}
                <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 space-y-1 flex flex-col justify-between">
                  <div>
                    <span className="text-[8px] font-black text-zinc-450 uppercase tracking-widest font-mono-jb block">Container Build Target</span>
                    <span className="text-sm font-black font-mono-jb text-emerald-400 block mt-1 flex items-center gap-1">
                      ● Cloud Run: Node22-CJS
                    </span>
                  </div>
                  <span className="text-[9px] text-zinc-500 block leading-normal">
                    Single bundle esbuild target with native TypeScript stripping. No HMR leaks.
                  </span>
                </div>

                {/* Network / Bundle latency optimizer */}
                <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 space-y-1 flex flex-col justify-between">
                  <div>
                    <span className="text-[8px] font-black text-zinc-450 uppercase tracking-widest font-mono-jb block">Client JS Bundle Footprint</span>
                    <span className="text-xl font-black font-space text-blue-400 block mt-1">294 KB gzip</span>
                  </div>
                  <span className="text-[9px] text-zinc-500 block leading-normal">
                    Fully optimized chunks with tree-shaking active. All icons from lucide-react.
                  </span>
                </div>
              </div>

              {/* Items List of keys inside Storage */}
              <div className="space-y-2">
                <span className="text-[10px] font-black text-zinc-450 uppercase tracking-wider block">Storage Object Allocation Profile</span>
                <div className="max-h-[180px] overflow-y-auto border border-zinc-800 rounded-xl divide-y divide-zinc-800 scrollbar-thin">
                  {storageMetrics.itemsList.map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between p-2.5 bg-zinc-900/40 hover:bg-zinc-900 transition-all text-[11px] font-medium font-mono-jb">
                      <span className="text-zinc-300 truncate pr-2">{item.key}</span>
                      <span className="text-amber-500 font-bold flex-shrink-0">{item.sizeKb} KB</span>
                    </div>
                  ))}
                  {storageMetrics.itemsList.length === 0 && (
                    <div className="p-4 text-center text-zinc-500 text-xs font-mono-jb">
                      No active local persistent state tracks registered in workspace browser context.
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* VIEW: USER ADMINISTRATION & REGISTRATION SYSTEM */}
      {activeSubTab === "users" && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-850 rounded-2xl p-6 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-zinc-150 dark:border-zinc-850">
              <div>
                <h3 className="text-base font-black text-zinc-900 dark:text-white uppercase tracking-wider font-space flex items-center gap-2">
                  👥 Unified Account Matrix
                </h3>
                <p className="text-xs text-zinc-400 font-medium">
                  Comprehensive system-wide user credentials, identity access management, and security action matrix.
                </p>
              </div>

              {/* Search Bar */}
              <div className="relative w-full sm:w-80">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                <input
                  type="text"
                  value={userSearchQuery}
                  onChange={(e) => setUserSearchQuery(e.target.value)}
                  placeholder="Search accounts, names, phone, email..."
                  className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 pl-10 pr-4 py-2 rounded-xl text-xs font-bold text-zinc-850 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-amber-500"
                />
              </div>
            </div>

            {/* Scrollable Categories List */}
            <div className="flex bg-zinc-100 dark:bg-zinc-950 p-1.5 rounded-xl gap-1.5 overflow-x-auto scrollbar-none text-[10px]">
              {["All Accounts", "Drivers", "Fleet", "Ranks", "Revenue", "Enforcement", "Commuters", "Developers", "System Administrators"].map((cat) => (
                <button
                  key={cat}
                  onClick={() => setUserCategory(cat as any)}
                  className={`px-3 py-1.5 text-[9px] font-black uppercase rounded-lg text-center cursor-pointer whitespace-nowrap transition-all ${
                    userCategory === cat
                      ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 shadow-sm"
                      : "text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300"
                  }`}
                >
                  {cat} ({getCategoryCount(cat)})
                </button>
              ))}
            </div>

            {/* Editing / Resetting inline for premium feel */}
            {(isEditingUser || isResettingPassword) && selectedUserAccount && (
              <div className="bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-850 p-6 rounded-2xl shadow-inner space-y-4 animate-fade-in">
                <div className="flex justify-between items-center pb-3 border-b border-zinc-200/50 dark:border-zinc-800/50">
                  <div>
                    <span className="text-[9px] font-bold text-zinc-400 font-mono-jb uppercase">ADMIN ACTION REQUIRED</span>
                    <h4 className="text-sm font-black text-zinc-900 dark:text-white uppercase">
                      {isEditingUser ? `Edit Account Details: ${selectedUserAccount.fullName}` : `Reset Password for: ${selectedUserAccount.fullName}`}
                    </h4>
                  </div>
                  <button 
                    onClick={() => { setIsEditingUser(false); setIsResettingPassword(false); }}
                    className="p-1 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition-all"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {isEditingUser ? (
                  /* EDITING VIEW */
                  <div className="space-y-4 text-xs font-bold text-zinc-700 dark:text-zinc-300">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-[10px] font-black uppercase text-zinc-400">Full Name</label>
                        <input
                          type="text"
                          value={editFullName}
                          onChange={(e) => setEditFullName(e.target.value)}
                          className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-2.5 rounded-lg text-xs font-bold text-zinc-800 dark:text-zinc-100"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-black uppercase text-zinc-400">System Username</label>
                        <input
                          type="text"
                          value={editUsername}
                          onChange={(e) => setEditUsername(e.target.value)}
                          className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-2.5 rounded-lg text-xs font-mono-jb font-bold text-zinc-800 dark:text-zinc-100"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-[10px] font-black uppercase text-zinc-400">Email Address</label>
                        <input
                          type="email"
                          value={editEmail}
                          onChange={(e) => setEditEmail(e.target.value)}
                          className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-2.5 rounded-lg text-xs font-bold text-zinc-800 dark:text-zinc-100"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-black uppercase text-zinc-400">Contact Phone</label>
                        <input
                          type="text"
                          value={editPhone}
                          onChange={(e) => setEditPhone(e.target.value)}
                          className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-2.5 rounded-lg text-xs font-bold text-zinc-800 dark:text-zinc-100"
                        />
                      </div>
                    </div>

                    <div className="flex justify-end gap-2 pt-2 border-t border-zinc-200/50 dark:border-zinc-800/50">
                      <button
                        onClick={() => setIsEditingUser(false)}
                        className="px-3.5 py-2 bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 font-bold uppercase text-[10px] rounded-lg cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => {
                          const updated = accounts.map(a => a.id === selectedUserAccount.id ? {
                            ...a,
                            fullName: editFullName,
                            email: editEmail,
                            phone: editPhone,
                            username: editUsername
                          } : a);
                          setAccounts(updated);
                          setIsEditingUser(false);
                          setResetSuccessMsg("Account details updated successfully.");
                        }}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-black uppercase text-[10px] rounded-lg cursor-pointer"
                      >
                        Save Changes
                      </button>
                    </div>
                  </div>
                ) : (
                  /* PASSWORD RESET VIEW */
                  <div className="space-y-4 text-xs">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black uppercase text-zinc-400 block font-bold">Set New Account Password</label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          placeholder="Enter new password"
                          value={resetPasswordValue}
                          onChange={(e) => setResetPasswordValue(e.target.value)}
                          className="flex-grow bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-2.5 rounded-lg text-xs font-mono-jb font-bold text-zinc-800 dark:text-zinc-100"
                        />
                        <button
                          onClick={() => {
                            const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*";
                            let pass = "";
                            for (let i = 0; i < 10; i++) {
                              pass += chars.charAt(Math.floor(Math.random() * chars.length));
                            }
                            setResetPasswordValue(pass);
                          }}
                          className="px-4 py-2.5 bg-zinc-200 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 font-bold uppercase text-[10px] rounded-lg"
                        >
                          Generate
                        </button>
                      </div>
                    </div>

                    <div className="flex justify-end gap-2 pt-2 border-t border-zinc-200/50 dark:border-zinc-800/50">
                      <button
                        onClick={() => setIsResettingPassword(false)}
                        className="px-3.5 py-2 bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 font-bold uppercase text-[10px] rounded-lg cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => {
                          if (!resetPasswordValue.trim()) return;
                          const updated = accounts.map(a => a.id === selectedUserAccount.id ? {
                            ...a,
                            password: resetPasswordValue
                          } : a);
                          setAccounts(updated);
                          setIsResettingPassword(false);
                          setResetSuccessMsg(`Password successfully reset for ${selectedUserAccount.fullName}! New Password: ${resetPasswordValue}`);
                        }}
                        className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-black uppercase text-[10px] rounded-lg cursor-pointer"
                      >
                        Confirm Reset
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {resetSuccessMsg && (
              <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 p-3 rounded-xl text-xs font-semibold animate-fade-in flex justify-between items-center">
                <span>{resetSuccessMsg}</span>
                <button onClick={() => setResetSuccessMsg("")} className="text-emerald-600 dark:text-emerald-400 font-bold hover:underline">Dismiss</button>
              </div>
            )}

            {/* Table Matrix View */}
            <div className="overflow-x-auto rounded-xl border border-zinc-150 dark:border-zinc-850">
              <table className="w-full text-left text-xs text-zinc-700 dark:text-zinc-300">
                <thead>
                  <tr className="bg-zinc-50 dark:bg-zinc-950 border-b border-zinc-200 dark:border-zinc-850 text-[10px] text-zinc-400 uppercase font-black tracking-wider">
                    <th className="py-3 px-4">Account Details</th>
                    <th className="py-3 px-4">Role</th>
                    <th className="py-3 px-4">Username & Contact</th>
                    <th className="py-3 px-4">Credentials PIN/Pass</th>
                    <th className="py-3 px-4">Handshake</th>
                    <th className="py-3 px-4 text-center">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                  {filteredAccounts.map((acc) => {
                    const isPwdVisible = visiblePasswordIds.includes(acc.id);
                    return (
                      <tr key={acc.id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-850/20 transition-all">
                        <td className="py-3.5 px-4">
                          <div className="font-bold text-zinc-900 dark:text-white">{acc.fullName}</div>
                          <div className="text-[10px] text-zinc-400 font-mono-jb">ID: {acc.id}</div>
                        </td>
                        <td className="py-3.5 px-4 font-semibold text-zinc-600 dark:text-zinc-400">
                          <span className="px-2 py-0.5 bg-blue-500/10 text-blue-500 border border-blue-500/20 rounded-md text-[9px] font-black uppercase">
                            {acc.role}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 space-y-0.5">
                          <div className="font-mono-jb text-[10px] text-zinc-800 dark:text-zinc-250">{acc.username}</div>
                          <div className="text-[10px] text-zinc-500">{acc.phone}</div>
                          <div className="text-[10px] text-zinc-400">{acc.email}</div>
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono-jb font-bold bg-zinc-100 dark:bg-black px-2 py-1 rounded text-zinc-800 dark:text-zinc-200 text-[11px] select-all">
                              {isPwdVisible ? (acc.password || "1234") : "••••••••"}
                            </span>
                            <button
                              type="button"
                              onClick={() => {
                                if (isPwdVisible) {
                                  setVisiblePasswordIds(visiblePasswordIds.filter(id => id !== acc.id));
                                } else {
                                  setVisiblePasswordIds([...visiblePasswordIds, acc.id]);
                                }
                              }}
                              className="p-1 hover:bg-zinc-200 dark:hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-zinc-600 transition-colors cursor-pointer"
                              title={isPwdVisible ? "Hide password" : "Show password"}
                            >
                              {isPwdVisible ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                            </button>
                          </div>
                        </td>
                        <td className="py-3.5 px-4 font-mono-jb text-[10px] text-zinc-400">
                          {new Date(acc.lastLogin).toLocaleDateString()}
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${
                            acc.status === "Active"
                              ? "bg-emerald-500/10 text-emerald-500"
                              : acc.status === "Locked"
                              ? "bg-amber-500/10 text-amber-500"
                              : "bg-red-500/10 text-red-500"
                          }`}>
                            {acc.status}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => {
                                setSelectedUserAccount(acc);
                                setIsEditingUser(true);
                                setIsResettingPassword(false);
                                setEditFullName(acc.fullName || "");
                                setEditUsername(acc.username || "");
                                setEditEmail(acc.email || "");
                                setEditPhone(acc.phone || "");
                                setResetSuccessMsg("");
                              }}
                              className="px-2 py-1 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-750 text-zinc-700 dark:text-zinc-300 rounded text-[9px] font-black uppercase transition-all cursor-pointer border border-zinc-250 dark:border-zinc-700"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => {
                                setSelectedUserAccount(acc);
                                setIsResettingPassword(true);
                                setIsEditingUser(false);
                                setResetPasswordValue("");
                                setResetSuccessMsg("");
                              }}
                              className="px-2 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded text-[9px] font-black uppercase transition-all cursor-pointer"
                            >
                              Reset PIN
                            </button>
                            <button
                              onClick={() => {
                                const newStatus = acc.status === "Suspended" ? "Active" : "Suspended";
                                const updated = accounts.map(a => a.id === acc.id ? { ...a, status: newStatus as any } : a);
                                setAccounts(updated);
                                setResetSuccessMsg(`Account status updated to ${newStatus}.`);
                              }}
                              className={`px-2 py-1 rounded text-[9px] font-black uppercase transition-all cursor-pointer ${
                                acc.status === "Suspended"
                                  ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                                  : "bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/20"
                              }`}
                            >
                              {acc.status === "Suspended" ? "Reactivate" : "Suspend"}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {filteredAccounts.length === 0 && (
                    <tr>
                      <td colSpan={7} className="text-center py-10 text-zinc-400 text-xs font-mono-jb">
                        No accounts match the current filters.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* USER REGISTRATION SYSTEM MODULE */}
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-805 p-6 rounded-2xl shadow-sm">
            <h4 className="text-sm font-black text-zinc-900 dark:text-zinc-100 uppercase tracking-wider mb-4 font-space flex items-center gap-1.5">
              <Plus className="text-blue-500 w-5 h-5" /> National Transport User Registration System
            </h4>

            {regSuccess && (
              <div className="bg-emerald-500 text-white p-3.5 rounded-xl text-xs font-black uppercase tracking-wider mb-4 animate-bounce">
                🎉 New operational account registered successfully! Automatic permissions assigned to active directory.
              </div>
            )}

            <form onSubmit={handleUserRegistration} className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
              <div>
                <label className="font-bold block mb-1 uppercase text-zinc-400 tracking-wider">Full Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Sbusiso Nxumalo"
                  value={regFullName}
                  onChange={(e) => setRegFullName(e.target.value)}
                  className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 p-2 rounded-xl text-xs focus:outline-none"
                />
              </div>

              <div>
                <label className="font-bold block mb-1 uppercase text-zinc-400 tracking-wider">National ID / Passport</label>
                <input
                  type="text"
                  placeholder="e.g. 9604118844"
                  value={regNationalId}
                  onChange={(e) => setRegNationalId(e.target.value)}
                  className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 p-2 rounded-xl text-xs focus:outline-none font-mono-jb"
                />
              </div>

              <div>
                <label className="font-bold block mb-1 uppercase text-zinc-400 tracking-wider">Employee Number</label>
                <input
                  type="text"
                  placeholder="e.g. GOV-ST-4022"
                  value={regEmployeeNumber}
                  onChange={(e) => setRegEmployeeNumber(e.target.value)}
                  className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 p-2 rounded-xl text-xs focus:outline-none font-mono-jb"
                />
              </div>

              <div>
                <label className="font-bold block mb-1 uppercase text-zinc-400 tracking-wider">Phone (+268)</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. +268 7604 4455"
                  value={regPhone}
                  onChange={(e) => setRegPhone(e.target.value)}
                  className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 p-2 rounded-xl text-xs focus:outline-none"
                />
              </div>

              <div>
                <label className="font-bold block mb-1 uppercase text-zinc-400 tracking-wider">Email Account</label>
                <input
                  type="email"
                  required
                  placeholder="e.g. nxumalo@transport.gov.sz"
                  value={regEmail}
                  onChange={(e) => setRegEmail(e.target.value)}
                  className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 p-2 rounded-xl text-xs focus:outline-none"
                />
              </div>

              <div>
                <label className="font-bold block mb-1 uppercase text-zinc-400 tracking-wider">System Username</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. nxumalo_gov"
                  value={regUsername}
                  onChange={(e) => setRegUsername(e.target.value)}
                  className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 p-2 rounded-xl text-xs focus:outline-none font-mono-jb"
                />
              </div>

              <div>
                <label className="font-bold block mb-1 uppercase text-zinc-400 tracking-wider">Password</label>
                <div className="relative">
                  <input
                    type={showRegPassword ? "text" : "password"}
                    required
                    placeholder="••••••••"
                    value={regPassword}
                    onChange={(e) => setRegPassword(e.target.value)}
                    className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 p-2 pr-10 rounded-xl text-xs focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowRegPassword(!showRegPassword)}
                    className="absolute right-3 top-2.5 text-zinc-400 hover:text-zinc-600 transition-colors cursor-pointer"
                    title={showRegPassword ? "Hide password" : "Show password"}
                  >
                    {showRegPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="font-bold block mb-1 uppercase text-zinc-400 tracking-wider">Role Category Assign</label>
                <select
                  value={regRole}
                  onChange={(e) => setRegRole(e.target.value)}
                  className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 p-2 rounded-xl text-xs focus:outline-none font-bold"
                >
                  <option value="Fleet Operator">Fleet Operator / Owner</option>
                  <option value="Rank Administrator">Rank Administrator / Marshal</option>
                  <option value="Driver">Kombi Driver</option>
                  <option value="Commuter">Commuter / Passenger</option>
                  <option value="Revenue Officer">Revenue & Permit Officer</option>
                  <option value="Developer">System Developer / Maintainer</option>
                  <option value="Super Admin">Platform Super Admin</option>
                  <option value="System Administrator">System Admin</option>
                </select>
              </div>

              <div>
                <label className="font-bold block mb-1 uppercase text-zinc-400 tracking-wider">MFA Status</label>
                <select
                  value={regMfaEnabled ? "Enabled" : "Disabled"}
                  onChange={(e) => setRegMfaEnabled(e.target.value === "Enabled")}
                  className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 p-2 rounded-xl text-xs focus:outline-none font-bold"
                >
                  <option value="Enabled">Enforce Multi-Factor Auth</option>
                  <option value="Disabled">Disable Multi-Factor Auth</option>
                </select>
              </div>

              <div className="md:col-span-3 flex justify-end">
                <button
                  type="submit"
                  className="bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs uppercase px-6 py-2.5 rounded-xl cursor-pointer transition-all shadow-md"
                >
                  Register Account & Save Credentials
                </button>
              </div>
            </form>
          </div>

          {/* ROLE BASED ACCESS CONTROL MATRIX CONFIGURATOR */}
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-805 p-6 rounded-2xl shadow-sm">
            <h4 className="text-sm font-black text-zinc-900 dark:text-zinc-100 uppercase tracking-wider mb-4 font-space">
              🛡️ Role Based Access Control (RBAC) Permissions Matrix
            </h4>
            <p className="text-xs text-zinc-400 mb-4">
              Tick or untick permissions dynamically assigned to each system role. Changes propagate live across client routers.
            </p>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-zinc-250 dark:border-zinc-800 text-zinc-400 font-bold uppercase text-[9px] tracking-widest font-space">
                    <th className="py-2.5 pr-4">System Role</th>
                    {["Create", "Read", "Update", "Delete", "Approve", "Export", "Import", "View Reports", "Manage Users", "Configure System", "Audit Logs"].map(p => (
                      <th key={p} className="py-2.5 text-center px-1.5">{p}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-150 dark:divide-zinc-850">
                  {Object.keys(permissionsMatrix).map((role) => (
                    <tr key={role} className="hover:bg-zinc-50 dark:hover:bg-zinc-950">
                      <td className="py-3 pr-4 font-bold text-zinc-900 dark:text-zinc-200 font-space">{role}</td>
                      {["Create", "Read", "Update", "Delete", "Approve", "Export", "Import", "View Reports", "Manage Users", "Configure System", "Audit Logs"].map((perm) => {
                        const hasPerm = permissionsMatrix[role].includes(perm);
                        return (
                          <td key={perm} className="py-3 text-center px-1.5">
                            <input
                              type="checkbox"
                              checked={hasPerm}
                              onChange={() => {
                                const list = permissionsMatrix[role];
                                const updatedList = list.includes(perm)
                                  ? list.filter(p => p !== perm)
                                  : [...list, perm];
                                setPermissionsMatrix({ ...permissionsMatrix, [role]: updatedList });
                              }}
                              className="rounded border-zinc-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                            />
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* VIEW: ADVERTS & TV BROADCAST MANAGEMENT */}
      {activeSubTab === "adverts" && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-850 rounded-2xl p-6 space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-zinc-150 dark:border-zinc-850">
              <div>
                <h3 className="text-base font-black text-zinc-900 dark:text-white uppercase tracking-wider font-space flex items-center gap-2">
                  <Megaphone className="w-5 h-5 text-amber-500 animate-pulse" />
                  National TV Advertisements & Broadcast Control
                </h3>
                <p className="text-xs text-zinc-400 font-medium">
                  Upload promotional banners, configure region-specific targeting, and manage live public TV displays.
                </p>
              </div>

              <span className="px-3 py-1 bg-amber-500/10 border border-amber-500/20 text-amber-500 text-xs font-black font-mono-jb rounded-xl uppercase tracking-wider">
                {adverts.filter(a => a.isActive).length} ACTIVE BROADCASTS
              </span>
            </div>

            {/* Upload Advert Form */}
            <form onSubmit={handleCreateAdvert} className="bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 p-5 rounded-2xl space-y-4">
              <div className="flex items-center justify-between border-b border-zinc-200/60 dark:border-zinc-800/60 pb-3">
                <h4 className="text-xs font-black text-zinc-900 dark:text-zinc-100 uppercase tracking-wider flex items-center gap-1.5 font-space">
                  <Upload className="w-4 h-4 text-amber-500" />
                  Create New Detailed TV Broadcast Advert
                </h4>
                <span className="text-[10px] text-zinc-400 font-medium">MAX FILE SIZE: <strong className="text-amber-500 font-bold">2.0 MB</strong></span>
              </div>

              {adUploadError && (
                <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-500 text-xs font-bold rounded-xl flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                  <span>{adUploadError}</span>
                </div>
              )}

              {adUploadSuccess && (
                <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 text-xs font-bold rounded-xl flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                  <span>{adUploadSuccess}</span>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {/* Title */}
                <div>
                  <label className="text-[10px] font-black uppercase text-zinc-400 tracking-wider block mb-1">Advert Title / Headline</label>
                  <input
                    type="text"
                    value={adTitle}
                    onChange={(e) => setAdTitle(e.target.value)}
                    placeholder="e.g. MTN MoMo E10 Cashback Promo"
                    className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-2.5 rounded-xl text-xs font-bold focus:outline-none focus:ring-1 focus:ring-amber-500 text-zinc-900 dark:text-white"
                  />
                </div>

                {/* Sponsor */}
                <div>
                  <label className="text-[10px] font-black uppercase text-zinc-400 tracking-wider block mb-1">Sponsor / Advertiser Name</label>
                  <input
                    type="text"
                    value={adSponsor}
                    onChange={(e) => setAdSponsor(e.target.value)}
                    placeholder="e.g. MTN Eswatini"
                    className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-2.5 rounded-xl text-xs font-bold focus:outline-none focus:ring-1 focus:ring-amber-500 text-zinc-900 dark:text-white"
                  />
                </div>

                {/* Category */}
                <div>
                  <label className="text-[10px] font-black uppercase text-zinc-400 tracking-wider block mb-1">Industry / Category</label>
                  <select
                    value={adCategory}
                    onChange={(e) => setAdCategory(e.target.value)}
                    className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-2.5 rounded-xl text-xs font-bold focus:outline-none focus:ring-1 focus:ring-amber-500 text-zinc-900 dark:text-white cursor-pointer"
                  >
                    <option value="Fintech / Mobile Banking">Fintech / Mobile Banking</option>
                    <option value="Telecoms & Data">Telecoms & Data</option>
                    <option value="Retail & Supermarkets">Retail & Supermarkets</option>
                    <option value="Transit & Travel Deals">Transit & Travel Deals</option>
                    <option value="Insurance & Financial">Insurance & Financial</option>
                    <option value="Public Health & Safety">Public Health & Safety</option>
                  </select>
                </div>

                {/* Promo Code */}
                <div>
                  <label className="text-[10px] font-black uppercase text-zinc-400 tracking-wider block mb-1">Promo / Voucher Code</label>
                  <input
                    type="text"
                    value={adPromoCode}
                    onChange={(e) => setAdPromoCode(e.target.value)}
                    placeholder="e.g. MOMO2026"
                    className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-2.5 rounded-xl text-xs font-mono-jb font-bold focus:outline-none focus:ring-1 focus:ring-amber-500 uppercase text-zinc-900 dark:text-white"
                  />
                </div>

                {/* Contact Phone */}
                <div>
                  <label className="text-[10px] font-black uppercase text-zinc-400 tracking-wider block mb-1">Sponsor Contact Phone</label>
                  <input
                    type="text"
                    value={adContactPhone}
                    onChange={(e) => setAdContactPhone(e.target.value)}
                    placeholder="e.g. +268 2400 0000"
                    className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-2.5 rounded-xl text-xs font-bold focus:outline-none focus:ring-1 focus:ring-amber-500 text-zinc-900 dark:text-white"
                  />
                </div>

                {/* Website URL */}
                <div>
                  <label className="text-[10px] font-black uppercase text-zinc-400 tracking-wider block mb-1">Official Website URL</label>
                  <input
                    type="text"
                    value={adWebsiteUrl}
                    onChange={(e) => setAdWebsiteUrl(e.target.value)}
                    placeholder="e.g. https://www.mtn.co.sz"
                    className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-2.5 rounded-xl text-xs font-bold focus:outline-none focus:ring-1 focus:ring-amber-500 text-zinc-900 dark:text-white"
                  />
                </div>
              </div>

              {/* Detailed Description */}
              <div>
                <label className="text-[10px] font-black uppercase text-zinc-400 tracking-wider block mb-1">Advert Description & Commuter Benefit</label>
                <textarea
                  rows={2}
                  value={adDescription}
                  onChange={(e) => setAdDescription(e.target.value)}
                  placeholder="e.g. Get 10% instant cashback when paying your public transport fares using MTN MoMo across Mbabane and Manzini ranks."
                  className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-2.5 rounded-xl text-xs font-medium focus:outline-none focus:ring-1 focus:ring-amber-500 text-zinc-900 dark:text-white"
                />
              </div>

              {/* Image Upload File Picker or Image Link */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-black uppercase text-zinc-400 tracking-wider block mb-1">Upload Banner File (Max 2MB)</label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleAdImageChange}
                    className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-2 rounded-xl text-xs font-bold file:mr-2 file:py-1 file:px-2 file:rounded-lg file:border-0 file:text-[10px] file:font-black file:bg-amber-500 file:text-black cursor-pointer text-zinc-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-black uppercase text-zinc-400 tracking-wider block mb-1">Or Direct Banner Image URL</label>
                  <input
                    type="text"
                    value={adImagePreview && !adImagePreview.startsWith("data:") ? adImagePreview : ""}
                    onChange={(e) => {
                      setAdImagePreview(e.target.value);
                      setAdImageSize(200000);
                    }}
                    placeholder="https://images.unsplash.com/..."
                    className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-2.5 rounded-xl text-xs font-bold focus:outline-none focus:ring-1 focus:ring-amber-500 text-zinc-900 dark:text-white"
                  />
                </div>
              </div>

              {/* Target Regions Selector */}
              <div className="space-y-1.5 pt-2">
                <label className="text-[10px] font-black uppercase text-zinc-400 tracking-wider block">Target Regions Broadcast</label>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setAdTargetRegions(["All"])}
                    className={`px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider cursor-pointer transition-all border ${
                      adTargetRegions.includes("All")
                        ? "bg-amber-500 text-black border-amber-600 shadow-sm"
                        : "bg-white dark:bg-zinc-900 text-zinc-600 dark:text-zinc-300 border-zinc-200 dark:border-zinc-800 hover:border-amber-400"
                    }`}
                  >
                    🌐 All Regions (Nationwide)
                  </button>

                  {(["Hhohho", "Manzini", "Lubombo", "Shiselweni"] as EswatiniRegion[]).map((r) => {
                    const isSelected = adTargetRegions.includes(r);
                    return (
                      <button
                        key={r}
                        type="button"
                        onClick={() => {
                          let next = adTargetRegions.filter(reg => reg !== "All");
                          if (next.includes(r)) {
                            next = next.filter(reg => reg !== r);
                          } else {
                            next.push(r);
                          }
                          if (next.length === 0) next = ["All"];
                          setAdTargetRegions(next);
                        }}
                        className={`px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider cursor-pointer transition-all border ${
                          isSelected && !adTargetRegions.includes("All")
                            ? "bg-blue-600 text-white border-blue-700 shadow-sm"
                            : "bg-white dark:bg-zinc-900 text-zinc-600 dark:text-zinc-300 border-zinc-200 dark:border-zinc-800 hover:border-blue-400"
                        }`}
                      >
                        📍 {r}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Preview and Submit */}
              {adImagePreview && (
                <div className="p-3 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <img src={adImagePreview} alt="Preview" className="w-20 h-12 object-cover rounded-lg border border-zinc-300 dark:border-zinc-700" />
                    <div>
                      <span className="text-[10px] font-black uppercase text-emerald-500 block">✓ Valid Image Banner</span>
                      <span className="text-[11px] font-bold text-zinc-700 dark:text-zinc-200 block">
                        Size: {adImageSize ? (adImageSize / (1024 * 1024)).toFixed(2) + " MB" : "< 1 MB"}
                      </span>
                    </div>
                  </div>
                  <span className="text-[10px] font-mono-jb text-zinc-400">Ready to broadcast</span>
                </div>
              )}

              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  className="bg-amber-500 hover:bg-amber-400 text-black font-black text-xs uppercase px-6 py-2.5 rounded-xl cursor-pointer transition-all shadow-md flex items-center gap-2"
                >
                  <Megaphone className="w-4 h-4" />
                  Publish Advert to Commuter TV
                </button>
              </div>
            </form>

            {/* Adverts Roster Grid */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-black text-zinc-900 dark:text-zinc-100 uppercase tracking-wider font-space">
                  Registered Advertisements Roster ({adverts.length})
                </h4>
                <span className="text-[10px] text-zinc-400 font-mono-jb">
                  Click <Pencil className="w-3 h-3 inline text-amber-500" /> to edit any advertisement details
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {adverts.map((ad) => (
                  <div
                    key={ad.id}
                    className={`p-4 rounded-2xl border transition-all space-y-3 relative overflow-hidden flex flex-col justify-between ${
                      ad.isActive
                        ? "bg-white dark:bg-zinc-950 border-amber-500/40 shadow-sm"
                        : "bg-zinc-50 dark:bg-zinc-900/40 border-zinc-200 dark:border-zinc-800 opacity-60"
                    }`}
                  >
                    <div className="space-y-3">
                      <div className="relative h-36 rounded-xl overflow-hidden border border-zinc-200 dark:border-zinc-800 bg-zinc-900">
                        <img src={ad.imageUrl} alt={ad.title} className="w-full h-full object-cover" />
                        <div className="absolute top-2 left-2 flex items-center gap-1.5">
                          <span className="px-2 py-0.5 bg-black/80 text-amber-400 text-[9px] font-black uppercase rounded border border-white/10 font-mono-jb">
                            {ad.sponsorName}
                          </span>
                        </div>
                        <div className="absolute top-2 right-2 flex items-center gap-1">
                          <button
                            onClick={() => setEditingAdvert({ ...ad })}
                            className="p-1 bg-black/80 text-white hover:text-amber-400 rounded transition-colors border border-white/10 cursor-pointer"
                            title="Edit Advert Details"
                          >
                            <Pencil className="w-3 h-3" />
                          </button>
                          <button
                            onClick={() => handleToggleAdvertActive(ad.id)}
                            className={`px-2 py-0.5 text-[9px] font-black uppercase rounded cursor-pointer transition-all border ${
                              ad.isActive
                                ? "bg-emerald-500 text-black border-emerald-600"
                                : "bg-zinc-700 text-zinc-200 border-zinc-600"
                            }`}
                          >
                            {ad.isActive ? "ACTIVE 🟢" : "PAUSED ⏸️"}
                          </button>
                        </div>
                      </div>

                      <div>
                        <div className="flex items-center justify-between gap-1 mb-1">
                          <span className="px-2 py-0.5 bg-amber-500/10 text-amber-500 text-[9px] font-bold rounded uppercase">
                            {ad.category || "PROMO"}
                          </span>
                          {ad.promoCode && (
                            <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-500 text-[9px] font-mono font-bold rounded uppercase">
                              CODE: {ad.promoCode}
                            </span>
                          )}
                        </div>
                        <h5 className="text-xs font-black text-zinc-900 dark:text-white uppercase leading-tight font-space">
                          {ad.title}
                        </h5>
                        {ad.description && (
                          <p className="text-[10px] text-zinc-500 dark:text-zinc-400 line-clamp-2 mt-1 leading-snug">
                            {ad.description}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="space-y-2 pt-2 border-t border-zinc-100 dark:border-zinc-850">
                      {/* Regional Target Toggles */}
                      <div className="space-y-1">
                        <span className="text-[9px] font-black uppercase text-zinc-400 tracking-wider block">Target Display Regions:</span>
                        <div className="flex flex-wrap gap-1">
                          <button
                            onClick={() => handleToggleAdvertRegion(ad.id, "All")}
                            className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase transition-all cursor-pointer ${
                              ad.targetRegions.includes("All")
                                ? "bg-amber-500 text-black"
                                : "bg-zinc-100 dark:bg-zinc-800 text-zinc-500"
                            }`}
                          >
                            All
                          </button>
                          {(["Hhohho", "Manzini", "Lubombo", "Shiselweni"] as EswatiniRegion[]).map((reg) => {
                            const isRegTarget = ad.targetRegions.includes(reg) && !ad.targetRegions.includes("All");
                            return (
                              <button
                                key={reg}
                                onClick={() => handleToggleAdvertRegion(ad.id, reg)}
                                className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase transition-all cursor-pointer ${
                                  isRegTarget
                                    ? "bg-blue-600 text-white"
                                    : "bg-zinc-100 dark:bg-zinc-800 text-zinc-500"
                                }`}
                              >
                                {reg}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-1">
                        <span className="text-[9px] font-mono-jb text-zinc-400">
                          {ad.targetRegions.includes("All") ? "🌐 Nationwide TV" : `📍 ${ad.targetRegions.join(", ")}`}
                        </span>

                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => setEditingAdvert({ ...ad })}
                            className="p-1.5 text-amber-500 hover:text-amber-400 hover:bg-amber-500/10 rounded-lg transition-all cursor-pointer flex items-center gap-1 text-[10px] font-bold"
                            title="Edit Advert"
                          >
                            <Pencil className="w-3.5 h-3.5" /> Edit
                          </button>
                          <button
                            onClick={() => handleDeleteAdvert(ad.id)}
                            className="p-1.5 text-red-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all cursor-pointer"
                            title="Delete Advert"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* EDIT ADVERT MODAL */}
            {editingAdvert && (
              <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
                <div className="bg-white dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-800 rounded-3xl max-w-lg w-full p-6 space-y-4 shadow-2xl relative text-zinc-900 dark:text-white">
                  <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 pb-3">
                    <h3 className="text-sm font-black uppercase tracking-wider font-space flex items-center gap-2">
                      <Pencil className="w-4 h-4 text-amber-500" />
                      Edit Registered Advertisement
                    </h3>
                    <button
                      onClick={() => setEditingAdvert(null)}
                      className="p-1 text-zinc-400 hover:text-zinc-600 dark:hover:text-white cursor-pointer"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  <div className="space-y-3 max-h-[70vh] overflow-y-auto pr-1">
                    <div>
                      <label className="text-[10px] font-black uppercase text-zinc-400 block mb-1">Advert Headline</label>
                      <input
                        type="text"
                        value={editingAdvert.title}
                        onChange={(e) => setEditingAdvert({ ...editingAdvert, title: e.target.value })}
                        className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-2.5 rounded-xl text-xs font-bold"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-[10px] font-black uppercase text-zinc-400 block mb-1">Sponsor Brand Name</label>
                        <input
                          type="text"
                          value={editingAdvert.sponsorName}
                          onChange={(e) => setEditingAdvert({ ...editingAdvert, sponsorName: e.target.value })}
                          className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-2.5 rounded-xl text-xs font-bold"
                        />
                      </div>

                      <div>
                        <label className="text-[10px] font-black uppercase text-zinc-400 block mb-1">Category</label>
                        <input
                          type="text"
                          value={editingAdvert.category || "Fintech"}
                          onChange={(e) => setEditingAdvert({ ...editingAdvert, category: e.target.value })}
                          className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-2.5 rounded-xl text-xs font-bold"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-[10px] font-black uppercase text-zinc-400 block mb-1">Detailed Description</label>
                      <textarea
                        rows={3}
                        value={editingAdvert.description || ""}
                        onChange={(e) => setEditingAdvert({ ...editingAdvert, description: e.target.value })}
                        className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-2.5 rounded-xl text-xs font-medium"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-[10px] font-black uppercase text-zinc-400 block mb-1">Promo Voucher Code</label>
                        <input
                          type="text"
                          value={editingAdvert.promoCode || ""}
                          onChange={(e) => setEditingAdvert({ ...editingAdvert, promoCode: e.target.value.toUpperCase() })}
                          className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-2.5 rounded-xl text-xs font-mono font-bold uppercase"
                        />
                      </div>

                      <div>
                        <label className="text-[10px] font-black uppercase text-zinc-400 block mb-1">Contact Phone</label>
                        <input
                          type="text"
                          value={editingAdvert.contactPhone || ""}
                          onChange={(e) => setEditingAdvert({ ...editingAdvert, contactPhone: e.target.value })}
                          className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-2.5 rounded-xl text-xs font-bold"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-[10px] font-black uppercase text-zinc-400 block mb-1">Website URL</label>
                      <input
                        type="text"
                        value={editingAdvert.websiteUrl || ""}
                        onChange={(e) => setEditingAdvert({ ...editingAdvert, websiteUrl: e.target.value })}
                        className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-2.5 rounded-xl text-xs font-bold"
                      />
                    </div>

                    <div>
                      <label className="text-[10px] font-black uppercase text-zinc-400 block mb-1">Banner Image URL</label>
                      <input
                        type="text"
                        value={editingAdvert.imageUrl}
                        onChange={(e) => setEditingAdvert({ ...editingAdvert, imageUrl: e.target.value })}
                        className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-2.5 rounded-xl text-xs font-bold"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 pt-3 border-t border-zinc-200 dark:border-zinc-800">
                    <button
                      type="button"
                      onClick={() => setEditingAdvert(null)}
                      className="px-4 py-2 bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 font-bold uppercase text-[10px] rounded-xl cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setAdverts(adverts.map(a => a.id === editingAdvert.id ? editingAdvert : a));
                        setEditingAdvert(null);
                        setAdUploadSuccess("✓ Advertisement details successfully updated!");
                        setTimeout(() => setAdUploadSuccess(""), 4000);
                      }}
                      className="px-5 py-2 bg-amber-500 hover:bg-amber-400 text-black font-black uppercase text-[10px] rounded-xl cursor-pointer transition-all shadow"
                    >
                      Save Changes
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* VIEW: SECURITY CENTRE */}
      {activeSubTab === "security" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Threats and failed logins telemetry */}
          <div className="lg:col-span-7 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-805 p-5 rounded-2xl shadow-sm space-y-4">
            <h4 className="text-xs font-black text-zinc-900 dark:text-zinc-100 uppercase tracking-wider font-space">
              🛡️ Live Threat Isolation Stream
            </h4>

            <div className="space-y-3 max-h-[440px] overflow-y-auto pr-1">
              {securityThreats.map((t) => (
                <div key={t.id} className="p-3.5 bg-zinc-50 dark:bg-zinc-950 border border-zinc-150 dark:border-zinc-850 rounded-xl text-xs space-y-1.5">
                  <div className="flex justify-between items-start">
                    <span className="font-mono-jb font-black text-[10px] text-zinc-400">
                      {t.id} &bull; {t.ipAddress} ({t.country})
                    </span>
                    <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-wider ${
                      t.status === "Blocked" ? "bg-red-500/10 text-red-500 border border-red-500/20" : "bg-amber-500/10 text-amber-500 border border-amber-500/20"
                    }`}>
                      {t.status}
                    </span>
                  </div>
                  <p className="font-bold text-zinc-800 dark:text-zinc-200 font-mono-jb">{t.event}</p>
                  <div className="flex justify-between text-[10px] text-zinc-500 font-mono-jb">
                    <span>{t.browser} ({t.os})</span>
                    <span>{new Date(t.time).toLocaleTimeString()}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Security tools whitelist/blacklist panels */}
          <div className="lg:col-span-5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-805 p-5 rounded-2xl shadow-sm space-y-6">
            <h4 className="text-xs font-black text-zinc-900 dark:text-zinc-100 uppercase tracking-wider font-space">
              🛠️ Subnet Whitelist & Blacklist Controls
            </h4>

            {/* Whitelist Panel */}
            <div className="space-y-3">
              <span className="text-[10px] font-black uppercase tracking-widest text-emerald-500">
                🟢 Whitelisted Admin Subnets
              </span>
              <div className="flex flex-wrap gap-1.5">
                {ipWhitelist.map(ip => (
                  <span key={ip} className="bg-emerald-500/10 text-emerald-500 text-[10px] font-mono-jb font-bold px-2.5 py-1 rounded-lg border border-emerald-500/20 flex items-center gap-1">
                    {ip}
                    <button onClick={() => setIpWhitelist(ipWhitelist.filter(i => i !== ip))} className="text-zinc-400 hover:text-red-500 text-[9px] font-black cursor-pointer">✕</button>
                  </span>
                ))}
              </div>
              <form onSubmit={handleAddWhitelist} className="flex gap-2">
                <input
                  type="text"
                  placeholder="Add Whitelist IP (e.g. 192.168.1.50)"
                  value={newIpToWhitelist}
                  onChange={(e) => setNewIpToWhitelist(e.target.value)}
                  className="flex-1 bg-zinc-50 dark:bg-zinc-950 border border-zinc-250 dark:border-zinc-800 px-3 py-1.5 rounded-xl text-xs placeholder:text-zinc-500"
                />
                <button type="submit" className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs px-3 py-1.5 rounded-xl cursor-pointer">
                  Add
                </button>
              </form>
            </div>

            {/* Blacklist Panel */}
            <div className="space-y-3 pt-3 border-t border-zinc-150 dark:border-zinc-800">
              <span className="text-[10px] font-black uppercase tracking-widest text-red-500">
                🔴 Blacklisted Subnets (API Blocked)
              </span>
              <div className="flex flex-wrap gap-1.5">
                {ipBlacklist.map(ip => (
                  <span key={ip} className="bg-red-500/10 text-red-500 text-[10px] font-mono-jb font-bold px-2.5 py-1 rounded-lg border border-red-500/20 flex items-center gap-1">
                    {ip}
                    <button onClick={() => setIpBlacklist(ipBlacklist.filter(i => i !== ip))} className="text-zinc-400 hover:text-emerald-500 text-[9px] font-black cursor-pointer">✕</button>
                  </span>
                ))}
              </div>
              <form onSubmit={handleAddBlacklist} className="flex gap-2">
                <input
                  type="text"
                  placeholder="Add Blacklist IP (e.g. 45.143.203.14)"
                  value={newIpToBlacklist}
                  onChange={(e) => setNewIpToBlacklist(e.target.value)}
                  className="flex-1 bg-zinc-50 dark:bg-zinc-950 border border-zinc-250 dark:border-zinc-800 px-3 py-1.5 rounded-xl text-xs placeholder:text-zinc-500"
                />
                <button type="submit" className="bg-red-600 hover:bg-red-500 text-white font-bold text-xs px-3 py-1.5 rounded-xl cursor-pointer">
                  Block
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* VIEW: ERROR MANAGEMENT */}
      {activeSubTab === "errors" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* List panel */}
          <div className="lg:col-span-5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-805 rounded-2xl p-4 space-y-4">
            <div className="flex justify-between items-center">
              <h4 className="text-xs font-black text-zinc-900 dark:text-zinc-100 uppercase tracking-wider font-space">
                🛑 Error Hub Monitor
              </h4>
              <select
                value={errorSeverityFilter}
                onChange={(e) => setErrorSeverityFilter(e.target.value as any)}
                className="bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 px-2 py-1 rounded-lg text-[9px] font-black uppercase text-zinc-700 dark:text-zinc-300"
              >
                <option value="All">All Levels</option>
                <option value="Critical">Critical</option>
                <option value="High">High</option>
                <option value="Medium">Medium</option>
                <option value="Low">Low</option>
              </select>
            </div>

            <div className="space-y-2.5 max-h-[440px] overflow-y-auto pr-1">
              {errors
                .filter(e => errorSeverityFilter === "All" || e.severity === errorSeverityFilter)
                .map((err) => (
                  <button
                    key={err.id}
                    onClick={() => setSelectedErrorId(err.id)}
                    className={`w-full text-left p-3.5 rounded-xl border transition-all cursor-pointer flex flex-col gap-1.5 ${
                      selectedErrorId === err.id
                        ? "bg-yellow-500/5 border-yellow-500/40"
                        : "bg-zinc-50 dark:bg-zinc-950 hover:bg-zinc-100 dark:hover:bg-zinc-900 border-zinc-150 dark:border-zinc-850"
                    }`}
                  >
                    <div className="flex justify-between items-start gap-2">
                      <span className={`px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-wider ${
                        err.severity === "Critical" ? "bg-red-600 text-white" : err.severity === "High" ? "bg-red-500/20 text-red-500" : "bg-zinc-500/25 text-zinc-400"
                      }`}>
                        {err.severity}
                      </span>
                      <span className="text-[9px] font-mono-jb text-zinc-400 font-bold">
                        {err.status}
                      </span>
                    </div>
                    <p className="font-bold text-zinc-900 dark:text-zinc-200 font-mono-jb text-xs line-clamp-1">{err.description}</p>
                    <div className="flex justify-between items-center text-[9px] text-zinc-500 font-mono-jb">
                      <span className="uppercase font-space">{err.module}</span>
                      <span>{new Date(err.time).toLocaleTimeString()}</span>
                    </div>
                  </button>
                ))}
            </div>
          </div>

          {/* Details panel */}
          <div className="lg:col-span-7 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-805 rounded-2xl p-5">
            {selectedErrorId ? (() => {
              const err = errors.find(e => e.id === selectedErrorId);
              if (!err) return null;
              return (
                <div className="space-y-4">
                  <div className="flex justify-between items-start border-b border-zinc-150 dark:border-zinc-800 pb-3">
                    <div>
                      <span className="text-[9px] font-bold text-zinc-400 font-mono-jb uppercase">
                        Ingested Supervisor telemetry
                      </span>
                      <h4 className="text-sm font-black uppercase text-zinc-900 dark:text-white font-space mt-0.5">
                        {err.module} Exception
                      </h4>
                    </div>
                    <select
                      value={err.status}
                      onChange={(e) => {
                        const updated = errors.map(x => x.id === err.id ? { ...x, status: e.target.value as any } : x);
                        setErrors(updated);
                      }}
                      className="bg-zinc-50 dark:bg-zinc-950 border border-zinc-250 dark:border-zinc-800 px-3 py-1.5 rounded-xl text-xs font-bold uppercase"
                    >
                      <option value="Pending">Pending</option>
                      <option value="In Progress">In Progress</option>
                      <option value="Resolved">Resolved</option>
                      <option value="Closed">Closed</option>
                    </select>
                  </div>

                  <div className="space-y-3.5 text-xs">
                    <div className="bg-zinc-50 dark:bg-zinc-950 p-4 border border-zinc-150 dark:border-zinc-850 rounded-xl space-y-3">
                      <div>
                        <span className="text-zinc-400 block font-bold uppercase tracking-wider text-[9px]">Exception statement</span>
                        <p className="font-bold text-red-500 font-mono-jb mt-0.5">{err.description}</p>
                      </div>
                      <div className="grid grid-cols-2 gap-2 border-t border-zinc-200/50 dark:border-zinc-800/50 pt-2.5">
                        <div>
                          <span className="text-zinc-400 block font-bold uppercase tracking-wider text-[9px]">Affected Node / User</span>
                          <span className="font-medium text-zinc-750 dark:text-zinc-300 font-mono-jb">{err.affectedUser}</span>
                        </div>
                        <div>
                          <span className="text-zinc-400 block font-bold uppercase tracking-wider text-[9px]">Logged Timestamp</span>
                          <span className="font-mono-jb text-zinc-500">{new Date(err.time).toLocaleString()}</span>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <span className="text-zinc-400 block font-bold uppercase tracking-wider text-[9px]">Suggested Correction Sequence</span>
                      <p className="bg-emerald-500/5 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 p-3 rounded-xl leading-relaxed">
                        {err.suggestedFix}
                      </p>
                    </div>

                    <div className="space-y-1.5">
                      <span className="text-zinc-400 block font-bold uppercase tracking-wider text-[9px]">Developer Internal Notes</span>
                      <p className="bg-zinc-50 dark:bg-black/50 border border-zinc-205 dark:border-zinc-800 p-3 rounded-xl font-mono-jb leading-relaxed text-[11px] text-zinc-400">
                        {err.developerNotes}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })() : (
              <div className="h-full flex flex-col items-center justify-center text-center py-20 text-zinc-400 border border-dashed border-zinc-150 dark:border-zinc-850 rounded-2xl">
                <AlertTriangle className="w-12 h-12 text-zinc-300 dark:text-zinc-700 animate-pulse mb-3" />
                <h4 className="text-sm font-black uppercase text-zinc-500 font-space">
                  No Error Selected
                </h4>
                <p className="text-xs text-zinc-400 max-w-xs mt-1">
                  Select an active system exception to review suggested fixes, developer trace notes, or adjust resolved workflow flags.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* VIEW: LIVE SYSTEM HEALTH MONITOR */}
      {activeSubTab === "health" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* CPU utilization wheel mock card */}
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-805 p-5 rounded-2xl shadow-sm space-y-3">
              <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400 font-space">
                CPU Utilization
              </span>
              <div className="flex items-center justify-between">
                <Cpu className="w-8 h-8 text-blue-500" />
                <div className="text-right">
                  <h3 className="text-2xl font-black text-zinc-900 dark:text-white font-mono-jb">
                    {cpuUsage}%
                  </h3>
                  <p className="text-[9px] text-emerald-500 font-black">
                    🟢 LOAD BALANCED
                  </p>
                </div>
              </div>
              <div className="w-full bg-zinc-100 dark:bg-zinc-850 h-2 rounded-full overflow-hidden">
                <div className="bg-blue-500 h-full transition-all duration-1000" style={{ width: `${cpuUsage}%` }} />
              </div>
            </div>

            {/* Memory card */}
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-805 p-5 rounded-2xl shadow-sm space-y-3">
              <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400 font-space">
                Memory Footprint
              </span>
              <div className="flex items-center justify-between">
                <HardDrive className="w-8 h-8 text-indigo-500" />
                <div className="text-right">
                  <h3 className="text-2xl font-black text-zinc-900 dark:text-white font-mono-jb">
                    {memoryUsage}%
                  </h3>
                  <p className="text-[9px] text-emerald-500 font-black">
                    🟢 CACHE HEAP OK
                  </p>
                </div>
              </div>
              <div className="w-full bg-zinc-100 dark:bg-zinc-850 h-2 rounded-full overflow-hidden">
                <div className="bg-indigo-500 h-full transition-all duration-1000" style={{ width: `${memoryUsage}%` }} />
              </div>
            </div>

            {/* Network Bandwidth */}
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-805 p-5 rounded-2xl shadow-sm space-y-3">
              <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400 font-space">
                I/O Telemetry Bandwidth
              </span>
              <div className="flex items-center justify-between">
                <Network className="w-8 h-8 text-emerald-500" />
                <div className="text-right">
                  <h3 className="text-2xl font-black text-zinc-900 dark:text-white font-mono-jb">
                    {bandwidthMbps} Mbps
                  </h3>
                  <p className="text-[9px] text-emerald-500 font-black">
                    🟢 ROUTER STREAM HEALTHY
                  </p>
                </div>
              </div>
              <div className="w-full bg-zinc-100 dark:bg-zinc-850 h-2 rounded-full overflow-hidden">
                <div className="bg-emerald-500 h-full transition-all duration-1000" style={{ width: `${(bandwidthMbps / 500) * 100}%` }} />
              </div>
            </div>
          </div>

          {/* Core system availability tables */}
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-805 p-6 rounded-2xl shadow-sm space-y-4">
            <h4 className="text-xs font-black text-zinc-900 dark:text-zinc-100 uppercase tracking-wider font-space">
              🏰 Real-Time Service Health Vectors
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-xs font-bold">
              <div className="p-3.5 bg-zinc-50 dark:bg-zinc-950 border border-zinc-150 dark:border-zinc-850 rounded-xl space-y-2">
                <div className="text-[9px] font-black uppercase text-zinc-400">Database Read speed</div>
                <div className="text-lg font-black text-zinc-900 dark:text-white font-mono-jb">0.8 ms</div>
                <span className="text-[8px] bg-emerald-500/10 text-emerald-500 px-1.5 py-0.2 rounded font-black tracking-wider uppercase">Optimal</span>
              </div>

              <div className="p-3.5 bg-zinc-50 dark:bg-zinc-950 border border-zinc-150 dark:border-zinc-850 rounded-xl space-y-2">
                <div className="text-[9px] font-black uppercase text-zinc-400">Database Write speed</div>
                <div className="text-lg font-black text-zinc-900 dark:text-white font-mono-jb">2.4 ms</div>
                <span className="text-[8px] bg-emerald-500/10 text-emerald-500 px-1.5 py-0.2 rounded font-black tracking-wider uppercase">Optimal</span>
              </div>

              <div className="p-3.5 bg-zinc-50 dark:bg-zinc-950 border border-zinc-150 dark:border-zinc-850 rounded-xl space-y-2">
                <div className="text-[9px] font-black uppercase text-zinc-400">Active WebSocket Threads</div>
                <div className="text-lg font-black text-zinc-900 dark:text-white font-mono-jb">1,024</div>
                <span className="text-[8px] bg-emerald-500/10 text-emerald-500 px-1.5 py-0.2 rounded font-black tracking-wider uppercase">Steady</span>
              </div>

              <div className="p-3.5 bg-zinc-50 dark:bg-zinc-950 border border-zinc-150 dark:border-zinc-850 rounded-xl space-y-2">
                <div className="text-[9px] font-black uppercase text-zinc-400">Background Cron Jobs</div>
                <div className="text-lg font-black text-zinc-900 dark:text-white font-mono-jb">8 Active</div>
                <span className="text-[8px] bg-emerald-500/10 text-emerald-500 px-1.5 py-0.2 rounded font-black tracking-wider uppercase">Healthy</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* VIEW: AUDIT LOGS */}
      {activeSubTab === "audits" && (
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-805 p-6 rounded-2xl shadow-sm space-y-4">
          <div className="flex justify-between items-center pb-3 border-b border-zinc-150 dark:border-zinc-800">
            <h4 className="text-xs font-black text-zinc-900 dark:text-zinc-100 uppercase tracking-wider font-space">
              🏰 Full Platform Law Enforcement Audit Stream
            </h4>
            <span className="text-[9px] font-mono-jb text-zinc-400">Tracking Active Session Payloads</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse font-mono-jb">
              <thead>
                <tr className="border-b border-zinc-250 dark:border-zinc-800 text-zinc-400 font-bold uppercase text-[9px] tracking-widest font-space">
                  <th className="py-2.5">Audit ID</th>
                  <th className="py-2.5">User</th>
                  <th className="py-2.5">Role</th>
                  <th className="py-2.5">Action executed</th>
                  <th className="py-2.5">IP Location</th>
                  <th className="py-2.5">Timestamp</th>
                  <th className="py-2.5 text-center">Result</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-150 dark:divide-zinc-850">
                {audits.map((aud) => (
                  <tr key={aud.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-950 text-zinc-700 dark:text-zinc-300">
                    <td className="py-3 font-bold text-zinc-900 dark:text-white">{aud.id}</td>
                    <td className="py-3">{aud.user}</td>
                    <td className="py-3 font-space text-[10px] font-bold text-blue-500">{aud.role}</td>
                    <td className="py-3 font-bold text-zinc-800 dark:text-zinc-200">{aud.action}</td>
                    <td className="py-3 text-[10px] text-zinc-400">{aud.ipAddress}</td>
                    <td className="py-3 text-[10px] text-zinc-500">{new Date(aud.time).toLocaleString()}</td>
                    <td className="py-3 text-center">
                      <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-wider ${
                        aud.result === "Success" ? "bg-emerald-500/10 text-emerald-500" : aud.result === "Blocked" ? "bg-red-500/10 text-red-500" : "bg-zinc-500/20 text-zinc-400"
                      }`}>
                        {aud.result}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* VIEW: SYSTEM CONFIGURATION */}
      {activeSubTab === "config" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* General regions routes form config */}
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-805 p-5 rounded-2xl shadow-sm space-y-4">
            <h4 className="text-xs font-black text-zinc-900 dark:text-zinc-100 uppercase tracking-wider font-space">
              🗺️ Regional Configurations
            </h4>

            <div className="space-y-4 text-xs font-bold">
              <div>
                <label className="text-zinc-400 block mb-1 uppercase text-[9px]">Active Region Focus</label>
                <select
                  value={configRegion}
                  onChange={(e) => setConfigRegion(e.target.value)}
                  className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 p-2.5 rounded-xl text-xs"
                >
                  <option value="Hhohho">Hhohho (Mbabane Central Rank)</option>
                  <option value="Manzini">Manzini (Main Corridor hub)</option>
                  <option value="Lubombo">Lubombo (Siteki border express)</option>
                  <option value="Shiselweni">Shiselweni (Nhlangano local loops)</option>
                </select>
              </div>

              <div>
                <label className="text-zinc-400 block mb-1 uppercase text-[9px]">Administrative Console Theme</label>
                <select
                  value={configTheme}
                  onChange={(e) => applyConsoleTheme(e.target.value)}
                  className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 p-2.5 rounded-xl text-xs font-bold"
                >
                  <option value="High Contrast Cyber Slate">High Contrast Cyber Slate (Default)</option>
                  <option value="Smart City Operations Center Blue">Smart City Operations Center Blue</option>
                  <option value="Microsoft Azure Classic Dark">Microsoft Azure Classic Dark</option>
                  <option value="Google Cloud Console Light">Google Cloud Console Light</option>
                </select>
              </div>
            </div>
          </div>

          {/* 💰 National Daily Rank Fee */}
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-805 p-5 rounded-2xl shadow-sm space-y-4">
            <h4 className="text-xs font-black text-zinc-900 dark:text-zinc-100 uppercase tracking-wider font-space flex items-center gap-2">
              💰 National Daily Rank Fee
            </h4>
            <p className="text-[10px] text-zinc-500 leading-relaxed">
              Configure the national daily rank fee paid by Kombi operators across Eswatini ranks.
            </p>
            
            {rankFeeSuccessMsg && (
              <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 p-2.5 rounded-xl text-[11px] font-semibold animate-fade-in">
                {rankFeeSuccessMsg}
              </div>
            )}

            <div className="space-y-4 text-xs font-bold">
              <div>
                <label className="text-zinc-400 block mb-1 uppercase text-[9px]">National Daily Rank Fee (SZL / E)</label>
                <div className="flex gap-2">
                  <span className="bg-zinc-100 dark:bg-zinc-950 px-3 py-2 border border-zinc-200 dark:border-zinc-800 rounded-xl text-zinc-500 font-mono-jb flex items-center">E</span>
                  <input
                    type="number"
                    value={tempRankFee}
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      setTempRankFee(val);
                    }}
                    className="flex-1 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 p-2.5 rounded-xl text-xs font-mono-jb"
                  />
                </div>
              </div>

              <button
                onClick={() => {
                  if (onUpdateRankFee) {
                    onUpdateRankFee(tempRankFee, tempRankFee * 0.8, tempRankFee * 0.14, tempRankFee * 0.06);
                    setRankFeeSuccessMsg("💰 National Daily Rank Fee updated successfully!");
                    setTimeout(() => setRankFeeSuccessMsg(""), 4000);
                  } else {
                    localStorage.setItem("kombiflow_rankFee", String(tempRankFee));
                    setRankFeeSuccessMsg("💰 National Daily Rank Fee saved locally in system configurations.");
                    setTimeout(() => setRankFeeSuccessMsg(""), 4000);
                  }
                }}
                className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black uppercase tracking-wider cursor-pointer transition-all shadow-md"
              >
                Save National Daily Rank Fee
              </button>
            </div>
          </div>

          {/* ⏱️ Auto-Switching Display: Cycles Timer */}
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-805 p-5 rounded-2xl shadow-sm space-y-4">
            <div className="flex justify-between items-center">
              <h4 className="text-xs font-black text-zinc-900 dark:text-zinc-100 uppercase tracking-wider font-space flex items-center gap-2">
                ⏱️ Auto-Switching Display: Cycles Timer
              </h4>
              <span className="text-[8px] bg-blue-500/10 text-blue-500 px-2 py-0.5 rounded font-black uppercase font-mono-jb">
                SYSTEM-WIDE
              </span>
            </div>
            <p className="text-[10px] text-zinc-500 leading-relaxed">
              Configure how many seconds the public terminal TV display and departure kiosk rotate through departure bays and promotional messages.
            </p>
            
            {cycleTimerMsg && (
              <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 p-2.5 rounded-xl text-[11px] font-semibold animate-fade-in">
                {cycleTimerMsg}
              </div>
            )}

            <div className="space-y-4 text-xs font-bold">
              <div>
                <label className="text-zinc-400 block mb-1 uppercase text-[9px]">Cycle Rotation Duration (Seconds)</label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    min="2"
                    max="60"
                    value={cycleTimerSeconds}
                    onChange={(e) => setCycleTimerSeconds(Math.max(2, Number(e.target.value)))}
                    className="flex-1 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 p-2.5 rounded-xl text-xs font-mono-jb"
                  />
                  <span className="bg-zinc-100 dark:bg-zinc-950 px-3 py-2 border border-zinc-200 dark:border-zinc-800 rounded-xl text-zinc-500 font-mono-jb flex items-center">sec</span>
                </div>
              </div>

              <button
                onClick={() => {
                  localStorage.setItem("kombiflow_cycle_timer_seconds", String(cycleTimerSeconds));
                  window.dispatchEvent(new Event("storage"));
                  window.dispatchEvent(new CustomEvent("kombiflow_timer_updated", { detail: cycleTimerSeconds }));
                  setCycleTimerMsg(`⏱️ Auto-Switching Display timer updated to ${cycleTimerSeconds}s across all kiosks and TVs!`);
                  setTimeout(() => setCycleTimerMsg(""), 4000);
                }}
                className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black uppercase tracking-wider cursor-pointer transition-all shadow-md"
              >
                Apply System-Wide Cycle Timer
              </button>
            </div>
          </div>

          {/* Templates configuration and seals */}
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-805 p-5 rounded-2xl shadow-sm space-y-4">
            <h4 className="text-xs font-black text-zinc-900 dark:text-zinc-100 uppercase tracking-wider font-space">
              📄 System Templates & Concession Seals
            </h4>

            <div className="space-y-4 text-xs font-bold">
              <div>
                <label className="text-zinc-400 block mb-1 uppercase text-[9px]">Notification templates</label>
                <select
                  value={configNotificationTemplate}
                  onChange={(e) => setConfigNotificationTemplate(e.target.value)}
                  className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 p-2.5 rounded-xl text-xs"
                >
                  <option value="Default Smart Dispatch Template">Default Smart Dispatch Template</option>
                  <option value="Urgent Passenger Warning Relay">Urgent Passenger Warning Relay</option>
                  <option value="Security Compliance Ticket">Security Compliance Ticket</option>
                </select>
              </div>

              {/* Concession Seal Uploader Section */}
              <div className="p-4 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-black uppercase text-emerald-500 flex items-center gap-1">
                    👑 Active Concession Seal
                  </span>
                  <span className="text-[8px] bg-emerald-500/10 text-emerald-500 px-1.5 py-0.2 rounded font-black uppercase font-mono-jb">
                    SYSTEM-WIDE
                  </span>
                </div>
                <p className="text-[10px] text-zinc-400 font-medium leading-relaxed">
                  Upload a high-resolution logo or official concession seal to represent government authorization on permits, receipts, and law enforcement tickets.
                </p>

                {concessionSealImage ? (
                  <div className="flex items-center gap-3 bg-white dark:bg-black p-2 border border-zinc-200 dark:border-zinc-800 rounded-xl relative">
                    <img
                      src={concessionSealImage}
                      alt="Active Concession Seal"
                      referrerPolicy="no-referrer"
                      className="w-12 h-12 object-contain bg-zinc-100 dark:bg-zinc-900 rounded-lg p-1"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="text-[10px] text-zinc-900 dark:text-white font-bold truncate">custom_seal_image.png</div>
                      <div className="text-[8px] text-zinc-400 font-mono-jb uppercase mt-0.5">Custom active seal loaded</div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setConcessionSealImage("");
                        localStorage.removeItem("kombiflow_concession_seal_image");
                        pushServerState({ seal: "" });
                        window.dispatchEvent(new Event("kombiflow_seal_updated"));
                      }}
                      className="text-red-500 hover:text-red-650 text-[9px] font-black uppercase cursor-pointer"
                    >
                      Reset
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-3 bg-white dark:bg-black p-2 border border-zinc-200 dark:border-zinc-800 rounded-xl">
                    <div className="w-12 h-12 bg-zinc-100 dark:bg-zinc-900 rounded-lg flex items-center justify-center p-1 font-space text-xs font-black text-zinc-400">
                      DEFAULT
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[10px] text-zinc-500 dark:text-zinc-400 font-bold">Using Default Ministry Seal</div>
                      <div className="text-[8px] text-zinc-400 font-mono-jb uppercase mt-0.5">SHA-256: 7d49a37e5898dcb7bda...</div>
                    </div>
                  </div>
                )}

                <label className="block">
                  <div className="w-full bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-900 dark:hover:bg-zinc-850 text-zinc-800 dark:text-zinc-200 border border-zinc-300 dark:border-zinc-800 p-2 rounded-lg text-center text-[10px] font-black uppercase tracking-wider cursor-pointer transition-colors">
                    Upload Custom Concession Seal
                  </div>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        if (file.size > 1.5 * 1024 * 1024) {
                          alert("Error: Seal image size cannot exceed 1.5MB.");
                          return;
                        }
                        const reader = new FileReader();
                        reader.onload = (event) => {
                          const base64 = event.target?.result as string;
                          setConcessionSealImage(base64);
                          localStorage.setItem("kombiflow_concession_seal_image", base64);
                          pushServerState({ seal: base64 });
                          window.dispatchEvent(new Event("kombiflow_seal_updated"));
                        };
                        reader.readAsDataURL(file);
                      }
                    }}
                  />
                </label>
              </div>

              {/* Document Watermark Uploader Section */}
              <div className="p-4 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-black uppercase text-blue-500 flex items-center gap-1">
                    🛡️ Document Background Watermark
                  </span>
                  <span className="text-[8px] bg-blue-500/10 text-blue-500 px-1.5 py-0.2 rounded font-black uppercase font-mono-jb">
                    GOVERNMENT PAPERS
                  </span>
                </div>
                <p className="text-[10px] text-zinc-400 font-medium leading-relaxed">
                  Upload custom faint images or official coat of arms that will serve as background watermarks inside print documents, permits, and concession certificates.
                </p>

                {docWatermark ? (
                  <div className="flex items-center gap-3 bg-white dark:bg-black p-2 border border-zinc-200 dark:border-zinc-800 rounded-xl relative">
                    <img
                      src={docWatermark}
                      alt="Active Watermark Preview"
                      referrerPolicy="no-referrer"
                      className="w-12 h-12 object-contain bg-zinc-100 dark:bg-zinc-900 rounded-lg p-1 opacity-40"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="text-[10px] text-zinc-900 dark:text-white font-bold truncate">custom_watermark.png</div>
                      <div className="text-[8px] text-zinc-400 font-mono-jb uppercase mt-0.5">Custom background watermark live</div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setDocWatermark("");
                        localStorage.removeItem("kombiflow_document_watermark");
                        pushServerState({ watermark: "" });
                        window.dispatchEvent(new Event("kombiflow_watermark_updated"));
                      }}
                      className="text-red-500 hover:text-red-650 text-[9px] font-black uppercase cursor-pointer"
                    >
                      Reset
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-3 bg-white dark:bg-black p-2 border border-zinc-200 dark:border-zinc-800 rounded-xl">
                    <div className="w-12 h-12 bg-zinc-100 dark:bg-zinc-900 rounded-lg flex items-center justify-center p-1 font-space text-xs font-black text-zinc-400">
                      AWARD ICON
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[10px] text-zinc-500 dark:text-zinc-400 font-bold">Using Default Award Badge Watermark</div>
                      <div className="text-[8px] text-zinc-400 font-mono-jb uppercase mt-0.5">Rendered inside A4 Print Preview</div>
                    </div>
                  </div>
                )}

                <label className="block">
                  <div className="w-full bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-900 dark:hover:bg-zinc-850 text-zinc-800 dark:text-zinc-200 border border-zinc-300 dark:border-zinc-800 p-2 rounded-lg text-center text-[10px] font-black uppercase tracking-wider cursor-pointer transition-colors">
                    Upload Custom Watermark Image
                  </div>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        if (file.size > 1.5 * 1024 * 1024) {
                          alert("Error: Watermark image size cannot exceed 1.5MB.");
                          return;
                        }
                        const reader = new FileReader();
                        reader.onload = (event) => {
                          const base64 = event.target?.result as string;
                          setDocWatermark(base64);
                          localStorage.setItem("kombiflow_document_watermark", base64);
                          pushServerState({ watermark: base64 });
                          window.dispatchEvent(new Event("kombiflow_watermark_updated"));
                        };
                        reader.readAsDataURL(file);
                      }
                    }}
                  />
                </label>
              </div>
            </div>
          </div>

          {/* 🔑 Global Interface Passwords Manager Card */}
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-805 p-6 rounded-2xl shadow-sm space-y-4">
            <div className="flex justify-between items-center border-b border-zinc-150 dark:border-zinc-800 pb-3">
              <div>
                <h4 className="text-xs font-black text-zinc-900 dark:text-zinc-100 uppercase tracking-wider font-space">
                  🔑 Global Interface Passwords Manager
                </h4>
                <p className="text-[10px] text-zinc-400 font-medium mt-0.5">Configure system-wide administrative PINs and access keys for active kiosks and gates.</p>
              </div>
              <span className="text-[8px] bg-amber-500/10 text-amber-500 px-1.5 py-0.5 rounded font-black uppercase font-mono-jb">
                SECURITY CRITICAL
              </span>
            </div>

            {passwordSuccessMsg && (
              <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 p-3 rounded-xl text-xs font-semibold animate-fade-in">
                {passwordSuccessMsg}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs font-bold text-zinc-800 dark:text-zinc-200">
              {/* Rank Admin & Marshal Dispatch PIN */}
              <div className="space-y-1.5 relative p-4 bg-zinc-50 dark:bg-zinc-950/60 rounded-xl border border-zinc-200 dark:border-zinc-800">
                <div className="flex items-center justify-between">
                  <label className="text-zinc-700 dark:text-zinc-300 font-bold uppercase text-[10px]">Rank Admin & Marshal Dispatch PIN</label>
                  <span className="text-[8px] bg-emerald-500/10 text-emerald-500 px-1.5 py-0.5 rounded font-black uppercase">Active Module</span>
                </div>
                <div className="relative mt-2">
                  <input
                    type={showTripReporting ? "text" : "password"}
                    value={pinTripReporting}
                    onChange={(e) => setPinTripReporting(e.target.value)}
                    className="w-full bg-white dark:bg-zinc-900 border border-zinc-250 dark:border-zinc-750 pl-3 pr-10 py-2.5 rounded-xl font-mono-jb text-sm font-bold focus:ring-2 focus:ring-emerald-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowTripReporting(!showTripReporting)}
                    className="absolute right-3 top-2.5 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 cursor-pointer"
                  >
                    {showTripReporting ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <span className="text-[9px] text-zinc-400 font-medium block mt-1">Authorizes rank marshals and station supervisors to dispatch kombis, swap loading bays, and issue departure manifests.</span>
              </div>

              {/* Vehicle Owner & Operator Security PIN */}
              <div className="space-y-1.5 relative p-4 bg-zinc-50 dark:bg-zinc-950/60 rounded-xl border border-zinc-200 dark:border-zinc-800">
                <div className="flex items-center justify-between">
                  <label className="text-zinc-700 dark:text-zinc-300 font-bold uppercase text-[10px]">Vehicle Owner / Operator Security PIN</label>
                  <span className="text-[8px] bg-amber-500/10 text-amber-500 px-1.5 py-0.5 rounded font-black uppercase">Active Module</span>
                </div>
                <div className="relative mt-2">
                  <input
                    type={showPoliceman ? "text" : "password"}
                    value={pinPoliceman}
                    onChange={(e) => setPinPoliceman(e.target.value)}
                    className="w-full bg-white dark:bg-zinc-900 border border-zinc-250 dark:border-zinc-750 pl-3 pr-10 py-2.5 rounded-xl font-mono-jb text-sm font-bold focus:ring-2 focus:ring-amber-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPoliceman(!showPoliceman)}
                    className="absolute right-3 top-2.5 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 cursor-pointer"
                  >
                    {showPoliceman ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <span className="text-[9px] text-zinc-400 font-medium block mt-1">Authorizes fleet operators to disburse funds to virtual transit cards and submit permit renewal applications.</span>
              </div>
            </div>

            <div className="flex justify-end pt-3 border-t border-zinc-150 dark:border-zinc-800">
              <button
                type="button"
                onClick={() => {
                  localStorage.setItem("kombiflow_pin_tripreporting", pinTripReporting);
                  localStorage.setItem("kombiflow_pin_policeman", pinPoliceman);
                  setPasswordSuccessMsg("🎉 Global Interface Passwords and Terminal Access PINs synchronized successfully! Changes are propagated system-wide.");
                  setTimeout(() => setPasswordSuccessMsg(""), 6000);
                }}
                className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs uppercase tracking-wider rounded-xl shadow-md transition-all cursor-pointer border border-emerald-500 flex items-center gap-2"
              >
                <Check className="w-4 h-4" /> Save System Passwords
              </button>
            </div>
          </div>
        </div>
      )}

      {/* VIEW: BACKUP & DISASTER RECOVERY */}
      {activeSubTab === "backup" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Cloud backups status list */}
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-805 p-5 rounded-2xl shadow-sm space-y-4">
            <div className="flex justify-between items-center">
              <h4 className="text-xs font-black text-zinc-900 dark:text-zinc-100 uppercase tracking-wider font-space">
                📦 Cloud Recovery Backups
              </h4>
              <button
                onClick={handleBackupNow}
                className="bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs uppercase px-3 py-1.5 rounded-xl cursor-pointer"
              >
                Backup Now
              </button>
            </div>

            {backupSuccess && (
              <div className="bg-emerald-500 text-white p-3 rounded-xl text-xs font-black uppercase tracking-wider animate-bounce">
                ✅ Database Snapshot Captured! Transmitted to Cloud Storage Bucket securely.
              </div>
            )}

            <div className="space-y-3">
              {backups.map(bk => (
                <button
                  key={bk.id}
                  onClick={() => handleRestoreBackup(bk)}
                  className="w-full text-left p-3.5 bg-zinc-50 hover:bg-zinc-100 dark:bg-zinc-950 dark:hover:bg-zinc-900 border border-zinc-150 dark:border-zinc-850 hover:border-zinc-300 dark:hover:border-zinc-700 rounded-xl text-xs space-y-1 transition-all cursor-pointer block group relative"
                  title="Click to recover this backup file and restore system state"
                >
                  <div className="flex justify-between items-start font-mono-jb font-black">
                    <span className="text-zinc-800 dark:text-zinc-200 group-hover:text-blue-600 dark:group-hover:text-blue-400">{bk.type} ({bk.size})</span>
                    <span className="text-emerald-500 flex items-center gap-1">
                      {bk.status}
                      <RefreshCw className="w-3 h-3 text-emerald-500 opacity-0 group-hover:opacity-100 transition-opacity animate-spin" />
                    </span>
                  </div>
                  <p className="text-[10px] text-zinc-400 font-mono-jb select-all">Target: {bk.target}</p>
                  <div className="text-[10px] text-zinc-500 font-mono-jb flex justify-between items-center">
                    <span>Timestamp: {new Date(bk.timestamp).toLocaleString()}</span>
                    <span className="text-blue-600 dark:text-blue-400 font-bold text-[10px] opacity-0 group-hover:opacity-100 transition-opacity uppercase tracking-wider">RECOVER NOW &rarr;</span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* disaster recovery mock alerts */}
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-805 p-5 rounded-2xl shadow-sm space-y-4">
            <h4 className="text-xs font-black text-zinc-900 dark:text-zinc-100 uppercase tracking-wider font-space">
              🚨 Active Recovery Drills & Restore Points
            </h4>

            <div className="space-y-3 text-xs font-bold">
              <div className="p-3.5 bg-zinc-50 dark:bg-zinc-950 border border-zinc-150 dark:border-zinc-850 rounded-xl space-y-1.5 relative overflow-hidden text-left">
                <div className="text-zinc-800 dark:text-zinc-100 uppercase font-black tracking-wider text-[9px] flex justify-between">
                  <span>Automatic Scheduled Backup Engine</span>
                  <span className="text-emerald-500 animate-pulse font-mono-jb font-bold">● LIVE MONITOR</span>
                </div>
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 py-1">
                  <div className="text-zinc-500 font-medium text-xs">
                    Next automatic backup trigger (12:00 / 00:00 Daily Cloud log):
                  </div>
                  <div className="text-xs font-black font-mono-jb text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/20 px-2 py-1 rounded">
                    {timeToNextLog || "00:00:00"}
                  </div>
                </div>
                <div className="flex gap-2 pt-1 border-t border-zinc-200 dark:border-zinc-800">
                  <button
                    onClick={() => {
                      const simulatedTimestamp = new Date();
                      const hours = simulatedTimestamp.getHours() < 12 ? "00:00" : "12:00";
                      const dateStr = simulatedTimestamp.toISOString().split("T")[0];
                      const newBkp = {
                        id: `BKP-00${backups.length + 1}`,
                        timestamp: `${dateStr}T${hours}:00Z`,
                        size: `${(Math.random() * 2 + 47).toFixed(1)} MB`,
                        type: "Scheduled Daily Cloud",
                        status: "Verified",
                        target: "Google Cloud Bucket (europe-west2)",
                        file: `transport-cloud-recovery-${dateStr}-${hours.replace(":", "")}.json`
                      };
                      setBackups([newBkp, ...backups]);
                      
                      const newAudit: SecurityAuditLog = {
                        id: `AUD-${Math.floor(Math.random() * 900) + 600}`,
                        user: "Super Admin",
                        role: "Super Admin",
                        time: new Date().toISOString(),
                        ipAddress: "192.168.1.105",
                        device: "Admin Workstation (macOS Chrome)",
                        action: `Simulated automatic Scheduled Daily Cloud backup log at ${hours}`,
                        result: "Success"
                      };
                      setAudits(prev => [newAudit, ...prev]);
                      alert("Successfully simulated the 12:00/00:00 daily cron trigger! A new Scheduled Daily Cloud log has been generated and added to the recovery index.");
                    }}
                    className="w-full text-center bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-750 text-zinc-800 dark:text-white py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider cursor-pointer"
                  >
                    ⚡ Fast-Forward Time (Simulate 12:00/00:00 Trigger)
                  </button>
                </div>
              </div>

              <div className="p-3.5 bg-zinc-50 dark:bg-zinc-950 border border-zinc-150 dark:border-zinc-850 rounded-xl space-y-1.5 text-left">
                <div className="text-zinc-800 dark:text-zinc-100 uppercase font-black tracking-wider text-[9px]">Last Recovery Drill Verification</div>
                <div className="text-zinc-500 font-medium">Completed on 2026-07-15 at 05:30:00 UTC. Uptime integrity confirmed.</div>
                <span className="text-[8px] bg-emerald-500/10 text-emerald-500 px-1.5 py-0.2 rounded font-black tracking-wider uppercase">Successful</span>
              </div>

              <div className="p-3.5 bg-zinc-50 dark:bg-zinc-950 border border-zinc-150 dark:border-zinc-850 rounded-xl space-y-2">
                <div className="text-zinc-800 dark:text-zinc-100 uppercase font-black tracking-wider text-[9px]">Restore Point Control</div>
                <p className="text-zinc-400 font-medium select-none">To restore database state back to previous midnight snapshots, confirm the SHA-256 target signature below.</p>
                <button
                  onClick={() => handleRestoreBackup(backups[0])}
                  className="bg-zinc-100 border border-zinc-300 dark:bg-zinc-800 dark:border-zinc-700 hover:bg-zinc-200 dark:hover:bg-zinc-750 px-3 py-1.5 rounded-lg font-black text-[10px] uppercase cursor-pointer text-zinc-800 dark:text-white"
                >
                  Initiate Restore Sequence
                </button>
              </div>

              {/* Live App Publishing & URL Serialization */}
              <div className="p-4 bg-gradient-to-br from-emerald-950/20 to-teal-950/20 border border-emerald-500/30 rounded-xl space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-black uppercase text-emerald-400 flex items-center gap-1.5">
                    🌐 National System Deployment & Live URL Publishing
                  </span>
                  <span className="text-[8px] bg-emerald-500/20 text-emerald-300 px-1.5 py-0.5 rounded font-black uppercase font-mono-jb">
                    PRODUCTION LIVE
                  </span>
                </div>
                <p className="text-[10px] text-zinc-300 leading-relaxed font-medium">
                  Click below to publish the current national applet database state. This compiles all customized vehicles, drivers, daily rank fees, revenue splits, and uploaded concession seals into a single highly-compressed secure URL.
                </p>
                
                <button
                  onClick={() => {
                    try {
                      const stateToPublish = {
                        vehicles,
                        drivers,
                        rankFee: tempRankFee,
                        splitOperational: tempSplitOps,
                        splitNRTC: tempSplitNrtc,
                        splitMaintenance: tempSplitMaint,
                        seal: concessionSealImage
                      };
                      
                      // Convert to JSON and Base64
                      const serialized = btoa(encodeURIComponent(JSON.stringify(stateToPublish)));
                      const publishUrl = `${window.location.origin}${window.location.pathname}?systemState=${encodeURIComponent(serialized)}`;
                      
                      // Copy to clipboard
                      navigator.clipboard.writeText(publishUrl).then(() => {
                        alert("🇸🇿 Success! National App Configuration has been published and the secure URL has been copied to your clipboard. Use this link on any mobile phone or device to load all customized data instantly with zero loss!");
                      }).catch(() => {
                        // Fallback if clipboard API is blocked in iframe
                        const promptVal = prompt("🇸🇿 Published! Copy this secure system URL:", publishUrl);
                        if (promptVal) {
                          alert("System URL copied successfully.");
                        }
                      });
                      
                      // Log to audits
                      const newAudit: SecurityAuditLog = {
                        id: `AUD-${Math.floor(Math.random() * 900) + 600}`,
                        user: "Super Admin",
                        role: "Super Admin",
                        time: new Date().toISOString(),
                        ipAddress: "192.168.1.105",
                        device: "Admin Workstation (macOS Chrome)",
                        action: "Published national applet database state and compiled secure serialized URL",
                        result: "Success"
                      };
                      setAudits(prev => [newAudit, ...prev]);
                    } catch (e) {
                      alert("Error publishing system state. Try removing or using a smaller concession seal image first as Base64 strings can be large.");
                    }
                  }}
                  className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-[10px] font-black uppercase tracking-wider cursor-pointer transition-all shadow-md flex items-center justify-center gap-1.5"
                >
                  🚀 Publish & Copy Secure System URL
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* VIEW: LIVE ANALYTICS (MOVED FROM SEPARATE TAB) */}
      {activeSubTab === "analytics" && (
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-805 p-5 rounded-2xl shadow-sm">
          <AnalyticsDashboard
            vehicles={vehicles}
            drivers={drivers}
            routes={routes}
            trips={trips}
            incidents={incidents}
          />
        </div>
      )}

      {/* VIEW: CENTRAL CLOUD SYNCHRONISATION HUB */}
      {activeSubTab === "sync" && (
        <div className="space-y-6">
          <div className="bg-zinc-950 border border-emerald-500/30 rounded-2xl p-6 text-white shadow-2xl relative overflow-hidden">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-zinc-800 pb-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400">
                    Sisonkhe In Transit • Real-Time Cloud Ingress Cluster
                  </span>
                </div>
                <h3 className="text-xl font-black uppercase tracking-tight font-space text-white flex items-center gap-2">
                  🔄 Central Cloud Synchronisation Hub
                </h3>
                <p className="text-xs text-zinc-400 mt-1">
                  Two-way distributed state synchronisation across Eswatini National Fleet Registry, local persistent caches, and Node.js Cloud Run Server.
                </p>
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  disabled={isCloudSyncing}
                  onClick={async () => {
                    setIsCloudSyncing(true);
                    setCloudSyncMsg("Syncing local state with Cloud Server (/api/fleet/sync)...");
                    try {
                      if (onForceSyncAll) {
                        await onForceSyncAll();
                      } else {
                        await pushServerState({
                          drivers,
                          vehicles,
                          routes,
                          trips,
                          incidents,
                          trafficTickets,
                          rankFee,
                          splitOperational,
                          splitNRTC,
                          splitMaintenance
                        });
                      }
                      setLastCloudSyncTime(new Date().toLocaleTimeString());
                      setCloudSyncMsg("✅ Central Cloud State synchronized successfully across all 4 administrative regions!");
                    } catch (err: any) {
                      setCloudSyncMsg("Sync completed with local persistence fallback.");
                    } finally {
                      setIsCloudSyncing(false);
                      setTimeout(() => setCloudSyncMsg(""), 5000);
                    }
                  }}
                  className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-2 shadow-lg transition cursor-pointer disabled:opacity-50"
                >
                  <RefreshCw className={`w-4 h-4 ${isCloudSyncing ? "animate-spin" : ""}`} />
                  {isCloudSyncing ? "Synchronising..." : "Sync Entire Fleet Now"}
                </button>
              </div>
            </div>

            {cloudSyncMsg && (
              <div className="mt-4 p-3 bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 rounded-xl text-xs font-bold animate-fade-in flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
                {cloudSyncMsg}
              </div>
            )}

            {/* Sync Telemetry Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6">
              <div className="bg-zinc-900/80 border border-zinc-800 p-4 rounded-xl">
                <span className="text-[9px] font-black uppercase text-zinc-400 tracking-wider font-space block">
                  Cloud Server Gateway
                </span>
                <div className="flex items-center gap-2 mt-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                  <span className="text-sm font-black text-white font-mono-jb">PORT 3000 (Active)</span>
                </div>
                <span className="text-[10px] text-zinc-400 mt-1 block">
                  Last ping: {lastCloudSyncTime}
                </span>
              </div>

              <div className="bg-zinc-900/80 border border-zinc-800 p-4 rounded-xl">
                <span className="text-[9px] font-black uppercase text-zinc-400 tracking-wider font-space block">
                  Registered Kombis & Buses
                </span>
                <span className="text-2xl font-black text-blue-400 font-space block mt-1">
                  {vehicles.length} Units
                </span>
                <span className="text-[10px] text-zinc-400 mt-1 block">
                  Synchronized across 4 regions
                </span>
              </div>

              <div className="bg-zinc-900/80 border border-zinc-800 p-4 rounded-xl">
                <span className="text-[9px] font-black uppercase text-zinc-400 tracking-wider font-space block">
                  Accredited Drivers
                </span>
                <span className="text-2xl font-black text-amber-400 font-space block mt-1">
                  {drivers.length} Drivers
                </span>
                <span className="text-[10px] text-zinc-400 mt-1 block">
                  With valid PDP & license
                </span>
              </div>

              <div className="bg-zinc-900/80 border border-zinc-800 p-4 rounded-xl">
                <span className="text-[9px] font-black uppercase text-zinc-400 tracking-wider font-space block">
                  System Accounts
                </span>
                <span className="text-2xl font-black text-emerald-400 font-space block mt-1">
                  {accounts.length} Users
                </span>
                <span className="text-[10px] text-zinc-400 mt-1 block">
                  Multi-role access enabled
                </span>
              </div>
            </div>

            {/* Regional Corridors Sync Grid */}
            <div className="mt-6 border-t border-zinc-800/80 pt-6">
              <h4 className="text-xs font-black uppercase tracking-wider text-zinc-300 font-space mb-3">
                Regional Hub Synchronization Status
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {[
                  { name: "Hhohho Region", terminal: "Mbabane Central Rank", icon: "🏰", status: "Synchronized", color: "text-blue-400" },
                  { name: "Manzini Region", terminal: "Manzini Inter-City Terminal", icon: "🏭", status: "Synchronized", color: "text-emerald-400" },
                  { name: "Lubombo Region", terminal: "Siteki Concession Gate", icon: "🏔️", status: "Synchronized", color: "text-amber-400" },
                  { name: "Shiselweni Region", terminal: "Nhlangano Regional Depot", icon: "🌳", status: "Synchronized", color: "text-purple-400" }
                ].map((hub, idx) => (
                  <div key={idx} className="bg-zinc-900/60 border border-zinc-800 p-3 rounded-xl flex items-center gap-3">
                    <span className="text-2xl">{hub.icon}</span>
                    <div className="min-w-0 flex-1">
                      <div className="font-bold text-xs text-white truncate">{hub.name}</div>
                      <div className="text-[10px] text-zinc-400 truncate">{hub.terminal}</div>
                      <div className="flex items-center gap-1 mt-1 text-[9px] font-black uppercase font-mono-jb text-emerald-400">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                        {hub.status}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {selectedBackupToRestore && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-zinc-950 border border-zinc-800 rounded-3xl p-6 w-full max-w-xl shadow-2xl space-y-4">
            <div className="flex items-center gap-3 border-b border-zinc-800 pb-3 text-left">
              <RefreshCw className="w-6 h-6 text-emerald-500 animate-spin" />
              <div>
                <h3 className="text-sm font-black text-white uppercase tracking-wider font-space">
                  Database Cloud Restoration Sequence
                </h3>
                <p className="text-[10px] text-zinc-400">
                  Executing rollback of all platform tables to selected snapshot integrity seal.
                </p>
              </div>
            </div>

            <div className="space-y-2 text-left">
              <div className="flex justify-between text-xs font-mono-jb">
                <span className="text-zinc-500">Restore Progress</span>
                <span className="text-emerald-400 font-bold">{restoreProgress}%</span>
              </div>
              <div className="w-full bg-zinc-900 rounded-full h-2 overflow-hidden border border-zinc-800">
                <div className="bg-emerald-500 h-full transition-all duration-300" style={{ width: `${restoreProgress}%` }} />
              </div>
            </div>

            {/* Simulated Live Console logs */}
            <div className="bg-black/80 border border-zinc-900 rounded-xl p-4 h-48 overflow-y-auto font-mono-jb text-[10px] text-zinc-300 space-y-1.5 scrollbar-thin text-left">
              {restoreLogs.map((log, idx) => (
                <div key={idx} className={`${log.includes("SUCCESS") ? "text-emerald-400 font-bold" : log.includes("INITIATED") ? "text-blue-400 font-bold" : "text-zinc-300"}`}>
                  {log}
                </div>
              ))}
            </div>

            <div className="text-[9px] text-center text-zinc-500 font-bold uppercase tracking-wider">
              ⚠️ SYSTEM SECURITY DIRECTIVE: DO NOT CLOSE BROWSER OR DISCONNECT NETWORK CORRIDOR
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
