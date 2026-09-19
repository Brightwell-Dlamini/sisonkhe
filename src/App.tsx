/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import {
  EswatiniRegion,
  Route,
  Vehicle,
  Driver,
  Trip,
  RankNotification,
  KombiStatus,
  IncidentReport,
  RankFeePayment,
  RegionConfig,
  TrafficTicket,
  MarshalAccount,
  MarshalTransaction
} from "./types";
import {
  INITIAL_ROUTES,
  INITIAL_DRIVERS,
  INITIAL_VEHICLES,
  INITIAL_TRIPS,
  INITIAL_NOTIFICATIONS,
  INITIAL_INCIDENTS,
  INITIAL_PAYMENTS,
  INITIAL_REGION_CONFIGS,
  INITIAL_TRAFFIC_TICKETS,
  INITIAL_MARSHALS,
  INITIAL_MARSHAL_TRANSACTIONS,
  INITIAL_ADVERTS,
  getStoredData,
  setStoredData,
  initializeKombiflowStorage
} from "./utils/mockData";
import DepartureBoard from "./components/DepartureBoard";
import DriverDashboard from "./components/DriverDashboard";
import AdminDashboard from "./components/AdminDashboard";
import PublicDisplayScreen from "./components/PublicDisplayScreen";
import FleetManagerTab from "./components/FleetManagerTab";
import SuperAdminControlCentre from "./components/SuperAdminControlCentre";
import OperatorDashboard from "./components/OperatorDashboard";
import CommuterSponsoredBottomBanner from "./components/CommuterSponsoredBottomBanner";
import { syncVehicleQRIfNeeded } from "./utils/qrSecurity";

import { syncDriversAndVehicles, generateVIC } from "./utils/helper";
import { getServerState, getServerStatus, pushServerState, subscribeToSync } from "./utils/syncManager";

import {
  LayoutDashboard,
  Tv,
  Users2,
  Wrench,
  Activity,
  Printer,
  BellRing,
  Volume2,
  Sun,
  Moon,
  Clock,
  Play,
  RotateCcw,
  Zap,
  QrCode,
  Shield,
  Award,
  ShieldCheck,
  Radio,
  Building2,
  LogIn,
  LogOut,
  UserCheck,
  User,
  KeyRound,
  RefreshCw,
  Lock
} from "lucide-react";
import { getCurrentUser, AuthUser, logoutUser } from "./utils/authManager";
import UserLoginModal from "./components/common/UserLoginModal";

