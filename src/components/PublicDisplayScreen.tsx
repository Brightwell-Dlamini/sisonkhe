/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from "react";
import { Vehicle, Route, KombiStatus, EswatiniRegion, RegionConfig, Advert, Driver, Trip } from "../types";
import { INITIAL_DRIVERS } from "../utils/mockData";
import TransitDepartureCard from "./kiosk/TransitDepartureCard";
import KioskRadarBays from "./kiosk/KioskRadarBays";
import CommuterFareCalculatorModal from "./kiosk/CommuterFareCalculatorModal";
import LostPropertyModal from "./kiosk/LostPropertyModal";
import {
  Search,
  Radio,
  Clock,
  MapPin,
  Maximize2,
  Minimize2,
  Volume2,
  VolumeX,
  Calculator,
  ShieldAlert,
  Tv,
  ListOrdered,
  Sparkles,
  ArrowRight,
  ChevronRight,
  Megaphone,
  X,
  ExternalLink,
  Copy,
  Check,
  Tag,
  Globe,
  Phone,
  Info,
  Layers,
  Flame,
  CheckCircle2,
  Users
} from "lucide-react";

interface PublicDisplayScreenProps {
  vehicles: Vehicle[];
  routes: Route[];
  activeRegion: EswatiniRegion;
  regionConfigs: RegionConfig[];
  drivers?: Driver[];
  trips?: Trip[];
  onNavigateTab?: (tab: any) => void;
}

