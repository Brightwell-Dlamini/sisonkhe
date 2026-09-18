/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { Vehicle, Route, KombiStatus, EswatiniRegion, RegionConfig } from "../types";
import { Volume2, VolumeX, Search, Share, Clock, Grid, List, MapPin } from "lucide-react";

interface DepartureBoardProps {
  vehicles: Vehicle[];
  routes: Route[];
  activeRegion: EswatiniRegion;
  onTriggerAnnouncement?: (text: string) => void;
  isAudioOn: boolean;
  setAudioOn: (on: boolean) => void;
  regionConfigs?: RegionConfig[];
}

export default function DepartureBoard({
  vehicles,
  routes,
  activeRegion,
  onTriggerAnnouncement,
  isAudioOn,
  setAudioOn,
  regionConfigs
}: DepartureBoardProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<"board" | "cards">("board");
  const [tickerTime, setTickerTime] = useState(new Date());
  const [pageIndex, setPageIndex] = useState(0);
  const [cycleTimerSeconds, setCycleTimerSeconds] = useState<number>(() => {
    const stored = localStorage.getItem("kombiflow_cycle_timer_seconds");
    return stored ? Math.max(3, parseInt(stored, 10)) : 10;
  });

  useEffect(() => {
    const handleTimerUpdate = () => {
      const stored = localStorage.getItem("kombiflow_cycle_timer_seconds");
      if (stored) {
        setCycleTimerSeconds(Math.max(3, parseInt(stored, 10)));
      }
    };
    window.addEventListener("storage", handleTimerUpdate);
    window.addEventListener("kombiflow_timer_updated", handleTimerUpdate);
    return () => {
      window.removeEventListener("storage", handleTimerUpdate);
      window.removeEventListener("kombiflow_timer_updated", handleTimerUpdate);
    };
  }, []);

  useEffect(() => {
    const timer = setInterval(() => setTickerTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Helper: map Route ID to Route details
  const getRouteDetails = (routeId: string) => {
    return routes.find((r) => r.id === routeId);
  };

  // Helper: Get status color classes (optimized high visibility terminal style)
  const getStatusStyle = (status: KombiStatus) => {
    switch (status) {
      case KombiStatus.Loading:
        return {
          bg: "bg-emerald-500/10 dark:bg-emerald-500/20",
          text: "badge status-green animate-pulse",
          label: "BOARDING"
        };
      case KombiStatus.Waiting:
        return {
          bg: "bg-blue-500/10 dark:bg-blue-500/20",
          text: "badge status-blue",
          label: "NEXT UP"
        };
      case KombiStatus.Full:
        return {
          bg: "bg-purple-500/10 dark:bg-purple-500/20",
          text: "badge status-grey",
          label: "FULL"
        };
      case KombiStatus.Departed:
        return {
          bg: "bg-zinc-500/10 dark:bg-zinc-500/20",
          text: "badge status-grey opacity-60",
          label: "DEPARTED"
        };
      case KombiStatus.Delayed:
        return {
          bg: "bg-amber-500/10 dark:bg-amber-500/20",
          text: "badge status-yellow animate-blink",
          label: "DELAYED"
        };
      case KombiStatus.Breakdown:
        return {
          bg: "bg-red-500/10 dark:bg-red-500/20",
          text: "badge status-red",
          label: "CANCELLED"
        };
      case KombiStatus.Returning:
        return {
          bg: "bg-sky-500/10 dark:bg-sky-500/20",
          text: "badge status-blue",
          label: "RETURNING"
        };
      default:
        return {
          bg: "bg-zinc-500/10 dark:bg-zinc-500/20",
          text: "badge status-grey",
          label: "SCHEDULED"
        };
    }
  };

  // Filter vehicles
  const filteredVehicles = vehicles.filter((v) => {
    const route = getRouteDetails(v.routeAssignmentId);
    if (!route) return false;

    const matchesRegion = route.region === activeRegion;
    const matchesSearch =
      v.registrationNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      route.origin.toLowerCase().includes(searchQuery.toLowerCase()) ||
      route.destination.toLowerCase().includes(searchQuery.toLowerCase()) ||
      v.loadingBay.toLowerCase().includes(searchQuery.toLowerCase());

    return matchesRegion && matchesSearch;
  });

  const totalPages = Math.max(1, Math.ceil(filteredVehicles.length / 10));

  useEffect(() => {
    setPageIndex(0);
  }, [searchQuery, activeRegion]);

  useEffect(() => {
    const rotateTimer = setInterval(() => {
      setPageIndex((prev) => (prev + 1) % totalPages);
    }, cycleTimerSeconds * 1000);
    return () => clearInterval(rotateTimer);
  }, [totalPages, cycleTimerSeconds]);

  const pagedVehicles = filteredVehicles.slice(pageIndex * 10, (pageIndex + 1) * 10);

  // Calculate quick overview stats
  const activeCount = vehicles.filter((v) => v.status !== KombiStatus.Offline).length;
  const boardingCount = vehicles.filter((v) => v.status === KombiStatus.Loading).length;
  const nextCount = vehicles.filter((v) => v.status === KombiStatus.Waiting && v.currentQueuePosition === 1).length;
  const delayedCount = vehicles.filter((v) => v.status === KombiStatus.Delayed).length;

  const handleAnnounce = (v: Vehicle, r: Route) => {
    if (onTriggerAnnouncement) {
      let announcementText = `Attention commuters! Vehicle ${v.registrationNumber} traveling from ${r.origin} to ${r.destination} `;
      if (v.status === KombiStatus.Loading) {
        announcementText += `is now loading at ${v.loadingBay}. Please proceed directly to the bay.`;
      } else if (v.status === KombiStatus.Waiting && v.currentQueuePosition === 1) {
        announcementText += `is next in line to load at ${v.loadingBay}. Commuters prepare for boarding.`;
      } else if (v.status === KombiStatus.Delayed) {
        announcementText += `is experiencing a delay. We apologize for the inconvenience.`;
      } else {
        announcementText += `is scheduled at ${v.loadingBay}.`;
      }
      onTriggerAnnouncement(announcementText);
    }
  };

  return (
    <div className="space-y-6">
      {/* Live Board Title and Time */}
      <div className="bg-black/95 dark:bg-[#050505] border-2 border-zinc-900 dark:border-white/10 text-white p-8 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-2xl relative overflow-hidden">
        {/* Subtle decorative grid background for high-tech look */}
        <div className="absolute inset-0 bg-[radial-gradient(#ffffff0a_1px,transparent_1px)] [background-size:16px_16px] pointer-events-none"></div>

        <div className="relative z-10 space-y-1">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 bg-blue-500 rounded-full animate-pulse"></span>
            <span className="text-blue-500 text-xs font-bold tracking-[0.25em] uppercase">live rank feed</span>
          </div>
          <h2 className="text-3xl font-black font-space text-white tracking-tighter uppercase">
            Eswatini Taxi Rank Board <span className="text-blue-500">.</span>
          </h2>
          <p className="text-zinc-400 text-xs uppercase tracking-wider font-semibold">
            Live Loading Bay Queues & Departures Nationwide
          </p>
        </div>

        <div className="relative z-10 flex items-center gap-4 bg-white/5 border border-white/15 px-5 py-3 rounded-lg self-start md:self-auto font-mono-jb shadow-inner">
          <Clock className="w-5 h-5 text-blue-400 animate-pulse" />
          <div className="text-right">
            <div className="text-2xl font-black text-white tracking-widest font-mono-jb">
              {tickerTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </div>
            <div className="text-[9px] text-slate-500 font-bold uppercase tracking-widest">
              SZ SYSTEM TIME | UTC+2
            </div>
          </div>
        </div>
      </div>

      {/* Mini Overview Row - Bold Theme styled in white/5 with solid borders */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div id="quick-active" className="bg-[#0A0A0A] border border-white/10 p-5 rounded-lg flex items-center justify-between hover:border-blue-500/30 transition-all">
          <div>
            <span className="text-[10px] font-black tracking-widest text-slate-400 uppercase block mb-1">Active Fleet</span>
            <div className="text-3xl font-black font-mono-jb text-white">{activeCount}</div>
          </div>
          <div className="w-10 h-10 rounded-sm border border-white/10 bg-white/5 flex items-center justify-center text-lg">
            🚍
          </div>
        </div>
        <div id="quick-boarding" className="bg-[#0A0A0A] border border-white/10 p-5 rounded-lg flex items-center justify-between hover:border-emerald-500/30 transition-all">
          <div>
            <span className="text-[10px] font-black tracking-widest text-slate-400 uppercase block mb-1">Now Loading</span>
            <div className="text-3xl font-black font-mono-jb text-emerald-400">{boardingCount}</div>
          </div>
          <div className="w-10 h-10 rounded-sm border border-emerald-500/20 bg-emerald-500/5 flex items-center justify-center text-lg animate-pulse">
            🏁
          </div>
        </div>
        <div id="quick-next" className="bg-[#0A0A0A] border border-white/10 p-5 rounded-lg flex items-center justify-between hover:border-blue-500/30 transition-all">
          <div>
            <span className="text-[10px] font-black tracking-widest text-slate-400 uppercase block mb-1">Next Up</span>
            <div className="text-3xl font-black font-mono-jb text-blue-400">{nextCount}</div>
          </div>
          <div className="w-10 h-10 rounded-sm border border-blue-500/20 bg-blue-500/5 flex items-center justify-center text-lg">
            ⏳
          </div>
        </div>
        <div id="quick-delayed" className="bg-[#0A0A0A] border border-white/10 p-5 rounded-lg flex items-center justify-between hover:border-yellow-500/30 transition-all">
          <div>
            <span className="text-[10px] font-black tracking-widest text-slate-400 uppercase block mb-1">Delayed</span>
            <div className="text-3xl font-black font-mono-jb text-yellow-500">{delayedCount}</div>
          </div>
          <div className="w-10 h-10 rounded-sm border border-yellow-500/20 bg-yellow-500/5 flex items-center justify-center text-lg animate-bounce">
            ⚠️
          </div>
        </div>
      </div>

      {/* Control Bar: Active Terminal Info & Search */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4 bg-zinc-150 p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 dark:bg-zinc-900">
        {/* Active Terminal Info Badge */}
        <div className="flex items-center gap-2.5 py-1 lg:py-0">
          <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-500 border border-blue-500/20">
            <MapPin className="w-4 h-4 flex-shrink-0 animate-bounce" />
          </div>
          <div>
            <span className="text-[9px] font-black uppercase text-zinc-400 block tracking-wider leading-none mb-0.5">ACTIVE BOARD TERMINAL</span>
            <span className="text-xs font-black text-zinc-900 dark:text-zinc-100 uppercase tracking-tight">
              {(() => {
                const config = regionConfigs?.find((c) => c.region === activeRegion);
                if (config) {
                  return `${config.terminalName} — ${activeRegion}`;
                }
                return `${activeRegion} Terminal`;
              })()}
            </span>
          </div>
        </div>

        {/* Search, Layout Switch & Audio control */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Search box */}
          <div className="relative flex-1 min-w-[200px] sm:flex-initial">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-zinc-400" />
            <input
              type="text"
              placeholder="Search route, bay, or kombi..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-850 rounded-lg pl-9 pr-4 py-1.5 text-xs text-zinc-800 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          {/* Audio Announce Button */}
          <button
            onClick={() => setAudioOn(!isAudioOn)}
            className={`p-2 rounded-lg border text-xs font-bold flex items-center gap-1.5 transition-all outline-none ${
              isAudioOn
                ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-500"
                : "bg-zinc-200/50 border-zinc-300 text-zinc-500 dark:bg-zinc-800 dark:border-zinc-700"
            }`}
            title={isAudioOn ? "Mute audio queue announcements" : "Enable audio queue announcements"}
          >
            {isAudioOn ? <Volume2 className="w-4 h-4 animate-bounce" /> : <VolumeX className="w-4 h-4" />}
            <span className="hidden sm:inline">{isAudioOn ? "Voice ON" : "Voice OFF"}</span>
          </button>

          {/* View Mode Switcher */}
          <div className="flex bg-zinc-250 dark:bg-zinc-800 p-0.5 rounded-lg border border-zinc-300 dark:border-zinc-700">
            <button
              onClick={() => setViewMode("board")}
              className={`p-1.5 rounded-md ${
                viewMode === "board"
                  ? "bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 shadow-sm"
                  : "text-zinc-500"
              }`}
            >
              <List className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode("cards")}
              className={`p-1.5 rounded-md ${
                viewMode === "cards"
                  ? "bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 shadow-sm"
                  : "text-zinc-500"
              }`}
            >
              <Grid className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Board view */}
      {viewMode === "board" ? (
        <div className="bg-black border border-zinc-800 rounded-2xl overflow-hidden shadow-2xl">
          {/* Board Header (Split-flap / Terminal aesthetic) */}
          <div className="grid grid-cols-12 bg-zinc-900 border-b border-zinc-850 px-4 py-3 font-mono-jb text-[10px] md:text-xs text-zinc-400 font-semibold tracking-wider uppercase text-center md:text-left">
            <div className="col-span-2 text-left">Reg No.</div>
            <div className="col-span-3 text-left">Eswatini Route</div>
            <div className="col-span-1 text-center">Bay</div>
            <div className="col-span-1 text-center">Queue</div>
            <div className="col-span-2 text-center">Loading Times</div>
            <div className="col-span-2 text-center">Status</div>
            <div className="col-span-1 text-right">Voice</div>
          </div>

          <div id="dep-list-body" className="divide-y divide-zinc-900 bg-black min-h-[300px]">
            {filteredVehicles.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-12 text-zinc-500 text-sm">
                <span>⚡ No public vehicles in range</span>
                <span className="text-xs text-zinc-600 mt-1">Try changing route region filters or adding a vehicle.</span>
              </div>
            ) : (
              pagedVehicles.map((v) => {
                const r = getRouteDetails(v.routeAssignmentId);
                const statusInfo = getStatusStyle(v.status);
                if (!r) return null;

                return (
                  <div
                    key={v.registrationNumber}
                    className="grid grid-cols-12 px-4 py-3.5 items-center hover:bg-zinc-950/85 transition-all text-center md:text-left text-zinc-300 font-mono-jb text-[11px] md:text-sm border-b border-zinc-900/40"
                  >
                    {/* Reg No */}
                    <div className="col-span-2 text-left font-bold text-yellow-500 tracking-wider">
                      {v.registrationNumber}
                    </div>

                    {/* Route */}
                    <div className="col-span-3 text-left font-semibold text-white truncate flex items-center gap-1.5">
                      <span className="hidden sm:inline-block">📍</span>
                      {r.origin} → {r.destination}
                    </div>

                    {/* Bay */}
                    <div className="col-span-1 text-center">
                      <span className="px-2 py-0.5 rounded bg-zinc-800 text-zinc-200 border border-zinc-700/60 font-sans font-medium text-[10px] md:text-xs">
                        {v.loadingBay}
                      </span>
                    </div>

                    {/* Queue Pos */}
                    <div className="col-span-1 text-center text-zinc-400">
                      {v.currentQueuePosition === 0 ? (
                        <span className="text-zinc-600 font-sans italic text-[10px]">Off</span>
                      ) : v.currentQueuePosition === 1 ? (
                        <span className="text-emerald-400 font-bold animate-pulse text-[11px] md:text-xs">
                          ⭐ 1st
                        </span>
                      ) : (
                        <span className="font-semibold text-xs py-0.5 px-2 bg-zinc-900 border border-zinc-800 text-zinc-300 rounded-full font-sans">
                          {v.currentQueuePosition}
                        </span>
                      )}
                    </div>

                    {/* Loading/Status Times */}
                    <div className="col-span-2 text-center text-xs">
                      {v.status === KombiStatus.Loading ? (
                        <div className="flex flex-col items-center">
                          <span className="text-emerald-400 font-bold font-mono-jb text-[11px] md:text-xs">
                            ⏳ {v.loadingStartTime || "N/A"} → {v.expectedDepartureTime || "N/A"}
                          </span>
                          <span className="text-[9px] text-zinc-500 font-sans">
                            ({v.loadingDurationMinutes || 20}m duration)
                          </span>
                        </div>
                      ) : v.status === KombiStatus.Waiting ? (
                        <span className="text-blue-500 font-bold font-mono-jb text-[11px] md:text-xs">
                          💤 Arr: {v.arrivalRegisterTime || "N/A"}
                        </span>
                      ) : v.status === KombiStatus.Full ? (
                        <span className="text-purple-500 font-bold font-mono-jb text-[11px] md:text-xs">
                          👥 Full: {v.fullCabinTime || "N/A"}
                        </span>
                      ) : v.status === KombiStatus.Returning ? (
                        <span className="text-sky-500 font-bold font-mono-jb text-[11px] md:text-xs">
                          🔄 Ret: {v.returningTime || "N/A"}
                        </span>
                      ) : v.status === KombiStatus.Delayed ? (
                        <span className="text-amber-500 font-bold font-mono-jb text-[11px] md:text-xs">
                          ⚠️ Del: {v.delayedTime || "N/A"}
                        </span>
                      ) : v.status === KombiStatus.Breakdown ? (
                        <span className="text-red-500 font-bold font-mono-jb text-[11px] md:text-xs">
                          🔧 Brk: {v.breakdownTime || "N/A"}
                        </span>
                      ) : (
                        <span className="text-zinc-600 font-mono-jb text-[11px] md:text-xs">
                          {v.lastActive ? new Date(v.lastActive).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "-"}
                        </span>
                      )}
                    </div>

                    {/* Status */}
                    <div className="col-span-2 text-center">
                      <span className={`inline-block px-3 py-1 rounded text-[10px] md:text-xs font-bold leading-tight uppercase font-sans tracking-wide ${statusInfo.text}`}>
                        {statusInfo.label}
                      </span>
                    </div>

                    {/* Make Announce */}
                    <div className="col-span-1 text-right">
                      <button
                        onClick={() => handleAnnounce(v, r)}
                        className={`p-1.5 rounded-full hover:bg-zinc-805 text-zinc-400 hover:text-white transition-all`}
                        title="Broadcast audio announcement"
                      >
                        <Volume2 className="w-4 h-4 inline-block" />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      ) : (
        /* Card-based grid layout for beautiful presentation */
        <div id="dep-grid-body" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {pagedVehicles.map((v) => {
            const r = getRouteDetails(v.routeAssignmentId);
            const statusInfo = getStatusStyle(v.status);
            if (!r) return null;

            return (
              <div
                key={v.registrationNumber}
                className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-250 dark:border-zinc-800 p-5 flex flex-col justify-between hover:shadow-md transition-shadow"
              >
                <div>
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="text-[10px] font-bold tracking-wider text-blue-500 uppercase">
                        {r.region} Region
                      </span>
                      <h3 className="font-space font-bold mt-1 text-zinc-900 dark:text-zinc-100 flex items-center gap-1">
                        {r.origin}
                        <span className="text-zinc-400 text-xs">→</span>
                        {r.destination}
                      </h3>
                    </div>
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${statusInfo.text}`}>
                      {statusInfo.label}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-4 mt-6 p-3 bg-zinc-50 dark:bg-black/35 rounded-xl border border-zinc-200 dark:border-zinc-850 text-xs font-mono-jb">
                    <div>
                      <div className="text-zinc-500 font-sans text-[10px]">VEHICLE REG</div>
                      <div className="font-bold text-zinc-950 dark:text-yellow-500 mt-0.5">{v.registrationNumber}</div>
                    </div>
                    <div>
                      <div className="text-zinc-500 font-sans text-[10px]">LOADING BAY</div>
                      <div className="font-bold text-zinc-950 dark:text-zinc-200 mt-0.5">{v.loadingBay}</div>
                    </div>
                    <div>
                      <div className="text-zinc-500 font-sans text-[10px]">QUEUE PLACE</div>
                      <div className="font-bold text-zinc-950 dark:text-zinc-200 mt-0.5 font-sans">
                        {v.currentQueuePosition === 0 ? "Not Queued" : v.currentQueuePosition === 1 ? "⭐ 1st (Next)" : `#${v.currentQueuePosition}`}
                      </div>
                    </div>
                    <div>
                      <div className="text-zinc-500 font-sans text-[10px]">SEAT SIZE</div>
                      <div className="font-bold text-zinc-950 dark:text-zinc-200 mt-0.5 font-sans">15 Seater</div>
                    </div>

                    {v.status === KombiStatus.Loading && (
                      <div className="col-span-2 border-t border-zinc-200 dark:border-zinc-800 pt-2 mt-1">
                        <div className="text-zinc-500 font-sans text-[9px] uppercase tracking-wider block">
                          ⏰ LOADING TIME SCHEDULE
                        </div>
                        <div className="flex items-center justify-between mt-1 text-zinc-700 dark:text-zinc-300">
                          <span>Start: <strong className="text-zinc-900 dark:text-white">{v.loadingStartTime || "N/A"}</strong></span>
                          <span>Est. Dep: <strong className="text-emerald-500">{v.expectedDepartureTime || "N/A"}</strong></span>
                          <span className="text-[10px] bg-emerald-500/10 text-emerald-400 px-1.5 py-0.5 rounded font-bold">
                            {v.loadingDurationMinutes || 20}m
                          </span>
                        </div>
                      </div>
                    )}

                    {v.status === KombiStatus.Waiting && (
                      <div className="col-span-2 border-t border-zinc-200 dark:border-zinc-800 pt-2 mt-1">
                        <div className="text-zinc-500 font-sans text-[9px] uppercase tracking-wider block">
                          💤 QUEUE REGISTRATION TIME
                        </div>
                        <div className="flex items-center justify-between mt-1 text-zinc-700 dark:text-zinc-300">
                          <span>Registered At: <strong className="text-zinc-900 dark:text-white">{v.arrivalRegisterTime || "N/A"}</strong></span>
                          <span className="text-[10px] bg-blue-500/10 text-blue-400 px-1.5 py-0.5 rounded font-bold uppercase">
                            Queued
                          </span>
                        </div>
                      </div>
                    )}

                    {v.status === KombiStatus.Full && (
                      <div className="col-span-2 border-t border-zinc-200 dark:border-zinc-800 pt-2 mt-1">
                        <div className="text-zinc-500 font-sans text-[9px] uppercase tracking-wider block">
                          👥 FULL CABIN TIMESTAMP
                        </div>
                        <div className="flex items-center justify-between mt-1 text-zinc-700 dark:text-zinc-300">
                          <span>Cabin Filled At: <strong className="text-zinc-900 dark:text-white">{v.fullCabinTime || "N/A"}</strong></span>
                          <span className="text-[10px] bg-purple-500/10 text-purple-400 px-1.5 py-0.5 rounded font-bold uppercase">
                            Full
                          </span>
                        </div>
                      </div>
                    )}

                    {v.status === KombiStatus.Returning && (
                      <div className="col-span-2 border-t border-zinc-200 dark:border-zinc-800 pt-2 mt-1">
                        <div className="text-zinc-500 font-sans text-[9px] uppercase tracking-wider block">
                          🔄 RETURN TRANSIT TIMESTAMP
                        </div>
                        <div className="flex items-center justify-between mt-1 text-zinc-700 dark:text-zinc-300">
                          <span>Returning Since: <strong className="text-zinc-900 dark:text-white">{v.returningTime || "N/A"}</strong></span>
                          <span className="text-[10px] bg-sky-500/10 text-sky-400 px-1.5 py-0.5 rounded font-bold uppercase">
                            In-Route
                          </span>
                        </div>
                      </div>
                    )}

                    {v.status === KombiStatus.Delayed && (
                      <div className="col-span-2 border-t border-zinc-200 dark:border-zinc-800 pt-2 mt-1">
                        <div className="text-zinc-500 font-sans text-[9px] uppercase tracking-wider block">
                          ⚠️ DELAY TIMESTAMP
                        </div>
                        <div className="flex items-center justify-between mt-1 text-zinc-700 dark:text-zinc-300">
                          <span>Reported Delay At: <strong className="text-zinc-900 dark:text-white">{v.delayedTime || "N/A"}</strong></span>
                          <span className="text-[10px] bg-amber-500/10 text-amber-400 px-1.5 py-0.5 rounded font-bold uppercase">
                            Delayed
                          </span>
                        </div>
                      </div>
                    )}

                    {v.status === KombiStatus.Breakdown && (
                      <div className="col-span-2 border-t border-zinc-200 dark:border-zinc-800 pt-2 mt-1">
                        <div className="text-zinc-500 font-sans text-[9px] uppercase tracking-wider block">
                          🔧 EMERGENCY BREAKDOWN TIMESTAMP
                        </div>
                        <div className="flex items-center justify-between mt-1 text-zinc-700 dark:text-zinc-300">
                          <span>Breakdown Logged: <strong className="text-zinc-900 dark:text-white">{v.breakdownTime || "N/A"}</strong></span>
                          <span className="text-[10px] bg-red-500/10 text-red-400 px-1.5 py-0.5 rounded font-bold uppercase">
                            Emergency
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="mt-5 pt-4 border-t border-zinc-150 dark:border-zinc-800 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                    <span className="text-[10px] text-zinc-500">Auto-calculated departure</span>
                  </div>
                  <button
                    onClick={() => handleAnnounce(v, r)}
                    className="text-xs flex items-center gap-1 text-blue-500 dark:text-blue-400 hover:underline font-medium"
                  >
                    <Volume2 className="w-3.5 h-3.5" />
                    Announce
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 10 Vehicles / Page & 12s Auto Switcher Pagination Control */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-zinc-900 border border-zinc-800 p-3.5 rounded-xl text-xs text-zinc-300 font-mono-jb">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
          <span className="font-bold text-white">Auto-Switching Display:</span>
          <span className="text-zinc-400">10 vehicles shown • Cycles every 12s</span>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setPageIndex((prev) => (prev > 0 ? prev - 1 : totalPages - 1))}
            className="px-3 py-1 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg transition-all font-bold cursor-pointer"
          >
            &larr; Prev
          </button>
          <span className="font-bold text-yellow-400">
            Page {pageIndex + 1} of {totalPages}
          </span>
          <button
            onClick={() => setPageIndex((prev) => (prev + 1) % totalPages)}
            className="px-3 py-1 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg transition-all font-bold cursor-pointer"
          >
            Next &rarr;
          </button>
        </div>
      </div>

      {/* Terminal board announcement ticker box */}
      <div className="bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-400 p-4 rounded-xl flex items-start gap-3">
        <span className="pt-0.5">📢</span>
        <div className="text-xs space-y-1">
          <span className="font-bold block text-[10px] uppercase font-sans tracking-wider">Operational Rank Tip:</span>
          <p>
            Commuters can hear queue alerts if Voice Announcements are enabled. Click <strong>Voice ON</strong> and press the speaker button next to any kombi to announce its departure to the rank queue speakers.
          </p>
        </div>
      </div>
    </div>
  );
}