export default function App() {
  // Ensure storage is initialized synchronously first if empty
  initializeKombiflowStorage();

  // On startup, check and sanitize routes & related records to ensure absolutely unique IDs and sync
  const sanitizedData = (() => {
    const rawRoutes = getStoredData<Route[]>("routes", INITIAL_ROUTES);
    const rawVehicles = getStoredData<Vehicle[]>("vehicles", INITIAL_VEHICLES);
    const rawTrips = getStoredData<Trip[]>("trips", INITIAL_TRIPS);
    const rawIncidents = getStoredData<IncidentReport[]>("incidents", INITIAL_INCIDENTS);
    const rawParcels = getStoredData<any[]>("parcels", []);

    const idMap = new Map<string, string>();
    const seenIds = new Set<string>();
    const uniqueRoutes: Route[] = [];

    rawRoutes.forEach((r) => {
      const cleanOrigin = (r.origin || "").trim().toLowerCase().replace(/\s+/g, "");
      const cleanDest = (r.destination || "").trim().toLowerCase().replace(/\s+/g, "");
      const regionCode = (r.region || "Hhohho").substring(0, 1).toLowerCase();
      const originCode = cleanOrigin.substring(0, 2);
      const destCode = cleanDest.substring(0, 2);
      const baseId = `${regionCode}_${originCode}_${destCode}`;

      let uniqueId = baseId;
      let counter = 1;
      while (seenIds.has(uniqueId)) {
        uniqueId = `${baseId}_${counter + 1}`;
        counter++;
      }

      seenIds.add(uniqueId);
      idMap.set(r.id, uniqueId);
      uniqueRoutes.push({
        ...r,
        id: uniqueId,
      });
    });

    const uniqueVehicles = rawVehicles.map((v) => {
      const newRouteId = idMap.get(v.routeAssignmentId) || v.routeAssignmentId;
      return {
        ...v,
        routeAssignmentId: newRouteId,
      };
    });

    const uniqueTrips = rawTrips.map((t) => {
      const newRouteId = idMap.get(t.routeId) || t.routeId;
      return {
        ...t,
        routeId: newRouteId,
      };
    });

    const uniqueIncidents = rawIncidents.map((inc) => {
      if (inc.routeId) {
        const newRouteId = idMap.get(inc.routeId) || inc.routeId;
        return {
          ...inc,
          routeId: newRouteId,
        };
      }
      return inc;
    });

    const uniqueParcels = rawParcels.map((p) => {
      const newRouteId = idMap.get(p.routeId) || p.routeId;
      return {
        ...p,
        routeId: newRouteId,
      };
    });

    // Write back to storage if any IDs changed
    let hasChanges = false;
    rawRoutes.forEach((r, i) => {
      if (!uniqueRoutes[i] || r.id !== uniqueRoutes[i].id) {
        hasChanges = true;
      }
    });

    if (hasChanges) {
      setStoredData("routes", uniqueRoutes);
      setStoredData("vehicles", uniqueVehicles);
      setStoredData("trips", uniqueTrips);
      setStoredData("incidents", uniqueIncidents);
      setStoredData("parcels", uniqueParcels);
    }

    return {
      routes: uniqueRoutes,
      vehicles: uniqueVehicles,
      trips: uniqueTrips,
      incidents: uniqueIncidents,
      parcels: uniqueParcels,
    };
  })();

  // Application States loaded from localStorage
  const [routes, setRoutes] = useState<Route[]>(() => sanitizedData.routes);
  const [drivers, setDrivers] = useState<Driver[]>(() => getStoredData("drivers", INITIAL_DRIVERS));
  const [vehicles, setVehicles] = useState<Vehicle[]>(() => sanitizedData.vehicles);
  const [trips, setTrips] = useState<Trip[]>(() => sanitizedData.trips);
  const [notifications, setNotifications] = useState<RankNotification[]>(() =>
    getStoredData("notifications", INITIAL_NOTIFICATIONS)
  );
  const [incidents, setIncidents] = useState<IncidentReport[]>(() => sanitizedData.incidents);
  const [payments, setPayments] = useState<RankFeePayment[]>(() =>
    getStoredData("payments", INITIAL_PAYMENTS)
  );
  const [regionConfigs, setRegionConfigs] = useState<RegionConfig[]>(() =>
    getStoredData("regionConfigs", INITIAL_REGION_CONFIGS)
  );
  const [trafficTickets, setTrafficTickets] = useState<TrafficTicket[]>(() =>
    getStoredData("trafficTickets", INITIAL_TRAFFIC_TICKETS)
  );
  const [marshals, setMarshals] = useState<MarshalAccount[]>(() =>
    getStoredData("marshals", INITIAL_MARSHALS)
  );
  const [marshalTransactions, setMarshalTransactions] = useState<MarshalTransaction[]>(() =>
    getStoredData("marshalTransactions", INITIAL_MARSHAL_TRANSACTIONS)
  );

  useEffect(() => {
    setStoredData("marshalTransactions", marshalTransactions);
  }, [marshalTransactions]);

  // Selected Region (starting point terminal context)
  const [activeRegion, setActiveRegion] = useState<EswatiniRegion>(() =>
    getStoredData("activeRegion", EswatiniRegion.Hhohho)
  );

  useEffect(() => {
    setStoredData("activeRegion", activeRegion);
  }, [activeRegion]);

  // Core navigation roles
  const [activeTab, setActiveTab] = useState<"departures" | "driver" | "operator" | "admin" | "kiosk" | "permits" | "super_admin">("kiosk");

  // User Authentication State
  const [currentUser, setCurrentUser] = useState<AuthUser>(() => getCurrentUser());
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [authRestrictedPrompt, setAuthRestrictedPrompt] = useState<{ tab: string; requiredRole: string } | null>(null);

  useEffect(() => {
    const handleAuthChange = (e: any) => {
      if (e.detail) {
        setCurrentUser(e.detail);
      }
    };
    window.addEventListener("kombiflow_auth_changed", handleAuthChange);
    return () => window.removeEventListener("kombiflow_auth_changed", handleAuthChange);
  }, []);

  const handleTabChangeWithAuth = (tab: "departures" | "driver" | "operator" | "admin" | "kiosk" | "permits" | "super_admin") => {
    setAuthRestrictedPrompt(null);
    if (tab === "super_admin" && currentUser.role !== "super-admin") {
      setAuthRestrictedPrompt({ tab: "Super Admin Control Centre", requiredRole: "Super Admin" });
      setIsLoginModalOpen(true);
      return;
    }
    if (tab === "operator" && currentUser.role !== "operator" && currentUser.role !== "super-admin") {
      setAuthRestrictedPrompt({ tab: "Operator (Vehicle Owner) Dashboard", requiredRole: "Fleet Operator" });
      setIsLoginModalOpen(true);
      return;
    }
    if (tab === "admin" && currentUser.role !== "admin" && currentUser.role !== "super-admin") {
      setAuthRestrictedPrompt({ tab: "Rank Administrator Dashboard", requiredRole: "Rank Admin" });
      setIsLoginModalOpen(true);
      return;
    }
    if (tab === "permits" && currentUser.role !== "admin" && currentUser.role !== "fleet-manager" && currentUser.role !== "super-admin") {
      setAuthRestrictedPrompt({ tab: "Fleet Concession Manager", requiredRole: "Fleet Manager or Admin" });
      setIsLoginModalOpen(true);
      return;
    }
    setActiveTab(tab);
  };

  const handleForceCloudSync = async () => {
    await pushServerState({
      routes,
      drivers,
      vehicles,
      trips,
      notifications,
      incidents,
      payments,
      regionConfigs,
      trafficTickets,
      marshals,
      marshalTransactions,
      rankFee,
      splitOperational,
      splitNRTC,
      splitMaintenance
    });
  };

  // Optional URL parameter tab switcher
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tabParam = params.get("tab");
    if (tabParam && ["departures", "driver", "operator", "admin", "kiosk", "permits", "super_admin"].includes(tabParam)) {
      setActiveTab(tabParam as any);
    }
  }, []);

  // Simulation settings
  const [isAutoSimActive, setIsAutoSimActive] = useState(false);
  const [simFeed, setSimFeed] = useState<string>("Simulator ready. Toggle Auto Simulation or dispatch a vehicle to see live terminal queue updates!");
  const [isAudioAnnounceOn, setIsAudioAnnounceOn] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() =>
    getStoredData("isDarkMode", true)
  );

  // Dynamic Rank Fee and splits configuration
  const [rankFee, setRankFee] = useState<number>(() =>
    getStoredData("rankFee", 25)
  );
  const [splitOperational, setSplitOperational] = useState<number>(() =>
    getStoredData("splitOperational", 20.00)
  );
  const [splitNRTC, setSplitNRTC] = useState<number>(() =>
    getStoredData("splitNRTC", 3.50)
  );
  const [splitMaintenance, setSplitMaintenance] = useState<number>(() =>
    getStoredData("splitMaintenance", 1.50)
  );

  useEffect(() => {
    setStoredData("rankFee", rankFee);
  }, [rankFee]);
  useEffect(() => {
    setStoredData("splitOperational", splitOperational);
  }, [splitOperational]);
  useEffect(() => {
    setStoredData("splitNRTC", splitNRTC);
  }, [splitNRTC]);
  useEffect(() => {
    setStoredData("splitMaintenance", splitMaintenance);
  }, [splitMaintenance]);

  const handleUpdateRankFee = (fee: number, ops: number, nrtc: number, maint: number) => {
    setRankFee(fee);
    setSplitOperational(ops);
    setSplitNRTC(nrtc);
    setSplitMaintenance(maint);
  };

  useEffect(() => {
    setStoredData("isDarkMode", isDarkMode);
  }, [isDarkMode]);
  const [moveLoadingToBottom, setMoveLoadingToBottom] = useState<boolean>(() =>
    getStoredData("moveLoadingToBottom", true)
  );

  // Tracking last saved stringified states to prevent re-render feedback loops
  const lastSavedRoutes = React.useRef<string>("");
  const lastSavedDrivers = React.useRef<string>("");
  const lastSavedVehicles = React.useRef<string>("");
  const lastSavedTrips = React.useRef<string>("");
  const lastSavedNotifications = React.useRef<string>("");
  const lastSavedIncidents = React.useRef<string>("");
  const lastSavedPayments = React.useRef<string>("");
  const lastSavedRegionConfigs = React.useRef<string>("");
  const lastSavedTrafficTickets = React.useRef<string>("");

  // Sync state back to localStorage whenever it updates
  useEffect(() => {
    const json = JSON.stringify(routes);
    if (json && json !== lastSavedRoutes.current) {
      lastSavedRoutes.current = json;
      setStoredData("routes", routes);
      const { drivers: syncedD, vehicles: syncedV } = syncDriversAndVehicles(drivers, vehicles, routes);
      if (JSON.stringify(syncedD) !== JSON.stringify(drivers)) {
        setDrivers(syncedD);
      }
      if (JSON.stringify(syncedV) !== JSON.stringify(vehicles)) {
        setVehicles(syncedV);
      }
    }
  }, [routes]);

  useEffect(() => {
    const json = JSON.stringify(drivers);
    if (json && json !== lastSavedDrivers.current) {
      lastSavedDrivers.current = json;
      setStoredData("drivers", drivers);
    }
  }, [drivers]);

  useEffect(() => {
    const json = JSON.stringify(vehicles);
    if (json && json !== lastSavedVehicles.current) {
      lastSavedVehicles.current = json;
      vehicles.forEach(v => syncVehicleQRIfNeeded(v));
      setStoredData("vehicles", vehicles);
    }
  }, [vehicles]);

  useEffect(() => {
    const json = JSON.stringify(trips);
    if (json && json !== lastSavedTrips.current) {
      lastSavedTrips.current = json;
      setStoredData("trips", trips);
    }
  }, [trips]);

  useEffect(() => {
    const json = JSON.stringify(notifications);
    if (json && json !== lastSavedNotifications.current) {
      lastSavedNotifications.current = json;
      setStoredData("notifications", notifications);
    }
  }, [notifications]);

  useEffect(() => {
    const json = JSON.stringify(incidents);
    if (json && json !== lastSavedIncidents.current) {
      lastSavedIncidents.current = json;
      setStoredData("incidents", incidents);
    }
  }, [incidents]);

  useEffect(() => {
    const json = JSON.stringify(payments);
    if (json && json !== lastSavedPayments.current) {
      lastSavedPayments.current = json;
      setStoredData("payments", payments);
    }
  }, [payments]);

  useEffect(() => {
    const json = JSON.stringify(regionConfigs);
    if (json && json !== lastSavedRegionConfigs.current) {
      lastSavedRegionConfigs.current = json;
      setStoredData("regionConfigs", regionConfigs);
    }
  }, [regionConfigs]);

  useEffect(() => {
    const json = JSON.stringify(trafficTickets);
    if (json && json !== lastSavedTrafficTickets.current) {
      lastSavedTrafficTickets.current = json;
      setStoredData("trafficTickets", trafficTickets);
    }
  }, [trafficTickets]);

  useEffect(() => {
    setStoredData("moveLoadingToBottom", moveLoadingToBottom);
  }, [moveLoadingToBottom]);

  // Apply visual theme to document body and sync console theme changes
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add("dark");
      document.body.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
      document.body.classList.remove("dark");
    }
  }, [isDarkMode]);

  useEffect(() => {
    const handleThemeEvent = () => {
      const storedDark = localStorage.getItem("kombiflow_isDarkMode");
      if (storedDark !== null) {
        setIsDarkMode(storedDark === "true");
      }
    };
    window.addEventListener("storage", handleThemeEvent);
    window.addEventListener("kombiflow_theme_changed", handleThemeEvent);
    return () => {
      window.removeEventListener("storage", handleThemeEvent);
      window.removeEventListener("kombiflow_theme_changed", handleThemeEvent);
    };
  }, []);

  // Restore dynamic system state from URL param (?systemState=...) on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const systemState = params.get("systemState");
    if (systemState) {
      try {
        const decodedStr = decodeURIComponent(atob(systemState));
        const state = JSON.parse(decodedStr);
        if (state) {
          if (state.vehicles) {
            localStorage.setItem("kombiflow_vehicles", JSON.stringify(state.vehicles));
            setVehicles(state.vehicles);
          }
          if (state.drivers) {
            localStorage.setItem("kombiflow_drivers", JSON.stringify(state.drivers));
            setDrivers(state.drivers);
          }
          if (state.rankFee !== undefined) {
            localStorage.setItem("kombiflow_rankFee", String(state.rankFee));
            setRankFee(Number(state.rankFee));
          }
          if (state.splitOperational !== undefined) {
            localStorage.setItem("kombiflow_splitOperational", String(state.splitOperational));
            setSplitOperational(Number(state.splitOperational));
          }
          if (state.splitNRTC !== undefined) {
            localStorage.setItem("kombiflow_splitNRTC", String(state.splitNRTC));
            setSplitNRTC(Number(state.splitNRTC));
          }
          if (state.splitMaintenance !== undefined) {
            localStorage.setItem("kombiflow_splitMaintenance", String(state.splitMaintenance));
            setSplitMaintenance(Number(state.splitMaintenance));
          }
          if (state.seal) {
            localStorage.setItem("kombiflow_concession_seal_image", state.seal);
          }
          
          // Clear query param so it doesn't keep overriding on subsequent reloads
          const url = new URL(window.location.href);
          url.searchParams.delete("systemState");
          window.history.replaceState({}, "", url.toString());
          
          alert("🇸🇿 National App Config Restored! All customized vehicles, drivers, rates, splits, and seal data have been loaded successfully.");
        }
      } catch (e) {
        console.error("Error restoring system state from URL", e);
      }
    }
  }, []);

  // Track server state synchronization timestamp
  const lastSyncTimeRef = React.useRef<number>(0);

  // Listen for storage & server changes and run a fast background interval to ensure absolute multi-device synchronization
  useEffect(() => {
    // Sync state from central server or local storage
    const fetchAndApplySync = async () => {
      try {
        const serverState = await getServerState();
        if (serverState) {
          if (serverState.lastUpdated && serverState.lastUpdated <= lastSyncTimeRef.current) {
            return;
          }
          lastSyncTimeRef.current = serverState.lastUpdated || Date.now();

          if (serverState.vehicles) {
            const str = JSON.stringify(serverState.vehicles);
            if (str !== lastSavedVehicles.current) {
              lastSavedVehicles.current = str;
              setVehicles(serverState.vehicles);
              localStorage.setItem("kombiflow_vehicles", str);
            }
          }
          if (serverState.drivers) {
            const str = JSON.stringify(serverState.drivers);
            if (str !== lastSavedDrivers.current) {
              lastSavedDrivers.current = str;
              setDrivers(serverState.drivers);
              localStorage.setItem("kombiflow_drivers", str);
            }
          }
          if (serverState.routes) {
            const str = JSON.stringify(serverState.routes);
            if (str !== lastSavedRoutes.current) {
              lastSavedRoutes.current = str;
              setRoutes(serverState.routes);
              localStorage.setItem("kombiflow_routes", str);
            }
          }
          if (serverState.trips) {
            const str = JSON.stringify(serverState.trips);
            if (str !== lastSavedTrips.current) {
              lastSavedTrips.current = str;
              setTrips(serverState.trips);
              localStorage.setItem("kombiflow_trips", str);
            }
          }
          if (serverState.notifications) {
            const str = JSON.stringify(serverState.notifications);
            if (str !== lastSavedNotifications.current) {
              lastSavedNotifications.current = str;
              setNotifications(serverState.notifications);
              localStorage.setItem("kombiflow_notifications", str);
            }
          }
          if (serverState.incidents) {
            const str = JSON.stringify(serverState.incidents);
            if (str !== lastSavedIncidents.current) {
              lastSavedIncidents.current = str;
              setIncidents(serverState.incidents);
              localStorage.setItem("kombiflow_incidents", str);
            }
          }
          if (serverState.payments) {
            const str = JSON.stringify(serverState.payments);
            if (str !== lastSavedPayments.current) {
              lastSavedPayments.current = str;
              setPayments(serverState.payments);
              localStorage.setItem("kombiflow_payments", str);
            }
          }
          if (serverState.regionConfigs) {
            const str = JSON.stringify(serverState.regionConfigs);
            if (str !== lastSavedRegionConfigs.current) {
              lastSavedRegionConfigs.current = str;
              setRegionConfigs(serverState.regionConfigs);
              localStorage.setItem("kombiflow_regionConfigs", str);
            }
          }
          if (serverState.trafficTickets) {
            const str = JSON.stringify(serverState.trafficTickets);
            if (str !== lastSavedTrafficTickets.current) {
              lastSavedTrafficTickets.current = str;
              setTrafficTickets(serverState.trafficTickets);
              localStorage.setItem("kombiflow_trafficTickets", str);
            }
          }
          if (serverState.rankFee !== undefined) {
            setRankFee(Number(serverState.rankFee));
            localStorage.setItem("kombiflow_rankFee", String(serverState.rankFee));
          }
          if (serverState.splitOperational !== undefined) {
            setSplitOperational(Number(serverState.splitOperational));
            localStorage.setItem("kombiflow_splitOperational", String(serverState.splitOperational));
          }
          if (serverState.splitNRTC !== undefined) {
            setSplitNRTC(Number(serverState.splitNRTC));
            localStorage.setItem("kombiflow_splitNRTC", String(serverState.splitNRTC));
          }
          if (serverState.splitMaintenance !== undefined) {
            setSplitMaintenance(Number(serverState.splitMaintenance));
            localStorage.setItem("kombiflow_splitMaintenance", String(serverState.splitMaintenance));
          }
          if (serverState.seal !== undefined) {
            localStorage.setItem("kombiflow_concession_seal_image", serverState.seal || "");
            window.dispatchEvent(new Event("kombiflow_seal_updated"));
          }
          if (serverState.watermark !== undefined) {
            localStorage.setItem("kombiflow_document_watermark", serverState.watermark || "");
            window.dispatchEvent(new Event("kombiflow_watermark_updated"));
          }
        }
      } catch (e) {
        console.error("Error in fetchAndApplySync:", e);
      }
    };

    // Initial server fetch
    fetchAndApplySync();

    // Subscribe to real-time events (BroadcastChannel / storage events / custom server sync events)
    const unsubscribe = subscribeToSync(() => {
      fetchAndApplySync();
    });

    // Fast polling fallback to check server status for changes across different devices/browsers
    const pollInterval = setInterval(async () => {
      const serverTime = await getServerStatus();
      if (serverTime > lastSyncTimeRef.current) {
        fetchAndApplySync();
      }
    }, 2000);

    return () => {
      unsubscribe();
      clearInterval(pollInterval);
    };
  }, []);

  // Derived collections filtered by the current active starting region
  const filteredRoutes = routes.filter((r) => r.region === activeRegion);

  const filteredVehicles = vehicles.filter((v) => {
    const route = routes.find((r) => r.id === v.routeAssignmentId);
    return route && route.region === activeRegion;
  });

  const filteredDrivers = drivers.filter((d) => {
    if (!d.assignedVehicleReg || d.assignedVehicleReg === "N/A") return true;
    const v = vehicles.find((veh) => veh.registrationNumber === d.assignedVehicleReg);
    if (v) {
      const route = routes.find((r) => r.id === v.routeAssignmentId);
      return route && route.region === activeRegion;
    }
    return false;
  });

  const filteredTrips = trips.filter((t) => {
    const route = routes.find((r) => r.id === t.routeId);
    return route && route.region === activeRegion;
  });

  const filteredIncidents = incidents.filter((i) => {
    if (i.routeId) {
      const r = routes.find((r) => r.id === i.routeId);
      return r && r.region === activeRegion;
    }
    if (i.vehicleReg) {
      const v = vehicles.find((veh) => veh.registrationNumber === i.vehicleReg);
      if (v) {
        const route = routes.find((r) => r.id === v.routeAssignmentId);
        return route && route.region === activeRegion;
      }
    }
    return true;
  });

  const filteredPayments = payments.filter((p) => {
    const v = vehicles.find((veh) => veh.registrationNumber === p.vehicleReg);
    if (v) {
      const route = routes.find((r) => r.id === v.routeAssignmentId);
      return route && route.region === activeRegion;
    }
    return true;
  });

  // Audio Voice Announcement Player using Web Speech API
  const handleVoiceAnnouncement = (msg: string) => {
    if (!isAudioAnnounceOn) return;
    try {
      if ("speechSynthesis" in window) {
        window.speechSynthesis.cancel(); // clear queue
        const utterance = new SpeechSynthesisUtterance(msg);
        utterance.rate = 0.9;
        utterance.pitch = 1.0;
        // Search for English speaking voices
        const voices = window.speechSynthesis.getVoices();
        const engVoice = voices.find((v) => v.lang.startsWith("en-") || v.lang === "en");
        if (engVoice) utterance.voice = engVoice;
        window.speechSynthesis.speak(utterance);
      }
    } catch (e) {
      console.error("Audio Synthesis error: ", e);
    }
  };

  const handleAddTrafficTicket = (ticket: any) => {
    const year = new Date().getFullYear();
    const serial = Math.floor(1000 + Math.random() * 9000);
    const ticketId = `TKT-${serial}`;
    const newTicket: TrafficTicket = {
      id: ticketId,
      ticketNumber: ticket.ticketNumber || `LAW-${year}-${serial}`,
      timestamp: ticket.timestamp || new Date().toISOString(),
      issuedAt: ticket.issuedAt || new Date().toISOString(),
      vehicleReg: ticket.vehicleReg || "N/A",
      officerName: ticket.officerName || "Inspector",
      officerBadge: ticket.officerBadge || "BADGE-001",
      offenseType: ticket.offenseType || "General Violation",
      amountSZL: ticket.amountSZL || 500,
      location: ticket.location || "Mbabane Rank",
      status: ticket.status || "Synchronized",
      notes: ticket.notes || ""
    };
    setTrafficTickets(prev => [newTicket, ...prev]);
  };

  // State triggers from submodules with circular relational synchronization
  const updateDriversAndVehiclesState = (newDrivers: Driver[], newVehicles: Vehicle[]) => {
    const { drivers: syncedD, vehicles: syncedV } = syncDriversAndVehicles(newDrivers, newVehicles, routes);
    setDrivers(syncedD);
    setVehicles(syncedV);
    pushServerState({ drivers: syncedD, vehicles: syncedV });
  };

  const handleAddVehicle = (v: Vehicle) => {
    updateDriversAndVehiclesState(drivers, [...vehicles, v]);
  };

  const handleAddDriver = (d: Driver) => {
    updateDriversAndVehiclesState([...drivers, d], vehicles);
  };

  const handleAddRoute = (r: Route) => {
    setRoutes([...routes, r]);
  };

  const handleUpdateVehicles = (updated: Vehicle[]) => {
    updateDriversAndVehiclesState(drivers, updated);
  };

  const handleDeleteVehicle = (reg: string) => {
    const filteredVehicles = vehicles.filter((v) => v.registrationNumber !== reg);
    const updatedDrivers = drivers.map((d) => d.assignedVehicleReg === reg ? { ...d, assignedVehicleReg: "" } : d);
    updateDriversAndVehiclesState(updatedDrivers, filteredVehicles);
  };

  const handleDeleteDriver = (id: string) => {
    const filteredDrivers = drivers.filter((d) => d.id !== id);
    const updatedVehicles = vehicles.map((v) => v.driverId === id ? { ...v, driverId: "" } : v);
    updateDriversAndVehiclesState(filteredDrivers, updatedVehicles);
  };

  const handleAddTrip = (t: Omit<Trip, "id">) => {
    const tripId = "trip_" + (trips.length + 1001);
    setTrips([...trips, { ...t, id: tripId }]);
  };

  const handleAddNotification = (n: Omit<RankNotification, "id" | "timestamp">) => {
    const notifId = "notif_" + (notifications.length + 1);
    setNotifications([
      ...notifications,
      { ...n, id: notifId, timestamp: new Date().toISOString() }
    ]);
  };

  const handleUpdateIncidentStatus = (
    id: string,
    status: IncidentReport["status"],
    escalatedTo: IncidentReport["escalatedTo"]
  ) => {
    setIncidents(
      incidents.map((inc) =>
        inc.id === id ? { ...inc, status, escalatedTo } : inc
      )
    );
  };

  const handleAddIncidentMessage = (
    incidentId: string,
    text: string,
    sender: "Commuter" | "Inspector" | "Driver" | "Other",
    senderName: string
  ) => {
    setIncidents(
      incidents.map((inc) => {
        if (inc.id === incidentId) {
          const newMsg = {
            id: "msg_" + Date.now() + "_" + Math.floor(Math.random() * 1000),
            sender,
            senderName,
            text,
            timestamp: new Date().toISOString()
          };
          const existingMsgs = inc.messages || [];
          return { ...inc, messages: [...existingMsgs, newMsg] };
        }
        return inc;
      })
    );
  };

  const handleEditVehicle = (updatedVeh: Vehicle) => {
    const nextVehicles = vehicles.map((v) =>
      v.registrationNumber === updatedVeh.registrationNumber ? updatedVeh : v
    );
    updateDriversAndVehiclesState(drivers, nextVehicles);
  };

  const handleEditDriver = (updatedDriver: Driver) => {
    const nextDrivers = drivers.map((d) => (d.id === updatedDriver.id ? updatedDriver : d));
    updateDriversAndVehiclesState(nextDrivers, vehicles);
  };

  const handleEditRoute = (updatedRoute: Route) => {
    setRoutes(
      routes.map((r) => (r.id === updatedRoute.id ? updatedRoute : r))
    );
  };

  const handleDeleteRoute = (routeId: string) => {
    setRoutes(routes.filter((r) => r.id !== routeId));
  };

  const handleAddManualIncident = (inc: Omit<IncidentReport, "id" | "timestamp">) => {
    const newInc: IncidentReport = {
      ...inc,
      id: "inc_" + Date.now(),
      timestamp: new Date().toISOString()
    };
    setIncidents([...incidents, newInc]);
  };

  const handleAddPayment = (pay: RankFeePayment) => {
    setPayments([...payments, pay]);
  };

  const handleCloakRankFeeTransaction = (regNum: string, triggerSource: "Full Cabin Button" | "Depart Button") => {
    const targetVeh = vehicles.find(v => v.registrationNumber.toUpperCase() === regNum.toUpperCase());
    if (!targetVeh) return;

    const activeRoute = routes.find(r => r.id === targetVeh.routeAssignmentId);
    let regionStr = "Hhohho";
    if (activeRoute) {
      if (activeRoute.region === EswatiniRegion.Manzini) regionStr = "Manzini";
      else if (activeRoute.region === EswatiniRegion.Lubombo) regionStr = "Lubombo";
      else if (activeRoute.region === EswatiniRegion.Shiselweni) regionStr = "Shiselweni";
    } else {
      if (activeRegion === EswatiniRegion.Manzini) regionStr = "Manzini";
      else if (activeRegion === EswatiniRegion.Lubombo) regionStr = "Lubombo";
      else if (activeRegion === EswatiniRegion.Shiselweni) regionStr = "Shiselweni";
    }

    const targetMarshal = marshals.find(m => m.region.toLowerCase() === regionStr.toLowerCase()) || marshals[0];

    const now = new Date();
    const dateStr = now.toISOString().split("T")[0];
    const monthStr = dateStr.substring(0, 7);

    const newTx: MarshalTransaction = {
      id: "mtx_" + Date.now() + "_" + Math.floor(Math.random() * 1000),
      marshalId: targetMarshal.id,
      timestamp: now.toISOString(),
      date: dateStr,
      month: monthStr,
      vehicleReg: regNum.toUpperCase(),
      amountSZL: 25,
      triggerSource
    };

    setMarshalTransactions(prev => [newTx, ...prev]);

    // Also add to standard payments for cross-component compatibility
    const newPayment: RankFeePayment = {
      id: "pay_" + Date.now(),
      timestamp: now.toISOString(),
      vehicleReg: regNum.toUpperCase(),
      amountSZL: 25,
      paymentMethod: "Cash",
      transactionRef: "CLOAK-" + Math.floor(10000 + Math.random() * 90000),
      status: "Success",
      allocationOperational: 25,
      allocationNRTC: 0,
      allocationMaintenance: 0
    };
    setPayments(prev => [...prev, newPayment]);

    // Add notification
    const msg = `💰 Cloaked E25 Rank Fee logged for ${regNum.toUpperCase()} under marshal ${targetMarshal.fullName} (${targetMarshal.terminalName}) via ${triggerSource}.`;
    handleAddNotification({
      type: "Push",
      recipientName: targetMarshal.fullName,
      recipientPhone: "+268 7604 1111",
      message: msg,
      status: "Sent"
    });
  };

  const handleUpdateVehicleStatus = (regNum: string, status: KombiStatus) => {
    const currentVeh = vehicles.find((v) => v.registrationNumber === regNum);
    if (!currentVeh) return;

    const routeId = currentVeh.routeAssignmentId;
    const oldPosition = currentVeh.currentQueuePosition;

    const now = new Date();
    const formatHHMM = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;

    const sameRouteVehicles = vehicles.filter(v => v.routeAssignmentId === routeId);
    const sameRouteQueued = sameRouteVehicles.filter(v => v.registrationNumber !== regNum && v.currentQueuePosition > 0);
    const maxPosition = sameRouteQueued.length;

    const targetVehUpdate: Partial<Vehicle> = {
      status,
      lastActive: now.toISOString()
    };

    if (status === KombiStatus.Waiting) {
      targetVehUpdate.arrivalRegisterTime = formatHHMM;
      // If they were already in queue, keep position, otherwise put at bottom of queue
      targetVehUpdate.currentQueuePosition = oldPosition > 0 ? oldPosition : (maxPosition + 1);
      // Reset scheduling/loading details
      targetVehUpdate.loadingStartTime = undefined;
      targetVehUpdate.loadingDurationMinutes = undefined;
      targetVehUpdate.expectedDepartureTime = undefined;
      targetVehUpdate.fullCabinTime = undefined;
      targetVehUpdate.returningTime = undefined;
      targetVehUpdate.delayedTime = undefined;
      targetVehUpdate.breakdownTime = undefined;
    } else if (status === KombiStatus.Loading) {
      targetVehUpdate.loadingStartTime = formatHHMM;
      targetVehUpdate.loadingDurationMinutes = 20;
      
      const depDate = new Date(now.getTime() + 20 * 60000);
      targetVehUpdate.expectedDepartureTime = `${String(depDate.getHours()).padStart(2, "0")}:${String(depDate.getMinutes()).padStart(2, "0")}`;
      
      if (moveLoadingToBottom && oldPosition > 0) {
        targetVehUpdate.currentQueuePosition = maxPosition + 1;
      } else {
        targetVehUpdate.currentQueuePosition = oldPosition > 0 ? oldPosition : (maxPosition + 1);
      }
    } else if (status === KombiStatus.Full) {
      targetVehUpdate.fullCabinTime = formatHHMM;
      targetVehUpdate.currentQueuePosition = oldPosition;
      handleCloakRankFeeTransaction(regNum, "Full Cabin Button");
    } else if (status === KombiStatus.Departed) {
      targetVehUpdate.currentQueuePosition = 0;
      targetVehUpdate.tripsToday = currentVeh.tripsToday + 1;
      handleCloakRankFeeTransaction(regNum, "Depart Button");
      
      // Auto trip logging
      const activeRoute = routes.find(r => r.id === routeId);
      const passengerCount = currentVeh.seatingCapacity || 15;
      const tripRevenue = passengerCount * (activeRoute?.baseFareE || 55);
      const isDuplicate = trips.some(t => t.vehicleReg === regNum && t.date === "2026-06-16" && t.status === "InProgress");
      
      if (!isDuplicate) {
        const tripId = "trip_" + (trips.length + 1001);
        const newTrip: Trip = {
          id: tripId,
          date: "2026-06-16",
          departureTime: formatHHMM,
          routeId,
          vehicleReg: regNum,
          driverId: currentVeh.driverId || "unknown",
          passengerCount,
          status: "InProgress",
          revenueSZL: tripRevenue
        };
        setTrips(prev => [...prev, newTrip]);
      }
    } else if (status === KombiStatus.Returning) {
      targetVehUpdate.returningTime = formatHHMM;
      targetVehUpdate.currentQueuePosition = 0;
    } else if (status === KombiStatus.Delayed) {
      targetVehUpdate.delayedTime = formatHHMM;
      targetVehUpdate.currentQueuePosition = oldPosition;
    } else if (status === KombiStatus.Breakdown) {
      targetVehUpdate.breakdownTime = formatHHMM;
      targetVehUpdate.currentQueuePosition = 0;
    } else if (status === KombiStatus.Offline) {
      targetVehUpdate.currentQueuePosition = 0;
    }

    const nextVehicles = vehicles.map((v) => {
      if (v.registrationNumber === regNum) {
        return {
          ...v,
          ...targetVehUpdate
        };
      }
      
      // Shift up anyone who was behind this vehicle if it left or moved down in queue
      const leftOrMovedDown = targetVehUpdate.currentQueuePosition === 0 || (targetVehUpdate.currentQueuePosition !== undefined && targetVehUpdate.currentQueuePosition > oldPosition);
      if (leftOrMovedDown && oldPosition > 0) {
        if (v.routeAssignmentId === routeId && v.currentQueuePosition > oldPosition) {
          return {
            ...v,
            currentQueuePosition: v.currentQueuePosition - 1
          };
        }
      }
      
      return v;
    });

    updateDriversAndVehiclesState(drivers, nextVehicles);
  };

  // ONE-CLICK QUICK SIMULATOR DEPARTURE ADVANCEMENT
  const triggerManualSimulationDeparture = () => {
    // Find the primary route of the active region
    let targetRouteId = "h_mb_mz";
    if (activeRegion === EswatiniRegion.Manzini) targetRouteId = "m_mz_mb";
    else if (activeRegion === EswatiniRegion.Lubombo) targetRouteId = "l_st_mz";
    else if (activeRegion === EswatiniRegion.Shiselweni) targetRouteId = "s_nh_mz";

    const sameRouteVehicles = vehicles.filter((v) => v.routeAssignmentId === targetRouteId);
    const mockLoader = sameRouteVehicles.find((v) => v.status === KombiStatus.Loading);

    if (mockLoader) {
      // 1. Depart the current loader!
      const currentRoute = routes.find((r) => r.id === targetRouteId);
      const randomPassengerCount = Math.floor(Math.random() * 5) + 11; // 11-15 passengers
      const estFareSZL = currentRoute ? randomPassengerCount * currentRoute.baseFareE : 750;

      // Realise departure update
      const intermediateVehicles = vehicles.map((v) => {
        if (v.registrationNumber === mockLoader.registrationNumber) {
          return {
            ...v,
            status: KombiStatus.Departed,
            currentQueuePosition: 0,
            tripsToday: v.tripsToday + 1,
            lastActive: new Date().toISOString()
          };
        }
        // Advance everybody in line
        if (v.routeAssignmentId === targetRouteId && v.currentQueuePosition > mockLoader.currentQueuePosition) {
          return { ...v, currentQueuePosition: v.currentQueuePosition - 1 };
        }
        return v;
      });

      // 2. Promote the NEXT waitlisted vehicle to loading status automatically!
      // This is the vehicle that became position #1
      const finalistVehicles = intermediateVehicles.map((v) => {
        if (v.routeAssignmentId === targetRouteId && v.currentQueuePosition === 1 && v.status === KombiStatus.Waiting) {
          return { ...v, status: KombiStatus.Loading };
        }
        return v;
      });

      setVehicles(finalistVehicles);

      // Log the completed departure trip in historical reports
      handleAddTrip({
        date: "2026-06-16",
        departureTime: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        routeId: targetRouteId,
        vehicleReg: mockLoader.registrationNumber,
        driverId: mockLoader.driverId,
        passengerCount: randomPassengerCount,
        status: "InProgress",
        revenueSZL: estFareSZL
      });

      // Trigger SMS log
      const drvName = drivers.find((d) => d.id === mockLoader.driverId)?.fullName || "Driver";
      handleAddNotification({
        type: "SMS",
        recipientName: drvName,
        recipientPhone: "+268 7604 1234",
        message: `KombiFlow departure dispatch: Vehicle ${mockLoader.registrationNumber} departed for ${currentRoute?.destination || "destination"} under ${mockLoader.loadingBay} load sequence.`,
        status: "Delivered"
      });

      const feedMessage = `Simulated Departure: Vehicle ${mockLoader.registrationNumber} departed from ${mockLoader.loadingBay}! Queue advanced on ${currentRoute?.origin || "Origin"}-${currentRoute?.destination || "Destination"}.`;
      setSimFeed(feedMessage);
      handleVoiceAnnouncement(`${mockLoader.registrationNumber} has departed ${mockLoader.loadingBay}. Next vehicle proceed to load!`);

    } else {
      // If none is "Loading", set the first Waiting vehicle of active route queue to "Loading"
      const waitingList = sameRouteVehicles
        .filter((v) => v.currentQueuePosition > 0 && v.status === KombiStatus.Waiting)
        .sort((a, b) => a.currentQueuePosition - b.currentQueuePosition);

      if (waitingList.length > 0) {
        const nextInLine = waitingList[0];
        const updated = vehicles.map((v) => {
          if (v.registrationNumber === nextInLine.registrationNumber) {
            return { ...v, status: KombiStatus.Loading };
          }
          return v;
        });
        setVehicles(updated);

        const drvName = drivers.find((d) => d.id === nextInLine.driverId)?.fullName || "Driver";
        handleAddNotification({
          type: "WhatsApp",
          recipientName: drvName,
          recipientPhone: "+268 7604 1234",
          message: `Proceed to ${nextInLine.loadingBay} immediately: Your vehicle ${nextInLine.registrationNumber} occupies position #1 (Loading now).`,
          status: "Delivered"
        });

        const feedMsg = `Bay Alert: Promoted Waitlisted ${nextInLine.registrationNumber} to active Loading status!`;
        setSimFeed(feedMsg);
        handleVoiceAnnouncement(`Attention commuters! Vehicle ${nextInLine.registrationNumber} is now loading at ${nextInLine.loadingBay}.`);
      } else {
        // No vehicles queued. Automatically return one of the departed ones back to waitlist line
        const departedCabs = vehicles.filter((v) => v.currentQueuePosition === 0 && v.status === KombiStatus.Departed);
        if (departedCabs.length > 0) {
          const returningCab = departedCabs[0];
          // Determine current route queue length to place returning vehicle at bottom
          const routeQueueLength = vehicles.filter((v) => v.routeAssignmentId === returningCab.routeAssignmentId && v.currentQueuePosition > 0).length;

          const updated = vehicles.map((v) => {
            if (v.registrationNumber === returningCab.registrationNumber) {
              return {
                ...v,
                status: KombiStatus.Waiting,
                currentQueuePosition: routeQueueLength + 1
              };
            }
            return v;
          });
          setVehicles(updated);
          setSimFeed(`Simulation Recycle: Returned departed cab ${returningCab.registrationNumber} back to waiting queue index #${routeQueueLength + 1}`);
        } else {
          setSimFeed(`Simulator Checklist: No vehicles are active or waiting inside ${activeRegion} terminal queue. Reset/Add vehicle.`);
        }
      }
    }
  };

  // SYSTEM AUTO SIMULATION ENGINE
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (isAutoSimActive) {
      interval = setInterval(() => {
        triggerManualSimulationDeparture();
      }, 15000); // simulation runs every 15 seconds
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isAutoSimActive, vehicles]);

  const resetAllStoredDatabase = () => {
    localStorage.clear();
    setRoutes(INITIAL_ROUTES);
    setDrivers(INITIAL_DRIVERS);
    setVehicles(INITIAL_VEHICLES);
    setTrips(INITIAL_TRIPS);
    setNotifications(INITIAL_NOTIFICATIONS);
    setIncidents(INITIAL_INCIDENTS);
    setPayments(INITIAL_PAYMENTS);
    setRegionConfigs(INITIAL_REGION_CONFIGS);
    setTrafficTickets(INITIAL_TRAFFIC_TICKETS);
    setRankFee(25);
    setSplitOperational(20.00);
    setSplitNRTC(3.50);
    setSplitMaintenance(1.50);
    setStoredData("adverts", INITIAL_ADVERTS);
    setSimFeed("Sisonkhe In transit database tables reset to factory original Eswatini configurations.");
  };

  useEffect(() => {
    document.title = "Sisonkhe In transit";
  }, []);

  return (
    <div className={`min-h-screen transition-colors duration-300 bg-zinc-50 dark:bg-black text-zinc-800 dark:text-zinc-100`}>
      {/* Top National Admin Control bar & Status alert stripe */}
      <section className="bg-zinc-100 dark:bg-zinc-950 border-b border-zinc-200 dark:border-zinc-900 px-4 py-2.5 flex flex-wrap items-center justify-between text-xs font-mono-jb gap-4 z-25 relative">
        <div className="flex items-center gap-3">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
          <span className="text-[10px] text-zinc-500 font-semibold uppercase tracking-wider">
            EZULWINI INTERNET SERVER STABLE | PORT: 3000
          </span>
        </div>

        {/* Global theme toggle */}
        <div className="flex items-center gap-4">
          <button
            onClick={() => setIsDarkMode(!isDarkMode)}
            className="p-1.5 rounded-lg bg-zinc-200/50 dark:bg-zinc-900 text-zinc-550 dark:text-zinc-400 hover:text-yellow-500 dark:hover:text-yellow-400 transition-colors border border-zinc-350 dark:border-zinc-800 cursor-pointer"
          >
            {isDarkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
        </div>
      </section>

      {/* Primary Shell Container */}
      <div className="max-w-7xl mx-auto px-4 py-6 md:py-8 space-y-6">
        {/* Global User Authentication & System Synchronization Session Bar */}
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-3.5 sm:p-4 rounded-2xl shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 dark:bg-blue-500/20 border border-blue-500/30 flex items-center justify-center text-lg select-none">
              {currentUser.role === "super-admin" ? "👑" : currentUser.role === "operator" ? "🏢" : currentUser.role === "driver" ? "🙋‍♂️" : currentUser.role === "admin" ? "🛡️" : "🚌"}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-black text-zinc-900 dark:text-white font-space">
                  {currentUser.fullName}
                </span>
                <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-md font-mono-jb ${
                  currentUser.role === "super-admin" ? "bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/30" :
                  currentUser.role === "operator" ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/30" :
                  currentUser.role === "driver" ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30" :
                  currentUser.role === "admin" ? "bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/30" :
                  "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400"
                }`}>
                  {currentUser.roleDisplay || currentUser.role}
                </span>
              </div>
              <p className="text-[11px] text-zinc-400 dark:text-zinc-500 mt-0.5">
                {currentUser.role === "driver" && currentUser.assignedVehicleReg ? (
                  <span>Assigned Kombi: <strong className="text-zinc-700 dark:text-zinc-300">{currentUser.assignedVehicleReg}</strong> • Route: {currentUser.assignedRouteId || "Active"}</span>
                ) : currentUser.role === "operator" ? (
                  <span>Fleet Concession: <strong className="text-zinc-700 dark:text-zinc-300">{currentUser.fullName}</strong> • {currentUser.email}</span>
                ) : currentUser.role === "super-admin" ? (
                  <span>Executive NRTC Access: Full Cross-Region Sync & Administration</span>
                ) : currentUser.role === "admin" ? (
                  <span>Station Control • Rank Dispatch Supervisor</span>
                ) : (
                  <span>Public Commuter Access • Live Arrivals, Fares & Timetables</span>
                )}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
{currentUser.role !== "commuter" && (
  <a
    href="/account"
    className="py-2 px-3 text-zinc-600 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl transition cursor-pointer text-xs font-bold"
    title="Account Settings"
  >
    <User className="w-4 h-4" />
  </a>
)}
            <button
              onClick={() => setIsLoginModalOpen(true)}
              className="flex-1 sm:flex-initial py-2 px-3.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer shadow-sm"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>{currentUser.role === "commuter" ? "Sign In (Staff & Drivers)" : "Switch Account"}</span>
            </button>
            {currentUser.role !== "commuter" && (
              <button
                onClick={() => {
                  logoutUser();
                  setActiveTab("kiosk");
                }}
                className="py-2 px-3 text-zinc-500 hover:text-red-500 dark:text-zinc-400 dark:hover:text-red-400 hover:bg-red-500/10 rounded-xl transition cursor-pointer"
                title="Sign out to Public Commuter mode"
              >
                <LogOut className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {authRestrictedPrompt && (
          <div className="bg-amber-500/10 border border-amber-500/30 p-4 rounded-xl flex items-center justify-between gap-4 text-amber-600 dark:text-amber-400 text-xs font-bold animate-fade-in">
            <div className="flex items-center gap-2">
              <Lock className="w-4 h-4 shrink-0" />
              <span>
                Access to <strong>{authRestrictedPrompt.tab}</strong> requires <strong>{authRestrictedPrompt.requiredRole}</strong> credentials.
              </span>
            </div>
            <button
              onClick={() => setIsLoginModalOpen(true)}
              className="px-3 py-1.5 bg-amber-500 text-black font-black rounded-lg uppercase tracking-wider text-[10px] cursor-pointer hover:bg-amber-400"
            >
              Sign In Now
            </button>
          </div>
        )}

        {/* Main Title Hub Navigation in Bold Typography theme style */}
        <header className="bg-white dark:bg-black/45 border border-zinc-200 dark:border-white/10 p-6 md:p-8 rounded-2xl flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="flex flex-col">
            <span className="text-xs font-bold tracking-[0.3em] text-blue-500 uppercase mb-2">
              National Digital Transport Network
            </span>
            <div className="flex items-center gap-3">
              <span className="text-4xl select-none">🇸🇿</span>
              <div>
                <div className="flex items-baseline gap-2.5 flex-wrap">
                  <h1 className="text-3xl sm:text-4xl md:text-5xl font-black font-space tracking-tight text-zinc-900 dark:text-white uppercase">
                    SISONKHE
                  </h1>
                  <span className="text-xs sm:text-sm font-black px-2.5 py-0.5 rounded-full bg-blue-500/10 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 border border-blue-500/30 uppercase tracking-widest font-space">
                    IN TRANSIT
                  </span>
                </div>
                <p className="text-[11px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider font-space mt-0.5">
                  Eswatini Municipal Route & Rank Queue Management
                </p>
              </div>
            </div>
            <p className="text-zinc-550 dark:text-zinc-400 text-xs mt-3 max-w-xl leading-relaxed">
              National Route Queue Management System. Powered by digital Transport Bays, automated departure countdown schedules, and live Terminal-Style TVs.
            </p>
          </div>

          <div className="flex flex-col gap-2 w-full md:w-auto">
            <span className="text-[10px] font-black tracking-widest text-zinc-400 dark:text-slate-500 block uppercase md:text-right">
              SELECT YOUR STARTING TERMINAL
            </span>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
              {[
                { region: EswatiniRegion.Hhohho, label: "Hhohho", defaultTown: "Mbabane Rank", emoji: "🏰" },
                { region: EswatiniRegion.Manzini, label: "Manzini", defaultTown: "Manzini Hub", emoji: "🏭" },
                { region: EswatiniRegion.Lubombo, label: "Lubombo", defaultTown: "Siteki Gate", emoji: "🏔️" },
                { region: EswatiniRegion.Shiselweni, label: "Shiselweni", defaultTown: "Nhlangano", emoji: "🌳" }
              ].map((item) => {
                const config = regionConfigs.find((c) => c.region === item.region);
                const townName = config ? config.terminalName : item.defaultTown;
                return (
                  <button
                    key={item.region}
                    onClick={() => setActiveRegion(item.region)}
                    className={`py-2 px-3 text-left rounded-xl border-2 transition-all cursor-pointer ${
                      activeRegion === item.region
                        ? "border-blue-500 bg-blue-500/10 text-zinc-900 dark:text-white"
                        : "border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-black/30 text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300"
                    }`}
                  >
                    <div className="flex items-center gap-1 text-[11px] font-black uppercase tracking-wider font-space">
                      <span>{item.emoji}</span>
                      <span>{item.label}</span>
                    </div>
                    <div className="text-[10px] font-mono-jb font-bold text-zinc-400 dark:text-zinc-550 mt-0.5 uppercase truncate max-w-[120px]">
                      {townName}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </header>

          {/* Core role select headers */}
          <nav className="flex bg-zinc-100 dark:bg-zinc-900 p-1 rounded-xl border border-zinc-250 dark:border-zinc-850 self-start lg:self-auto overflow-x-auto max-w-full scrollbar-none">
            <button
              onClick={() => handleTabChangeWithAuth("kiosk")}
              className={`flex items-center gap-1.5 py-2 px-3.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                activeTab === "kiosk"
                  ? "bg-white text-zinc-900 shadow-sm dark:bg-black dark:text-white border border-emerald-500/30"
                  : "text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300"
              }`}
            >
              <Radio className="w-3.5 h-3.5 text-emerald-500 animate-pulse" />
              <span>⚡ Live Transit & Radar</span>
            </button>
            <button
              onClick={() => handleTabChangeWithAuth("departures")}
              className={`flex items-center gap-1.5 py-2 px-3.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                activeTab === "departures"
                  ? "bg-white text-zinc-900 shadow-sm dark:bg-black dark:text-white"
                  : "text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300"
              }`}
            >
              <Tv className="w-4 h-4 text-blue-500" />
              TV Boards
            </button>
            <button
              onClick={() => handleTabChangeWithAuth("driver")}
              className={`flex items-center gap-1.5 py-2 px-3.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                activeTab === "driver"
                  ? "bg-white text-zinc-900 shadow-sm dark:bg-black dark:text-white"
                  : "text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300"
              }`}
            >
              🙋‍♂️ Driver cab
            </button>
            <button
              onClick={() => handleTabChangeWithAuth("operator")}
              className={`flex items-center gap-1.5 py-2 px-3.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                activeTab === "operator"
                  ? "bg-white text-zinc-900 shadow-sm dark:bg-black dark:text-white border border-amber-500/30"
                  : "text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300"
              }`}
            >
              <Building2 className="w-4 h-4 text-amber-500" />
              Operator (Owner)
            </button>
            <button
              onClick={() => handleTabChangeWithAuth("admin")}
              className={`flex items-center gap-1.5 py-2 px-3.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                activeTab === "admin"
                  ? "bg-white text-zinc-900 shadow-sm dark:bg-black dark:text-white"
                  : "text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300"
              }`}
            >
              <Wrench className="w-4 h-4 text-emerald-500" />
              Rank Admin
            </button>
            <button
              onClick={() => handleTabChangeWithAuth("permits")}
              className={`flex items-center gap-1.5 py-2 px-3.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                activeTab === "permits"
                  ? "bg-white text-zinc-900 shadow-sm dark:bg-black dark:text-white border border-emerald-500/20"
                  : "text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300"
              }`}
            >
              <Award className="w-4 h-4 text-emerald-500" />
              Fleet Manager
            </button>
            <button
              onClick={() => handleTabChangeWithAuth("super_admin")}
              className={`flex items-center gap-1.5 py-2 px-3.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                activeTab === "super_admin"
                  ? "bg-white text-zinc-900 shadow-sm dark:bg-black dark:text-white border border-indigo-500/20"
                  : "text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300"
              }`}
            >
              <ShieldCheck className="w-4 h-4 text-indigo-500" />
              Super Admin Control
            </button>
          </nav>

        {/* Major Content display zone */}
        <main className="min-h-[460px]">
          {activeTab === "kiosk" && (
            <PublicDisplayScreen
              vehicles={vehicles}
              routes={routes}
              activeRegion={activeRegion}
              regionConfigs={regionConfigs}
              drivers={drivers}
              trips={trips}
              onNavigateTab={(tab) => setActiveTab(tab)}
            />
          )}

          {activeTab === "departures" && (
            <DepartureBoard
              vehicles={vehicles}
              routes={routes}
              activeRegion={activeRegion}
              isAudioOn={isAudioAnnounceOn}
              setAudioOn={setIsAudioAnnounceOn}
              onTriggerAnnouncement={handleVoiceAnnouncement}
              regionConfigs={regionConfigs}
            />
          )}

          {activeTab === "driver" && (
            <DriverDashboard
              drivers={filteredDrivers}
              vehicles={filteredVehicles}
              routes={filteredRoutes}
              trips={filteredTrips}
              notifications={notifications}
              payments={filteredPayments}
              onUpdateVehicleStatus={handleUpdateVehicleStatus}
              onUpdateQueuePosition={() => {}}
              onAddTrip={handleAddTrip}
              onAddNotification={handleAddNotification}
              onAddPayment={handleAddPayment}
              onAddIncident={handleAddManualIncident}
              onEditVehicle={handleEditVehicle}
              onEditDriver={handleEditDriver}
              rankFee={rankFee}
              splitOperational={splitOperational}
              splitNRTC={splitNRTC}
              splitMaintenance={splitMaintenance}
            />
          )}

          {activeTab === "operator" && (
            <OperatorDashboard
              vehicles={vehicles}
              drivers={drivers}
              routes={routes}
              onAddNotification={handleAddNotification}
            />
          )}

          {activeTab === "admin" && (
            <AdminDashboard
              drivers={filteredDrivers}
              vehicles={filteredVehicles}
              routes={filteredRoutes}
              allRoutes={routes}
              incidents={filteredIncidents}
              payments={filteredPayments}
              regionConfigs={regionConfigs}
              notifications={notifications}
              onAddNotification={handleAddNotification}
              onUpdateRegionConfigs={setRegionConfigs}
              onUpdateIncidentStatus={handleUpdateIncidentStatus}
              onAddManualIncident={handleAddManualIncident}
              onAddVehicle={handleAddVehicle}
              onAddDriver={handleAddDriver}
              onAddRoute={handleAddRoute}
              onUpdateVehicle={handleUpdateVehicles}
              onDeleteVehicle={handleDeleteVehicle}
              onDeleteDriver={handleDeleteDriver}
              onEditVehicle={handleEditVehicle}
              onEditDriver={handleEditDriver}
              onEditRoute={handleEditRoute}
              onDeleteRoute={handleDeleteRoute}
              onAddIncidentMessage={handleAddIncidentMessage}
              moveLoadingToBottom={moveLoadingToBottom}
              onToggleMoveLoadingToBottom={setMoveLoadingToBottom}
              rankFee={rankFee}
              splitOperational={splitOperational}
              splitNRTC={splitNRTC}
              splitMaintenance={splitMaintenance}
              onUpdateRankFee={handleUpdateRankFee}
              onCloakRankFee={handleCloakRankFeeTransaction}
              marshals={marshals}
              marshalTransactions={marshalTransactions}
            />
          )}

          {activeTab === "super_admin" && (
            <SuperAdminControlCentre
              drivers={drivers}
              vehicles={vehicles}
              routes={routes}
              trips={trips}
              incidents={incidents}
              trafficTickets={trafficTickets}
              onAddManualIncident={handleAddManualIncident}
              onUpdateIncidentStatus={handleUpdateIncidentStatus}
              onAddIncidentMessage={handleAddIncidentMessage}
              onAddTrafficTicket={handleAddTrafficTicket}
              onRestoreSystem={resetAllStoredDatabase}
              rankFee={rankFee}
              splitOperational={splitOperational}
              splitNRTC={splitNRTC}
              splitMaintenance={splitMaintenance}
              onUpdateRankFee={handleUpdateRankFee}
              onUpdateDrivers={(newDrivers) => updateDriversAndVehiclesState(newDrivers, vehicles)}
              onUpdateVehicles={handleUpdateVehicles}
              onUpdateRoutes={setRoutes}
              marshals={marshals}
              onUpdateMarshals={setMarshals}
              regionConfigs={regionConfigs}
              onUpdateRegionConfigs={setRegionConfigs}
              onForceSyncAll={handleForceCloudSync}
            />
          )}

          {activeTab === "permits" && (
            <FleetManagerTab
              vehicles={vehicles}
              drivers={drivers}
              routes={routes}
              trips={trips}
              currentRegion={activeRegion}
              activeRegion={activeRegion}
              onUpdateVehicles={handleUpdateVehicles}
              onUpdateDrivers={(newDrivers) => updateDriversAndVehiclesState(newDrivers, vehicles)}
              onAddVehicle={handleAddVehicle}
              onAddDriver={handleAddDriver}
              onEditVehicle={handleEditVehicle}
              onEditDriver={handleEditDriver}
              onDeleteVehicle={handleDeleteVehicle}
              onDeleteDriver={handleDeleteDriver}
              onAddRoute={handleAddRoute}
              onEditRoute={handleEditRoute}
              onDeleteRoute={handleDeleteRoute}
              notifications={notifications}
              onAddNotification={handleAddNotification}
              onTabChange={(tab) => setActiveTab(tab as any)}
              marshals={marshals}
              onUpdateMarshals={setMarshals}
              marshalTransactions={marshalTransactions}
              rankFee={rankFee}
              splitOperational={splitOperational}
              splitNRTC={splitNRTC}
              splitMaintenance={splitMaintenance}
              onUpdateRankFee={handleUpdateRankFee}
              regionConfigs={regionConfigs}
              onUpdateRegionConfigs={setRegionConfigs}
            />
          )}
        </main>

        {/* Global User Authentication Modal */}
        <UserLoginModal
          isOpen={isLoginModalOpen}
          currentUser={currentUser}
          onClose={() => {
            setIsLoginModalOpen(false);
            setAuthRestrictedPrompt(null);
          }}
          onLoginSuccess={(user) => {
            setCurrentUser(user);
            setIsLoginModalOpen(false);
            setAuthRestrictedPrompt(null);
            // Route seamlessly to their primary role tab
            if (user.role === "operator") {
              setActiveTab("operator");
            } else if (user.role === "driver") {
              setActiveTab("driver");
            } else if (user.role === "admin" || user.role === "fleet-manager") {
              setActiveTab("admin");
            } else if (user.role === "super-admin") {
              setActiveTab("super_admin");
            }
          }}
        />
      </div>

      {/* Footer credits and regional links in Bold Typography style */}
      <footer className="bg-zinc-100 dark:bg-black border-t border-zinc-200 dark:border-white/10 px-8 py-6 mb-20 md:mb-16 flex flex-col md:flex-row justify-between items-center text-[10px] font-bold tracking-widest uppercase text-zinc-500 font-sans gap-4">
        <div>Sisonkhe In transit &bull; Eswatini Road Transport Authority &copy; 2026</div>
        <div className="flex flex-wrap gap-4 md:gap-8 justify-center">
          <span>Support: +268 7604 1234</span>
          <span>Rank ID: HHO-MB-001</span>
          <span>Version 4.2.0</span>
        </div>
      </footer>

      {/* Persistent Prominent Commuter Sponsored Broadcast Website Bottom Banner */}
      <CommuterSponsoredBottomBanner activeRegion={activeRegion} />
    </div>
  );
}