export default function PublicDisplayScreen({
  vehicles,
  routes,
  activeRegion,
  regionConfigs,
  drivers = INITIAL_DRIVERS,
  trips = [],
  onNavigateTab
}: PublicDisplayScreenProps) {
  // Navigation & filter state
  const [selectedRegion, setSelectedRegion] = useState<EswatiniRegion>(activeRegion);
  const [displayMode, setDisplayMode] = useState<"transit" | "radar" | "queue" | "tv">("transit");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDestinationFilter, setSelectedDestinationFilter] = useState<string>("all");

  // Screen modes & interactive modals
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isAudioChimeOn, setIsAudioChimeOn] = useState(false);
  const [isFareCalculatorOpen, setIsFareCalculatorOpen] = useState(false);
  const [fareCalcRoute, setFareCalcRoute] = useState<Route | null>(null);
  const [isLostPropertyOpen, setIsLostPropertyOpen] = useState(false);

  // Time & Kiosk auto-rotation
  const [time, setTime] = useState(new Date());
  const [tvPageIndex, setTvPageIndex] = useState(0);
  const [adverts, setAdverts] = useState<Advert[]>([]);
  const [activeAdIndex, setActiveAdIndex] = useState(0);
  const [selectedAdvertModal, setSelectedAdvertModal] = useState<Advert | null>(null);
  const [copiedCode, setCopiedCode] = useState(false);

  // Sync region prop
  useEffect(() => {
    setSelectedRegion(activeRegion);
  }, [activeRegion]);

  // Live seconds clock
  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Adverts storage loader
  const loadAdverts = () => {
    try {
      const stored = localStorage.getItem("kombiflow_adverts");
      if (stored) {
        setAdverts(JSON.parse(stored));
      } else {
        setAdverts([
          {
            id: "adv_1",
            title: "MTN MoMo E10 Mobile Data & Cash Cashback Promo",
            sponsorName: "MTN Eswatini",
            imageUrl: "https://images.unsplash.com/photo-1563986768609-322da13575f3?auto=format&fit=crop&w=800&q=80",
            targetRegions: ["All"],
            isActive: true,
            createdAt: "2026-07-22T08:00:00Z",
            fileSizeBytes: 420000,
            promoCode: "MOMO-TRANSIT",
            description: "Pay for your kombi fare using MTN MoMo Pay and receive 10% instant airtime cashback directly to your mobile wallet."
          }
        ]);
      }
    } catch (e) {}
  };

  useEffect(() => {
    loadAdverts();
    const handleStorage = () => loadAdverts();
    window.addEventListener("storage", handleStorage);
    window.addEventListener("kombiflow_adverts_updated", handleStorage);
    return () => {
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener("kombiflow_adverts_updated", handleStorage);
    };
  }, []);

  const matchingAdverts = adverts.filter((a) => {
    if (!a.isActive) return false;
    return a.targetRegions.includes("All") || a.targetRegions.includes(selectedRegion);
  });

  useEffect(() => {
    if (matchingAdverts.length <= 1) return;
    const adTimer = setInterval(() => {
      setActiveAdIndex((prev) => (prev + 1) % matchingAdverts.length);
    }, 8000);
    return () => clearInterval(adTimer);
  }, [matchingAdverts.length]);

  // Current terminal configuration
  const currentConfig = regionConfigs.find((c) => c.region === selectedRegion) || regionConfigs[0];

  // Filter routes for active region
  const regionRoutes = useMemo(() => {
    return routes.filter((r) => r.region === selectedRegion);
  }, [routes, selectedRegion]);

  // Distinct destinations for quick filter pills
  const destinationOptions = useMemo(() => {
    const list = Array.from(new Set(regionRoutes.map((r) => r.destination)));
    return ["all", ...list];
  }, [regionRoutes]);

  // Filter routes based on search query and quick destination pill
  const filteredRoutes = useMemo(() => {
    return regionRoutes.filter((r) => {
      // Destination filter
      if (selectedDestinationFilter !== "all" && r.destination !== selectedDestinationFilter) {
        return false;
      }
      // Text search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchOrigin = r.origin.toLowerCase().includes(q);
        const matchDest = r.destination.toLowerCase().includes(q);
        const matchRegion = r.region.toLowerCase().includes(q);
        // Also check if matches vehicle registration on this route
        const matchVeh = vehicles.some(
          (v) => v.routeAssignmentId === r.id && v.registrationNumber.toLowerCase().includes(q)
        );
        return matchOrigin || matchDest || matchRegion || matchVeh;
      }
      return true;
    });
  }, [regionRoutes, selectedDestinationFilter, searchQuery, vehicles]);

  // Get active vehicles on route
  const getVehiclesForRoute = (routeId: string) => {
    return vehicles
      .filter((v) => v.routeAssignmentId === routeId && v.status !== KombiStatus.Offline)
      .sort((a, b) => (a.currentQueuePosition || 99) - (b.currentQueuePosition || 99));
  };

  // Find driver
  const getDriver = (driverId: string, vehicleReg: string) => {
    return drivers.find((d) => d.id === driverId || d.assignedVehicleReg === vehicleReg);
  };

  // Immediate boarding vehicle (Position #1 or Loading) for the hero spotlight
  const nextDepartureVehicle = useMemo(() => {
    const regionalVehicles = vehicles.filter((v) => {
      if (v.status === KombiStatus.Offline) return false;
      const r = routes.find((route) => route.id === v.routeAssignmentId);
      return r?.region === selectedRegion;
    });

    return (
      regionalVehicles.find((v) => v.status === KombiStatus.Loading) ||
      regionalVehicles.find((v) => v.status === KombiStatus.Waiting && v.currentQueuePosition === 1) ||
      regionalVehicles[0]
    );
  }, [vehicles, routes, selectedRegion]);

  const nextDepartureRoute = nextDepartureVehicle
    ? routes.find((r) => r.id === nextDepartureVehicle.routeAssignmentId)
    : undefined;

  // TV mode pagination
  const activeTvVehicles = useMemo(() => {
    return vehicles.filter((v) => {
      if (v.status === KombiStatus.Offline) return false;
      const r = routes.find((route) => route.id === v.routeAssignmentId);
      return r?.region === selectedRegion;
    });
  }, [vehicles, routes, selectedRegion]);

  const totalTvPages = Math.max(1, Math.ceil(activeTvVehicles.length / 8));
  const pagedTvVehicles = activeTvVehicles.slice(tvPageIndex * 8, (tvPageIndex + 1) * 8);

  useEffect(() => {
    setTvPageIndex(0);
  }, [selectedRegion]);

  useEffect(() => {
    if (displayMode !== "tv" && !isFullscreen) return;
    const rotateTimer = setInterval(() => {
      setTvPageIndex((prev) => (prev + 1) % totalTvPages);
    }, 10000);
    return () => clearInterval(rotateTimer);
  }, [totalTvPages, displayMode, isFullscreen]);

  // Fullscreen toggle
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  // Voice announcement simulator
  const handleTriggerChime = () => {
    if ("speechSynthesis" in window) {
      const msg = nextDepartureVehicle && nextDepartureRoute
        ? `Attention commuters at ${currentConfig.terminalName}. Kombi to ${nextDepartureRoute.destination}, registration ${nextDepartureVehicle.registrationNumber}, is now boarding at ${nextDepartureVehicle.loadingBay}. Gazetted fare is ${nextDepartureRoute.baseFareE} Emalangeni.`
        : `Attention commuters, welcome to ${currentConfig.terminalName}. Please check departure boards for live loading bay allocations.`;
      
      const utterance = new SpeechSynthesisUtterance(msg);
      utterance.rate = 0.95;
      window.speechSynthesis.speak(utterance);
    }
  };

  return (
    <div
      className={`transition-all duration-300 ${
        isFullscreen
          ? "fixed inset-0 z-50 overflow-y-auto bg-zinc-950 text-white p-6 flex flex-col justify-between"
          : "space-y-6"
      }`}
    >
      {/* ============================================================ */}
      {/* 1. TOP TRANSIT BAR (High-contrast, clean TransitApp-inspired) */}
      {/* ============================================================ */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-5 sm:p-6 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
          
          {/* Brand & Terminal Context */}
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500 text-white flex items-center justify-center shadow-md shadow-emerald-500/20 shrink-0">
              <Radio className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[10px] font-black uppercase tracking-widest text-emerald-600 dark:text-emerald-400 font-mono">
                  SISONKHE IN TRANSIT • LIVE TERMINAL
                </span>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                  99.4% On-Time
                </span>
              </div>
              <h1 className="text-xl sm:text-2xl font-black text-zinc-900 dark:text-white uppercase font-space tracking-tight mt-0.5">
                {currentConfig.terminalName}
              </h1>
            </div>
          </div>

          {/* Region Switcher Pills */}
          <div className="flex items-center gap-1.5 bg-zinc-100 dark:bg-zinc-800/80 p-1.5 rounded-2xl overflow-x-auto scrollbar-none border border-zinc-200 dark:border-zinc-700/60">
            {(["Hhohho", "Manzini", "Lubombo", "Shiselweni"] as EswatiniRegion[]).map((region) => (
              <button
                key={region}
                onClick={() => setSelectedRegion(region)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                  selectedRegion === region
                    ? "bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white shadow-sm font-black"
                    : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white"
                }`}
              >
                {region}
              </button>
            ))}
          </div>

          {/* Clock, Audio Chime & Action Controls */}
          <div className="flex items-center gap-3 self-end lg:self-auto">
            {/* Live Clock */}
            <div className="text-right font-mono pr-2 border-r border-zinc-200 dark:border-zinc-800">
              <div className="text-base sm:text-lg font-black text-zinc-900 dark:text-white flex items-center justify-end gap-1">
                <Clock className="w-4 h-4 text-emerald-500" />
                <span>
                  {time.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                </span>
              </div>
              <span className="text-[10px] text-zinc-400 uppercase tracking-wider block">
                Official Rank Time
              </span>
            </div>

            {/* Chime Announcement */}
            <button
              onClick={handleTriggerChime}
              className="p-2.5 rounded-xl bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 transition-colors cursor-pointer"
              title="Play departure audio announcement"
            >
              <Volume2 className="w-4 h-4" />
            </button>

            {/* Fullscreen TV Kiosk Mode */}
            <button
              onClick={toggleFullscreen}
              className="p-2.5 rounded-xl bg-zinc-900 dark:bg-white hover:opacity-90 text-white dark:text-black transition-opacity cursor-pointer flex items-center gap-1.5 text-xs font-bold"
              title="Toggle Fullscreen Public TV Board"
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
              <span className="hidden sm:inline">Kiosk Mode</span>
            </button>
          </div>

        </div>

        {/* Mode Navigation: Blending TransitApp departures with Kiosk Radar & Queue */}
        <div className="mt-5 pt-4 border-t border-zinc-100 dark:border-zinc-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2 overflow-x-auto scrollbar-none pb-1 sm:pb-0">
            <button
              onClick={() => setDisplayMode("transit")}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                displayMode === "transit"
                  ? "bg-emerald-600 text-white shadow-md shadow-emerald-600/20 font-black"
                  : "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200"
              }`}
            >
              <Radio className="w-3.5 h-3.5" />
              <span>⚡ Live Departures (TransitApp)</span>
            </button>

            <button
              onClick={() => setDisplayMode("radar")}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                displayMode === "radar"
                  ? "bg-emerald-600 text-white shadow-md shadow-emerald-600/20 font-black"
                  : "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200"
              }`}
            >
              <MapPin className="w-3.5 h-3.5" />
              <span>🎯 Kiosk Radar & Loading Bays</span>
            </button>

            <button
              onClick={() => setDisplayMode("queue")}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                displayMode === "queue"
                  ? "bg-emerald-600 text-white shadow-md shadow-emerald-600/20 font-black"
                  : "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200"
              }`}
            >
              <ListOrdered className="w-3.5 h-3.5" />
              <span>📋 Corridor Queues</span>
            </button>

            <button
              onClick={() => setDisplayMode("tv")}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                displayMode === "tv"
                  ? "bg-emerald-600 text-white shadow-md shadow-emerald-600/20 font-black"
                  : "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200"
              }`}
            >
              <Tv className="w-3.5 h-3.5" />
              <span>📺 TV Broadcast Board</span>
            </button>
          </div>

          {/* Commuter Tools: Fare Calculator & Lost Property */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => {
                setFareCalcRoute(null);
                setIsFareCalculatorOpen(true);
              }}
              className="px-3 py-1.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-700 text-xs font-bold text-zinc-700 dark:text-zinc-200 flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Calculator className="w-3.5 h-3.5 text-emerald-500" />
              <span>Fare Guide</span>
            </button>

            <button
              onClick={() => setIsLostPropertyOpen(true)}
              className="px-3 py-1.5 rounded-xl border border-rose-200 dark:border-rose-900/60 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 text-xs font-bold text-rose-700 dark:text-rose-300 flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <ShieldAlert className="w-3.5 h-3.5 text-rose-500" />
              <span>Lost Item?</span>
            </button>
          </div>
        </div>
      </div>

      {/* ============================================================ */}
      {/* 2. TRANSITAPP-STYLE HERO AREA & "WHERE TO?" QUICK SEARCH    */}
      {/* ============================================================ */}
      {displayMode === "transit" && (
        <div className="bg-gradient-to-b from-emerald-500/10 via-zinc-50 dark:via-zinc-900 to-white dark:to-zinc-950 border border-emerald-500/20 rounded-3xl p-6 md:p-8 shadow-sm space-y-6">
          
          <div className="max-w-2xl">
            <span className="text-xs font-black uppercase tracking-widest text-emerald-600 dark:text-emerald-400 font-mono flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
              REAL-TIME COMMUTER TRANSIT HUB
            </span>
            <h2 className="text-2xl sm:text-4xl font-black text-zinc-900 dark:text-white uppercase font-space tracking-tight mt-1">
              Where are you heading today?
            </h2>
            <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-1">
              Check live kombi departures, track the rank queue, and see your exact loading bay in seconds.
            </p>
          </div>

          {/* Quick "Where to?" Search Bar */}
          <div className="relative max-w-2xl">
            <Search className="w-5 h-5 text-zinc-400 absolute left-4 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Where to? Search destination, route, or kombi plate (e.g. Manzini, Piggs Peak, ASD 633 BM)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-10 py-3.5 rounded-2xl bg-white dark:bg-zinc-800 border-2 border-zinc-200 dark:border-zinc-700 text-sm md:text-base font-bold text-zinc-900 dark:text-white shadow-sm focus:outline-none focus:border-emerald-500 transition-all placeholder:text-zinc-400"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 p-1 rounded-lg text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Quick Destination Shortcut Pills */}
          <div className="flex items-center gap-2 overflow-x-auto scrollbar-none pb-1">
            <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider shrink-0 flex items-center gap-1">
              <Flame className="w-3.5 h-3.5 text-amber-500" />
              Popular:
            </span>
            {destinationOptions.map((dest) => (
              <button
                key={dest}
                onClick={() => setSelectedDestinationFilter(dest)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                  selectedDestinationFilter === dest
                    ? "bg-emerald-600 text-white font-black shadow-sm"
                    : "bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-700 border border-zinc-200 dark:border-zinc-700"
                }`}
              >
                {dest === "all" ? "🔥 All Routes" : dest}
              </button>
            ))}
          </div>

          {/* Service Advisory Ticker */}
          <div className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
              <strong className="text-emerald-900 dark:text-emerald-200 font-sans">
                Rank Status: Normal Service
              </strong>
              <span className="text-zinc-500 dark:text-zinc-400 hidden md:inline">•</span>
              <span className="text-zinc-600 dark:text-zinc-300 hidden md:inline">
                {currentConfig.announcement || "MR3 Highway & Malagwane Hill clear. Kombis boarding smoothly."}
              </span>
            </div>
            <span className="font-mono font-bold text-emerald-700 dark:text-emerald-300 text-[11px] shrink-0">
              Avg dispatch interval: 8-12 mins
            </span>
          </div>

        </div>
      )}

      {/* ============================================================ */}
      {/* 3. IMMEDIATE BOARDING SPOTLIGHT (HERO TRANSIT BANNER)       */}
      {/* ============================================================ */}
      {nextDepartureVehicle && nextDepartureRoute && (displayMode === "transit" || displayMode === "radar") && (
        <div className="bg-zinc-950 text-white border-2 border-emerald-500/40 rounded-3xl p-6 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
          
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black uppercase bg-emerald-500 text-black font-space">
                  <span className="w-2 h-2 rounded-full bg-black animate-ping" />
                  NEXT IMMEDIATE BOARDING
                </span>
                <span className="font-mono text-xs text-emerald-400">
                  {nextDepartureVehicle.loadingBay}
                </span>
              </div>

              <h3 className="text-2xl sm:text-4xl font-black font-space uppercase tracking-tight text-white">
                {nextDepartureRoute.origin} <span className="text-emerald-400">➔</span> {nextDepartureRoute.destination}
              </h3>

              <div className="flex items-center gap-3 text-xs sm:text-sm font-mono text-zinc-300 flex-wrap">
                <span>Vehicle: <strong className="text-white text-base">{nextDepartureVehicle.registrationNumber}</strong></span>
                <span>•</span>
                <span>Fleet: <strong className="text-emerald-400">{nextDepartureVehicle.fleetNumber}</strong></span>
                <span>•</span>
                <span>Gazetted Fare: <strong className="text-white">E {nextDepartureRoute.baseFareE.toFixed(2)}</strong></span>
                <span>•</span>
                <span>Distance: <strong>{nextDepartureRoute.distanceKm} km</strong></span>
              </div>
            </div>

            <div className="flex items-center gap-4 shrink-0 bg-zinc-900/80 p-4 rounded-2xl border border-zinc-800">
              <div className="text-right">
                <span className="text-[10px] uppercase font-bold text-zinc-400 block tracking-wider">
                  DEPARTURE STATUS
                </span>
                <div className="text-2xl font-black font-space text-emerald-400 animate-pulse">
                  {nextDepartureVehicle.status === KombiStatus.Loading ? "BOARDING NOW" : "NEXT IN LINE"}
                </div>
                <span className="text-[10px] font-mono text-zinc-400 block mt-0.5">
                  Expected: {nextDepartureVehicle.expectedDepartureTime || "08:45"}
                </span>
              </div>

              <button
                onClick={() => {
                  setFareCalcRoute(nextDepartureRoute);
                  setIsFareCalculatorOpen(true);
                }}
                className="px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-black text-xs uppercase tracking-wider transition-all cursor-pointer shadow"
              >
                Fare Breakdown
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* 4. MAIN DISPLAY MODE 1: TRANSIT-APP DEPARTURE CARDS        */}
      {/* ============================================================ */}
      {displayMode === "transit" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-black uppercase tracking-wider text-zinc-900 dark:text-white font-space flex items-center gap-2">
              <Radio className="w-4 h-4 text-emerald-500" />
              <span>Live Transit Departures ({filteredRoutes.length} Corridors Active)</span>
            </h3>
            <span className="text-xs text-zinc-500 font-mono">
              Live updates every second
            </span>
          </div>

          {filteredRoutes.length === 0 ? (
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-12 text-center space-y-3">
              <Search className="w-8 h-8 text-zinc-400 mx-auto" />
              <h4 className="text-base font-bold text-zinc-900 dark:text-white">
                No matching corridors found
              </h4>
              <p className="text-xs text-zinc-500 max-w-sm mx-auto">
                No active kombi routes match "{searchQuery}". Try selecting a different region or clearing your search query.
              </p>
              <button
                onClick={() => {
                  setSearchQuery("");
                  setSelectedDestinationFilter("all");
                }}
                className="px-4 py-2 rounded-xl bg-emerald-600 text-white font-bold text-xs uppercase cursor-pointer"
              >
                Reset Search
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredRoutes.map((route, idx) => {
                const routeVehicles = getVehiclesForRoute(route.id);
                const activeVeh = routeVehicles[0];
                const driver = activeVeh ? getDriver(activeVeh.driverId, activeVeh.registrationNumber) : undefined;
                
                // Deterministic live countdown simulation
                const baseCountdown = Math.max(1, (idx * 4 + 2) - Math.floor((time.getSeconds() / 15)));
                const isBoarding = activeVeh?.status === KombiStatus.Loading || (idx === 0 && !searchQuery);

                return (
                  <TransitDepartureCard
                    key={route.id}
                    route={route}
                    activeVehicle={activeVeh}
                    queuedVehicles={routeVehicles}
                    driver={driver}
                    countdownMinutes={isBoarding ? 0 : baseCountdown}
                    isBoardingNow={isBoarding}
                    onSelectRoute={() => setDisplayMode("radar")}
                    onOpenFareCalculator={(r) => {
                      setFareCalcRoute(r);
                      setIsFareCalculatorOpen(true);
                    }}
                  />
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ============================================================ */}
      {/* 5. MAIN DISPLAY MODE 2: KIOSK RADAR & LOADING BAYS          */}
      {/* ============================================================ */}
      {displayMode === "radar" && (
        <KioskRadarBays
          vehicles={vehicles}
          routes={routes}
          drivers={drivers}
          onSelectRoute={() => setDisplayMode("transit")}
        />
      )}

      {/* ============================================================ */}
      {/* 6. MAIN DISPLAY MODE 3: CORRIDOR QUEUES SEQUENCE TRACKER     */}
      {/* ============================================================ */}
      {displayMode === "queue" && (
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 space-y-6 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-zinc-100 dark:border-zinc-800">
            <div>
              <h3 className="text-base sm:text-lg font-black text-zinc-900 dark:text-white uppercase font-space tracking-tight flex items-center gap-2">
                <ListOrdered className="w-5 h-5 text-emerald-500" />
                <span>Corridor Queuing Sequence & Loading Turn Roster</span>
              </h3>
              <p className="text-xs text-zinc-500 mt-0.5">
                Deterministic rotation order across all active corridors in the {selectedRegion} Region.
              </p>
            </div>

            <span className="px-3 py-1 rounded-xl bg-purple-50 dark:bg-purple-950 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800 text-xs font-mono font-bold">
              30-Day Rotation Engine Active
            </span>
          </div>

          <div className="space-y-6">
            {regionRoutes.map((route) => {
              const routeVehicles = getVehiclesForRoute(route.id);
              if (routeVehicles.length === 0) return null;

              return (
                <div key={route.id} className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-[10px] font-bold uppercase text-zinc-400 tracking-wider">
                        Route Corridor
                      </span>
                      <h4 className="text-base font-black text-zinc-900 dark:text-white uppercase font-space">
                        {route.origin} ➔ {route.destination}
                      </h4>
                    </div>

                    <span className="text-xs font-mono font-bold text-zinc-500">
                      {routeVehicles.length} Vehicles in Queue
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    {routeVehicles.map((veh, qIdx) => {
                      const drv = getDriver(veh.driverId, veh.registrationNumber);
                      return (
                        <div
                          key={veh.registrationNumber}
                          className={`p-3.5 rounded-xl border font-mono text-xs space-y-2 ${
                            qIdx === 0
                              ? "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-700 text-emerald-900 dark:text-emerald-100"
                              : qIdx === 1
                              ? "bg-blue-50 dark:bg-blue-950/40 border-blue-300 dark:border-blue-700 text-blue-900 dark:text-blue-100"
                              : "bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-800 dark:text-zinc-200"
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className={`px-2 py-0.5 rounded font-black text-[10px] ${
                              qIdx === 0 ? "bg-emerald-600 text-white" : qIdx === 1 ? "bg-blue-600 text-white" : "bg-zinc-200 dark:bg-zinc-700 text-zinc-800 dark:text-zinc-200"
                            }`}>
                              RANK #{qIdx + 1}
                            </span>
                            <span className="text-[10px] font-bold uppercase">
                              {veh.loadingBay}
                            </span>
                          </div>

                          <div>
                            <strong className="text-sm block">{veh.registrationNumber}</strong>
                            <span className="text-[10px] opacity-75 font-sans">
                              Driver: {drv?.fullName || "Assigned"}
                            </span>
                          </div>

                          <div className="pt-2 border-t border-current/10 flex justify-between text-[10px]">
                            <span>Status: {veh.status}</span>
                            <span>{veh.expectedDepartureTime || "08:45"}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* 7. MAIN DISPLAY MODE 4: FULLSCREEN KIOSK TV BROADCAST TABLE */}
      {/* ============================================================ */}
      {displayMode === "tv" && (
        <div className="bg-[#0A0A0A] text-white border-2 border-zinc-800 rounded-3xl p-6 md:p-8 space-y-6 shadow-2xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-zinc-800">
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-1 rounded-lg bg-amber-500 text-black font-black text-[10px] tracking-widest font-mono">
                  LIVE TV BOARD
                </span>
                <h3 className="text-xl font-black font-space uppercase text-white">
                  {currentConfig.terminalName} GENERAL DEPARTURES
                </h3>
              </div>
              <p className="text-xs text-zinc-400 mt-1">
                Automated high-contrast broadcast terminal for public screen monitors.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <span className="px-3 py-1 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 font-mono text-xs font-bold">
                PAGE {tvPageIndex + 1} OF {totalTvPages} (10s AUTO-CYCLE)
              </span>
            </div>
          </div>

          {/* Departure Table */}
          <div className="overflow-x-auto">
            <div className="min-w-[650px]">
              <div className="grid grid-cols-12 text-[11px] uppercase font-mono text-zinc-400 font-bold pb-3 border-b border-zinc-800 tracking-wider">
                <div className="col-span-2">SCHED</div>
                <div className="col-span-4">DESTINATION ROUTE</div>
                <div className="col-span-2">VEHICLE</div>
                <div className="col-span-2 text-center">BAY</div>
                <div className="col-span-2 text-right">STATUS</div>
              </div>

              <div className="divide-y divide-zinc-850 font-mono text-sm py-2">
                {pagedTvVehicles.length === 0 ? (
                  <div className="py-12 text-center text-zinc-500 text-xs font-sans">
                    No active kombis scheduled in this sector right now.
                  </div>
                ) : (
                  pagedTvVehicles.map((veh) => {
                    const r = routes.find((route) => route.id === veh.routeAssignmentId);
                    if (!r) return null;

                    return (
                      <div
                        key={veh.registrationNumber}
                        className="grid grid-cols-12 py-3.5 items-center hover:bg-white/5 transition-colors border-b border-zinc-850"
                      >
                        <div className="col-span-2 text-emerald-400 font-bold font-mono">
                          {veh.expectedDepartureTime || "08:45"}
                        </div>
                        <div className="col-span-4 text-white font-black uppercase font-space truncate">
                          {r.origin} ➔ {r.destination}
                        </div>
                        <div className="col-span-2 text-zinc-300 font-bold font-mono">
                          {veh.registrationNumber}
                        </div>
                        <div className="col-span-2 text-center">
                          <span className="px-2.5 py-1 rounded-lg bg-zinc-800 border border-zinc-700 font-bold text-xs text-white">
                            {veh.loadingBay}
                          </span>
                        </div>
                        <div className="col-span-2 text-right">
                          <span
                            className={`inline-block px-2.5 py-0.5 rounded text-[10px] font-black uppercase tracking-wider ${
                              veh.status === KombiStatus.Loading
                                ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500 animate-pulse"
                                : veh.status === KombiStatus.Waiting && veh.currentQueuePosition === 1
                                ? "bg-blue-500/20 text-blue-400 border border-blue-500"
                                : "bg-zinc-800 text-zinc-400"
                            }`}
                          >
                            {veh.status === KombiStatus.Loading ? "BOARDING" : veh.status === KombiStatus.Waiting && veh.currentQueuePosition === 1 ? "NEXT UP" : veh.status}
                          </span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* 8. COMMUTER SPONSORED BROADCAST & HOTLINE BANNER            */}
      {/* ============================================================ */}
      {matchingAdverts.length > 0 && (() => {
        const currentAd = matchingAdverts[activeAdIndex % matchingAdverts.length];
        if (!currentAd) return null;

        return (
          <div
            onClick={() => setSelectedAdvertModal(currentAd)}
            className="p-5 rounded-3xl bg-gradient-to-r from-amber-500/10 via-zinc-100 dark:via-zinc-900 to-zinc-50 dark:to-zinc-900 border border-amber-500/30 flex flex-col md:flex-row items-center justify-between gap-4 cursor-pointer hover:border-amber-400 transition-all shadow-sm group"
          >
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl overflow-hidden bg-black shrink-0 border border-amber-500/40">
                <img
                  src={currentAd.imageUrl}
                  alt={currentAd.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                />
              </div>
              <div>
                <span className="text-[10px] font-black uppercase tracking-widest text-amber-600 dark:text-amber-400 font-space block">
                  COMMUTER SPONSORED OFFER • {currentAd.sponsorName}
                </span>
                <h4 className="text-sm sm:text-base font-black text-zinc-900 dark:text-white uppercase font-space">
                  {currentAd.title}
                </h4>
                <p className="text-xs text-zinc-500 line-clamp-1 mt-0.5">
                  {currentAd.description}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0 self-end md:self-auto">
              <span className="px-3 py-1.5 rounded-xl bg-amber-500 text-black font-black text-xs uppercase flex items-center gap-1.5 shadow">
                <span>View Details</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </span>
            </div>
          </div>
        );
      })()}

      {/* ============================================================ */}
      {/* 9. MODALS: FARE CALCULATOR, LOST PROPERTY & AD DETAILS      */}
      {/* ============================================================ */}
      {isFareCalculatorOpen && (
        <CommuterFareCalculatorModal
          routes={routes}
          initialRoute={fareCalcRoute}
          onClose={() => setIsFareCalculatorOpen(false)}
        />
      )}

      {isLostPropertyOpen && (
        <LostPropertyModal
          routes={routes}
          vehicles={vehicles}
          onClose={() => setIsLostPropertyOpen(false)}
          onSubmitIncident={(incident) => {
            try {
              const existing = JSON.parse(localStorage.getItem("kombiflow_incidents") || "[]");
              existing.unshift(incident);
              localStorage.setItem("kombiflow_incidents", JSON.stringify(existing));
              window.dispatchEvent(new Event("kombiflow_incidents_updated"));
            } catch (e) {}
          }}
        />
      )}

      {/* Sponsored Advert Modal */}
      {selectedAdvertModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-zinc-950 border-2 border-amber-500/40 rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl relative text-white space-y-0">
            <div className="bg-gradient-to-r from-amber-500/20 via-zinc-900 to-zinc-950 p-5 border-b border-amber-500/20 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="p-2 bg-amber-500 text-black rounded-xl">
                  <Megaphone className="w-5 h-5 font-bold" />
                </span>
                <div>
                  <span className="text-[10px] font-black uppercase text-amber-400 tracking-widest font-space block">
                    COMMUTER SPONSORED BROADCAST
                  </span>
                  <h3 className="text-sm font-black text-white uppercase font-space tracking-tight">
                    {selectedAdvertModal.sponsorName}
                  </h3>
                </div>
              </div>
              <button
                onClick={() => setSelectedAdvertModal(null)}
                className="p-2 rounded-xl bg-zinc-900 text-zinc-400 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto text-xs">
              <div className="relative rounded-2xl overflow-hidden border border-zinc-800 bg-black h-48">
                <img
                  src={selectedAdvertModal.imageUrl}
                  alt={selectedAdvertModal.title}
                  className="w-full h-full object-cover"
                />
              </div>

              <h2 className="text-lg font-black uppercase font-space text-amber-300">
                {selectedAdvertModal.title}
              </h2>

              <p className="text-zinc-300 leading-relaxed">
                {selectedAdvertModal.description}
              </p>

              {selectedAdvertModal.promoCode && (
                <div className="bg-amber-500/10 border border-amber-500/30 p-4 rounded-2xl space-y-2">
                  <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-widest text-amber-400">
                    <span className="flex items-center gap-1.5">
                      <Tag className="w-4 h-4" />
                      COMMUTER PROMO CODE
                    </span>
                    <span className="text-emerald-400">100% VERIFIED</span>
                  </div>
                  <div className="flex items-center justify-between bg-black/60 p-3 rounded-xl border border-amber-500/20">
                    <span className="font-mono text-lg font-black text-amber-300 tracking-widest">
                      {selectedAdvertModal.promoCode}
                    </span>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(selectedAdvertModal.promoCode || "");
                        setCopiedCode(true);
                        setTimeout(() => setCopiedCode(false), 2500);
                      }}
                      className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-black font-black text-xs uppercase rounded-lg transition-all cursor-pointer flex items-center gap-1.5"
                    >
                      {copiedCode ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      {copiedCode ? "COPIED" : "COPY"}
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="p-4 bg-zinc-900 border-t border-zinc-800 flex justify-end">
              <button
                onClick={() => setSelectedAdvertModal(null)}
                className="px-5 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-white font-black text-xs uppercase rounded-xl transition-all cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
