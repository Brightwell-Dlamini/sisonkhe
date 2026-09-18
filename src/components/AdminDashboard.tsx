/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import {
  Driver,
  Vehicle,
  Route,
  KombiStatus,
  IncidentReport,
  RankFeePayment,
  RegionConfig,
  RankNotification,
  MarshalAccount,
  MarshalTransaction
} from "../types";
import {
  Layers,
  Calendar,
  ListOrdered,
  Clock,
  ArrowUp,
  ArrowDown,
  CheckCircle2,
  AlertTriangle,
  Send,
  Users,
  MapPin,
  ChevronRight,
  Plus,
  Car,
  ShieldCheck,
  Radio,
  Sparkles,
  Search,
  MessageSquare
} from "lucide-react";
import { generateVIC, formatVIC } from "../utils/helper";
import { computeMonthlyRoster } from "../utils/queueSequence";
import VehicleDetailsModal from "./marshal/VehicleDetailsModal";

interface AdminDashboardProps {
  drivers: Driver[];
  vehicles: Vehicle[];
  routes: Route[];
  allRoutes?: Route[];
  incidents: IncidentReport[];
  payments?: RankFeePayment[];
  regionConfigs?: RegionConfig[];
  notifications: RankNotification[];
  onAddNotification: (notif: Omit<RankNotification, "id" | "timestamp">) => void;
  onUpdateRegionConfigs?: (configs: RegionConfig[]) => void;
  onUpdateIncidentStatus: (id: string, status: IncidentReport["status"], escalatedTo: IncidentReport["escalatedTo"]) => void;
  onAddManualIncident: (inc: Omit<IncidentReport, "id" | "timestamp">) => void;
  onAddVehicle?: (v: Vehicle) => void;
  onAddDriver?: (d: Driver) => void;
  onAddRoute?: (r: Route) => void;
  onUpdateVehicle: (updated: Vehicle[]) => void;
  onDeleteVehicle?: (reg: string) => void;
  onDeleteDriver?: (id: string) => void;
  onEditVehicle?: (updatedVeh: Vehicle) => void;
  onEditDriver?: (updatedDriver: Driver) => void;
  onEditRoute?: (updatedRoute: Route) => void;
  onDeleteRoute?: (routeId: string) => void;
  onAddIncidentMessage?: (incidentId: string, text: string, sender: "Commuter" | "Inspector" | "Driver" | "Other", senderName: string) => void;
  moveLoadingToBottom?: boolean;
  onToggleMoveLoadingToBottom?: (val: boolean) => void;
  rankFee?: number;
  splitOperational?: number;
  splitNRTC?: number;
  splitMaintenance?: number;
  onUpdateRankFee?: (fee: number, ops: number, nrtc: number, maint: number) => void;
  onCloakRankFee?: (regNum: string, triggerSource: "Full Cabin Button" | "Depart Button") => void;
  marshals?: MarshalAccount[];
  marshalTransactions?: MarshalTransaction[];
}

export default function AdminDashboard({
  drivers,
  vehicles,
  routes,
  incidents,
  notifications,
  onAddNotification,
  onUpdateVehicle,
  onAddIncidentMessage,
  moveLoadingToBottom = true,
  onCloakRankFee,
  marshals = []
}: AdminDashboardProps) {
  // Navigation: Marshal-focused clean interface
  const [activeSubTab, setActiveSubTab] = useState<"queue" | "roster" | "chat" | "incidents">("queue");
  const [marshalRosterDay, setMarshalRosterDay] = useState<number>(() => new Date().getDate());

  // Active marshal context
  // Default to Thabo Tsabedze (mar_2) who operates Manzini -> Mbabane corridor with MMZ-601, MMZ-702, MMZ-019
  const [selectedMarshalId, setSelectedMarshalId] = useState<string>(() => {
    const foundM2 = marshals.find(m => m.id === "mar_2");
    return foundM2 ? foundM2.id : (marshals[0]?.id || "mar_1");
  });

  // Selected vehicle for details modal
  const [selectedVehicleForModal, setSelectedVehicleForModal] = useState<Vehicle | null>(null);

  // Search filter for unqueued vehicles
  const [addVehicleSearch, setAddVehicleSearch] = useState("");
  const [isAddVehicleOpen, setIsAddVehicleOpen] = useState(false);

  // Chat input
  const [selectedChatDriverId, setSelectedChatDriverId] = useState<string>(drivers[0]?.id || "");
  const [marshalChatInput, setMarshalChatInput] = useState("");

  // Toast / feedback message
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);

  const showFeedback = (msg: string) => {
    setFeedbackMessage(msg);
    setTimeout(() => setFeedbackMessage(null), 3500);
  };

  // Identify active marshal and assigned route
  const activeMarshal = marshals.find(m => m.id === selectedMarshalId) || marshals[0];
  const assignedRoute = routes.find(r => r.id === activeMarshal?.assignedRouteId) || routes[0];

  // Vehicles in queue for the active marshal's assigned route
  const assignedRouteVehicles = vehicles.filter(v => v.routeAssignmentId === assignedRoute?.id);

  // Active queue sorted by currentQueuePosition (1, 2, 3...)
  const activeQueue = assignedRouteVehicles
    .filter(v => (v.currentQueuePosition || 0) > 0 && v.status !== KombiStatus.Offline)
    .sort((a, b) => (a.currentQueuePosition || 999) - (b.currentQueuePosition || 999));

  // Off-queue vehicles (available to be queued)
  const offQueueVehicles = vehicles.filter(v => {
    const isOffQueue = (v.currentQueuePosition === 0 || !v.currentQueuePosition);
    const isAssignedOrSameRegion = v.routeAssignmentId === assignedRoute?.id ||
      routes.find(r => r.id === v.routeAssignmentId)?.region === assignedRoute?.region;
    return isOffQueue && isAssignedOrSameRegion && v.status !== KombiStatus.Offline;
  });

  const filteredOffQueue = offQueueVehicles.filter(v => {
    const vic = formatVIC(v.vic || v.fleetNumber || v.registrationNumber);
    const query = addVehicleSearch.toLowerCase();
    return vic.toLowerCase().includes(query) ||
      v.registrationNumber.toLowerCase().includes(query) ||
      v.make.toLowerCase().includes(query) ||
      v.model.toLowerCase().includes(query);
  });

  // Reorder queue
  const handleMoveQueue = (regNum: string, direction: "up" | "down") => {
    const index = activeQueue.findIndex(v => v.registrationNumber === regNum);
    if (index === -1) return;

    if (direction === "up" && index > 0) {
      const prevVeh = activeQueue[index - 1];
      const currVeh = activeQueue[index];
      const updated = vehicles.map(v => {
        if (v.registrationNumber === currVeh.registrationNumber) {
          return { ...v, currentQueuePosition: index };
        }
        if (v.registrationNumber === prevVeh.registrationNumber) {
          return { ...v, currentQueuePosition: index + 1 };
        }
        return v;
      });
      onUpdateVehicle(updated);
      showFeedback(`Moved ${formatVIC(currVeh.vic || currVeh.registrationNumber)} to position #${index}`);
    } else if (direction === "down" && index < activeQueue.length - 1) {
      const nextVeh = activeQueue[index + 1];
      const currVeh = activeQueue[index];
      const updated = vehicles.map(v => {
        if (v.registrationNumber === currVeh.registrationNumber) {
          return { ...v, currentQueuePosition: index + 2 };
        }
        if (v.registrationNumber === nextVeh.registrationNumber) {
          return { ...v, currentQueuePosition: index + 1 };
        }
        return v;
      });
      onUpdateVehicle(updated);
      showFeedback(`Moved ${formatVIC(currVeh.vic || currVeh.registrationNumber)} to position #${index + 2}`);
    }
  };

  // Add vehicle to queue
  const handleAddToQueue = (vehicleReg: string) => {
    const nextPos = activeQueue.length + 1;
    const now = new Date();
    const startTimeStr = `${now.getHours().toString().padStart(2, "0")}:${now.getMinutes().toString().padStart(2, "0")}`;
    const expMinutes = (now.getMinutes() + 20) % 60;
    const expHours = now.getHours() + Math.floor((now.getMinutes() + 20) / 60);
    const expTimeStr = `${expHours.toString().padStart(2, "0")}:${expMinutes.toString().padStart(2, "0")}`;

    const updated = vehicles.map(v => {
      if (v.registrationNumber === vehicleReg) {
        return {
          ...v,
          routeAssignmentId: assignedRoute?.id || v.routeAssignmentId,
          currentQueuePosition: nextPos,
          status: nextPos === 1 ? KombiStatus.Loading : KombiStatus.Waiting,
          loadingStartTime: nextPos === 1 ? startTimeStr : undefined,
          expectedDepartureTime: nextPos === 1 ? expTimeStr : undefined,
          loadingDurationMinutes: 20
        };
      }
      return v;
    });

    onUpdateVehicle(updated);
    setIsAddVehicleOpen(false);
    setAddVehicleSearch("");
    const addedVeh = vehicles.find(v => v.registrationNumber === vehicleReg);
    showFeedback(`${formatVIC(addedVeh?.vic || vehicleReg)} added to queue at position #${nextPos}!`);
  };

  // Dispatch vehicle (Depart)
  const handleDepartVehicle = (vehicleReg: string) => {
    if (onCloakRankFee) {
      onCloakRankFee(vehicleReg, "Depart Button");
    }

    const departed = vehicles.find(v => v.registrationNumber === vehicleReg);
    const updated = vehicles.map(v => {
      if (v.registrationNumber === vehicleReg) {
        return {
          ...v,
          status: KombiStatus.Departed,
          currentQueuePosition: moveLoadingToBottom ? (activeQueue.length) : 0,
          tripsToday: (v.tripsToday || 0) + 1,
          lastActive: new Date().toISOString()
        };
      }
      // Advance vehicles behind it
      if (departed && (v.currentQueuePosition || 0) > (departed.currentQueuePosition || 0)) {
        const newPos = (v.currentQueuePosition || 1) - 1;
        const isNowFirst = newPos === 1;
        const now = new Date();
        const startStr = `${now.getHours().toString().padStart(2, "0")}:${now.getMinutes().toString().padStart(2, "0")}`;
        const expMin = (now.getMinutes() + 20) % 60;
        const expHr = now.getHours() + Math.floor((now.getMinutes() + 20) / 60);
        const expStr = `${expHr.toString().padStart(2, "0")}:${expMin.toString().padStart(2, "0")}`;

        return {
          ...v,
          currentQueuePosition: newPos,
          status: isNowFirst ? KombiStatus.Loading : v.status,
          loadingStartTime: isNowFirst ? startStr : v.loadingStartTime,
          expectedDepartureTime: isNowFirst ? expStr : v.expectedDepartureTime,
          loadingDurationMinutes: 20
        };
      }
      return v;
    });

    onUpdateVehicle(updated);
    showFeedback(`Vehicle ${formatVIC(departed?.vic || vehicleReg)} dispatched! Next vehicle advanced to loading bay.`);
    if (selectedVehicleForModal?.registrationNumber === vehicleReg) {
      setSelectedVehicleForModal(null);
    }
  };

  // Full Cabin button (collects fee and dispatches)
  const handleFullCabin = (vehicleReg: string) => {
    if (onCloakRankFee) {
      onCloakRankFee(vehicleReg, "Full Cabin Button");
    }

    const departed = vehicles.find(v => v.registrationNumber === vehicleReg);
    const updated = vehicles.map(v => {
      if (v.registrationNumber === vehicleReg) {
        return {
          ...v,
          status: KombiStatus.Departed,
          currentQueuePosition: moveLoadingToBottom ? activeQueue.length : 0,
          tripsToday: (v.tripsToday || 0) + 1,
          lastActive: new Date().toISOString()
        };
      }
      if (departed && (v.currentQueuePosition || 0) > (departed.currentQueuePosition || 0)) {
        const newPos = (v.currentQueuePosition || 1) - 1;
        const isNowFirst = newPos === 1;
        const now = new Date();
        const startStr = `${now.getHours().toString().padStart(2, "0")}:${now.getMinutes().toString().padStart(2, "0")}`;
        const expMin = (now.getMinutes() + 20) % 60;
        const expHr = now.getHours() + Math.floor((now.getMinutes() + 20) / 60);
        const expStr = `${expHr.toString().padStart(2, "0")}:${expMin.toString().padStart(2, "0")}`;

        return {
          ...v,
          currentQueuePosition: newPos,
          status: isNowFirst ? KombiStatus.Loading : v.status,
          loadingStartTime: isNowFirst ? startStr : v.loadingStartTime,
          expectedDepartureTime: isNowFirst ? expStr : v.expectedDepartureTime,
          loadingDurationMinutes: 20
        };
      }
      return v;
    });

    onUpdateVehicle(updated);
    showFeedback(`Full Cabin logged for ${formatVIC(departed?.vic || vehicleReg)}! E25 Rank Fee registered.`);
    if (selectedVehicleForModal?.registrationNumber === vehicleReg) {
      setSelectedVehicleForModal(null);
    }
  };

  // Handle chat message
  const handleSendChatMessage = (text: string) => {
    if (!text.trim()) return;
    const activeDriver = drivers.find(d => d.id === selectedChatDriverId);
    if (!activeDriver) return;

    onAddNotification({
      type: "Push",
      recipientName: activeDriver.fullName,
      recipientPhone: activeDriver.phone,
      message: text.trim(),
      status: "Delivered"
    });

    setMarshalChatInput("");
    showFeedback(`Message transmitted to ${activeDriver.fullName}`);
  };

  // Roster calculations for 30-Day Roster mode
  const routeFleet = assignedRouteVehicles.length > 0
    ? assignedRouteVehicles
    : vehicles.filter(v => {
        const r = routes.find(rt => rt.id === v.routeAssignmentId);
        return r && r.region === assignedRoute?.region;
      });

  const rosterPlan = computeMonthlyRoster(routeFleet, undefined, drivers);
  const dayEntry = rosterPlan.dailyRoster.find(d => d.dayNumber === marshalRosterDay);
  const dailyRosterVehicles = dayEntry ? dayEntry.queueOrder : [];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Marshal Profile & Assigned Route Banner */}
      <div className="bg-zinc-950 text-white rounded-3xl p-6 border border-zinc-850 shadow-sm relative overflow-hidden">
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          {/* Left: Marshal identity & selector */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-bold tracking-wider uppercase border border-emerald-500/30 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Rank Marshal on Duty
              </span>
              {activeMarshal?.badgeNumber && (
                <span className="px-2 py-0.5 rounded-md bg-zinc-800 text-zinc-300 font-mono text-xs font-bold">
                  {activeMarshal.badgeNumber}
                </span>
              )}
            </div>

            <div className="flex items-center gap-3">
              <h2 className="text-xl font-black text-white uppercase tracking-tight">
                {activeMarshal?.fullName || "Rank Marshal"}
              </h2>

              {/* Quick Marshal Switcher */}
              <div className="flex items-center gap-1">
                <span className="text-[10px] text-zinc-400 uppercase font-bold">Switch:</span>
                <select
                  value={selectedMarshalId}
                  onChange={(e) => setSelectedMarshalId(e.target.value)}
                  className="bg-zinc-900 border border-zinc-700 text-white text-xs rounded-xl px-2.5 py-1 focus:ring-2 focus:ring-emerald-500 outline-none cursor-pointer"
                >
                  {marshals.map(m => (
                    <option key={m.id} value={m.id}>
                      {m.fullName} ({m.terminalName})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <p className="text-xs text-zinc-400 flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-emerald-400" />
              <span>{activeMarshal?.terminalName} • {activeMarshal?.region} Region</span>
            </p>
          </div>

          {/* Center/Right: Assigned Route Card */}
          {assignedRoute && (
            <div className="bg-zinc-900/90 border border-zinc-800 p-4 rounded-2xl flex flex-col sm:flex-row sm:items-center gap-4 lg:min-w-[400px]">
              <div className="flex-1">
                <span className="text-[9px] font-black text-amber-400 uppercase tracking-wider block">
                  Assigned Commercial Corridor
                </span>
                <div className="text-lg font-black text-white mt-0.5 flex items-center gap-2">
                  <span>{assignedRoute.origin}</span>
                  <span className="text-emerald-400">➔</span>
                  <span>{assignedRoute.destination}</span>
                </div>
                <div className="flex items-center gap-3 text-[11px] text-zinc-400 mt-1">
                  <span>Code: <strong className="text-zinc-200 font-mono">{assignedRoute.id}</strong></span>
                  <span>•</span>
                  <span>Fare: <strong className="text-emerald-400 font-mono">E{assignedRoute.baseFareE || 50}.00</strong></span>
                  <span>•</span>
                  <span>Bay: <strong className="text-amber-400 font-mono">Bay 1</strong></span>
                </div>
              </div>

              {/* Queue Status Pill */}
              <div className="px-4 py-2 bg-zinc-800/80 rounded-xl border border-zinc-700/60 text-center shrink-0">
                <span className="text-[9px] text-zinc-400 uppercase font-bold block">Active Queue</span>
                <span className="text-xl font-black font-mono text-emerald-400 block">
                  {activeQueue.length}
                </span>
                <span className="text-[9px] text-zinc-400 uppercase block">In Bay</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Marshal Sub-navigation Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-200 dark:border-zinc-800 pb-3">
        <div className="flex items-center gap-1.5 bg-zinc-100 dark:bg-zinc-900 p-1 rounded-2xl border border-zinc-200 dark:border-zinc-800">
          <button
            onClick={() => setActiveSubTab("queue")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              activeSubTab === "queue"
                ? "bg-white dark:bg-zinc-800 text-zinc-950 dark:text-white shadow-sm"
                : "text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
            }`}
          >
            <ListOrdered className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span>⚡ Live Bay Queue</span>
            <span className="px-1.5 py-0.2 bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 rounded-full text-[10px] font-mono">
              {activeQueue.length}
            </span>
          </button>

          <button
            onClick={() => setActiveSubTab("roster")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              activeSubTab === "roster"
                ? "bg-white dark:bg-zinc-800 text-zinc-950 dark:text-white shadow-sm"
                : "text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
            }`}
          >
            <Calendar className="w-4 h-4 text-purple-500" />
            <span>📅 30-Day Rotation Roster</span>
          </button>

          <button
            onClick={() => setActiveSubTab("chat")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              activeSubTab === "chat"
                ? "bg-white dark:bg-zinc-800 text-zinc-950 dark:text-white shadow-sm"
                : "text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
            }`}
          >
            <MessageSquare className="w-4 h-4 text-blue-500" />
            <span>💬 Driver Comms</span>
          </button>
        </div>

        {feedbackMessage && (
          <div className="px-3.5 py-1.5 bg-emerald-50 dark:bg-emerald-950/70 border border-emerald-300 dark:border-emerald-700 text-emerald-800 dark:text-emerald-200 rounded-xl text-xs font-bold flex items-center gap-1.5 animate-fade-in shadow-sm">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>{feedbackMessage}</span>
          </div>
        )}
      </div>

      {/* SUB-VIEW 1: LIVE BAY QUEUE */}
      {activeSubTab === "queue" && (
        <div className="space-y-6">
          {/* Queue Header & Add Vehicle Trigger */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-5 rounded-3xl shadow-sm">
            <div>
              <h3 className="text-sm font-black text-zinc-900 dark:text-white uppercase flex items-center gap-2">
                <Car className="w-4 h-4 text-emerald-600" />
                Queue Sequence — {assignedRoute ? `${assignedRoute.origin} to ${assignedRoute.destination}` : "Assigned Route"}
              </h3>
              <p className="text-xs text-zinc-500 mt-0.5">
                Vehicles appear strictly by <strong>VIC Number</strong> (e.g. MMZ-601, MMZ-702, MMZ-019). Click any vehicle to inspect full PDP, COF & road permit credentials.
              </p>
            </div>

            <button
              onClick={() => setIsAddVehicleOpen(!isAddVehicleOpen)}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-2xl transition-all flex items-center gap-1.5 cursor-pointer shadow-sm shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>Add Vehicle to Queue</span>
            </button>
          </div>

          {/* Add Vehicle Drawer */}
          {isAddVehicleOpen && (
            <div className="bg-zinc-50 dark:bg-zinc-850/60 border border-zinc-200 dark:border-zinc-800 p-5 rounded-3xl space-y-4 animate-fade-in">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-black text-zinc-900 dark:text-white uppercase">
                  Select Unqueued Vehicle to Add to Tail of Queue
                </h4>
                <button
                  onClick={() => setIsAddVehicleOpen(false)}
                  className="text-zinc-400 hover:text-zinc-600 text-xs font-bold"
                >
                  Close ✕
                </button>
              </div>

              <div className="relative">
                <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search by VIC number (e.g. MMZ-019) or registration..."
                  value={addVehicleSearch}
                  onChange={(e) => setAddVehicleSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-emerald-500 outline-none"
                />
              </div>

              {filteredOffQueue.length === 0 ? (
                <div className="p-6 text-center text-xs text-zinc-400 border border-dashed border-zinc-200 dark:border-zinc-800 rounded-2xl">
                  No unassigned vehicles found matching search.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 max-h-60 overflow-y-auto pr-1">
                  {filteredOffQueue.map((veh) => {
                    const vic = formatVIC(veh.vic || veh.fleetNumber || veh.registrationNumber);
                    const drv = drivers.find(d => d.id === veh.driverId);
                    return (
                      <div
                        key={veh.registrationNumber}
                        className="p-3.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl flex items-center justify-between gap-3 shadow-xs"
                      >
                        <div>
                          <span className="font-mono font-black text-sm text-zinc-900 dark:text-white block">
                            {vic}
                          </span>
                          <span className="text-[10px] text-zinc-400 block font-mono">
                            {veh.registrationNumber} • {veh.make} {veh.model}
                          </span>
                          {drv && (
                            <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold block mt-0.5">
                              Driver: {drv.fullName}
                            </span>
                          )}
                        </div>

                        <button
                          onClick={() => handleAddToQueue(veh.registrationNumber)}
                          className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold cursor-pointer transition-colors shadow-xs"
                        >
                          Queue
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* MAIN VEHICLES QUEUE LIST */}
          <div className="space-y-3">
            {activeQueue.length === 0 ? (
              <div className="bg-white dark:bg-zinc-900 border border-dashed border-zinc-300 dark:border-zinc-800 rounded-3xl p-12 text-center text-zinc-400 space-y-2">
                <Car className="w-10 h-10 mx-auto text-zinc-300 dark:text-zinc-700" />
                <h4 className="text-sm font-bold text-zinc-600 dark:text-zinc-400">
                  No vehicles currently queued on this corridor bay
                </h4>
                <p className="text-xs text-zinc-400 max-w-sm mx-auto">
                  Click "Add Vehicle to Queue" above to assign waiting kombis to this loading bay.
                </p>
              </div>
            ) : (
              activeQueue.map((veh, index) => {
                const vic = formatVIC(veh.vic || veh.fleetNumber || veh.registrationNumber);
                const isLead = index === 0;
                const driver = drivers.find(d => d.id === veh.driverId);

                return (
                  <div
                    key={veh.registrationNumber}
                    className={`rounded-3xl border transition-all shadow-sm ${
                      isLead
                        ? "bg-white dark:bg-zinc-900 border-emerald-500 dark:border-emerald-500 ring-2 ring-emerald-500/20"
                        : "bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700"
                    }`}
                  >
                    <div className="p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                      {/* Left: Position & Vehicle List Information (Clickable to open details) */}
                      <div
                        onClick={() => setSelectedVehicleForModal(veh)}
                        className="flex items-center gap-4 cursor-pointer flex-1 min-w-0 group"
                        title="Click to view full details (PDP, COF, Permit, Plate)"
                      >
                        {/* Position Badge */}
                        <div
                          className={`w-12 h-12 rounded-2xl flex flex-col items-center justify-center font-mono font-black shrink-0 transition-transform group-hover:scale-105 ${
                            isLead
                              ? "bg-emerald-600 text-white shadow-md"
                              : "bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300"
                          }`}
                        >
                          <span className="text-[9px] uppercase tracking-wider font-bold">Pos</span>
                          <span className="text-base leading-none">#{index + 1}</span>
                        </div>

                        {/* VIC & Plate Display */}
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xl font-black font-mono text-zinc-900 dark:text-white tracking-wide group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                              {vic}
                            </span>
                            {isLead && (
                              <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 text-[10px] font-bold uppercase tracking-wider animate-pulse">
                                Loading Bay • Lead
                              </span>
                            )}
                            <span className="text-xs font-mono font-semibold text-zinc-500">
                              ({veh.registrationNumber})
                            </span>
                          </div>

                          <div className="flex items-center gap-3 text-xs text-zinc-500 mt-1 flex-wrap">
                            <span>
                              Driver: <strong className="text-zinc-800 dark:text-zinc-200">{driver ? driver.fullName : "Unassigned"}</strong>
                            </span>
                            <span>•</span>
                            <span>
                              Model: <strong className="text-zinc-800 dark:text-zinc-200">{veh.make} {veh.model}</strong> ({veh.seatingCapacity} seats)
                            </span>
                            <span>•</span>
                            <span className="text-emerald-600 dark:text-emerald-400 font-semibold underline text-[11px]">
                              View Credentials &raquo;
                            </span>
                          </div>

                          {/* Loading time indicator */}
                          {(isLead || veh.loadingStartTime) && (
                            <div className="flex items-center gap-1.5 text-[11px] text-amber-600 dark:text-amber-400 font-mono font-bold mt-1">
                              <Clock className="w-3.5 h-3.5" />
                              <span>Loading window: {veh.loadingStartTime || "08:15"} → {veh.expectedDepartureTime || "08:35"}</span>
                              <span className="text-zinc-400 font-normal">({veh.loadingDurationMinutes || 20} min)</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Right: Marshal Action Buttons */}
                      <div className="flex items-center gap-2 pt-3 md:pt-0 border-t md:border-t-0 border-zinc-100 dark:border-zinc-800 shrink-0">
                        {/* Queue Reordering Buttons */}
                        <div className="flex items-center bg-zinc-100 dark:bg-zinc-800 p-1 rounded-xl">
                          <button
                            onClick={() => handleMoveQueue(veh.registrationNumber, "up")}
                            disabled={index === 0}
                            className="p-1.5 text-zinc-500 hover:text-blue-600 disabled:opacity-20 cursor-pointer disabled:cursor-not-allowed transition-all"
                            title="Move vehicle up in queue"
                          >
                            <ArrowUp className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleMoveQueue(veh.registrationNumber, "down")}
                            disabled={index === activeQueue.length - 1}
                            className="p-1.5 text-zinc-500 hover:text-blue-600 disabled:opacity-20 cursor-pointer disabled:cursor-not-allowed transition-all"
                            title="Move vehicle down in queue"
                          >
                            <ArrowDown className="w-4 h-4" />
                          </button>
                        </div>

                        {/* Lead Vehicle Actions */}
                        {isLead ? (
                          <>
                            <button
                              onClick={() => handleFullCabin(veh.registrationNumber)}
                              className="px-3.5 py-2 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs rounded-xl transition-all flex items-center gap-1.5 shadow-sm cursor-pointer"
                              title="Full Cabin: Collects E25 rank fee and dispatches vehicle"
                            >
                              <Sparkles className="w-3.5 h-3.5" />
                              <span>Full Cabin (E25)</span>
                            </button>

                            <button
                              onClick={() => handleDepartVehicle(veh.registrationNumber)}
                              className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl transition-all flex items-center gap-1.5 shadow-sm cursor-pointer"
                              title="Mark departed and advance next vehicle to bay"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>Depart Bay</span>
                            </button>
                          </>
                        ) : (
                          <button
                            onClick={() => setSelectedVehicleForModal(veh)}
                            className="px-3 py-2 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 font-bold text-xs rounded-xl transition-all cursor-pointer"
                          >
                            Details
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* SUB-VIEW 2: 30-DAY CIRCULAR ROSTER */}
      {activeSubTab === "roster" && (
        <div className="space-y-6">
          {/* Roster Rule Banner */}
          <div className="bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800 p-5 rounded-3xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <span className="text-[10px] font-black uppercase text-purple-700 dark:text-purple-300 tracking-wider block">
                30-Day Fair Rotation Rule
              </span>
              <h3 className="text-sm font-black text-purple-900 dark:text-purple-100 uppercase mt-0.5">
                #1 on Day 1 is last on Day 2 • #2 on Day 1 is 1st on Day 2
              </h3>
              <p className="text-xs text-purple-700 dark:text-purple-300 mt-1">
                Mid-month additions join at the tail of the roster without perturbing existing sequence slots. All vehicles listed by official VIC code.
              </p>
            </div>

            <div className="px-3.5 py-1.5 bg-white dark:bg-zinc-900 border border-purple-200 dark:border-purple-800 text-purple-900 dark:text-purple-300 text-xs font-mono font-bold rounded-xl text-center shrink-0">
              Selected: Day {marshalRosterDay} of 30
            </div>
          </div>

          {/* Day Selector (1 to 30) */}
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-5 rounded-3xl shadow-sm space-y-3">
            <span className="text-xs font-bold text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-purple-500" />
              Select Day of 30-Day Cycle:
            </span>

            <div className="grid grid-cols-5 sm:grid-cols-10 md:grid-cols-15 gap-1.5">
              {Array.from({ length: 30 }, (_, idx) => {
                const dayNum = idx + 1;
                const isSelected = marshalRosterDay === dayNum;
                const isToday = new Date().getDate() === dayNum;

                return (
                  <button
                    key={dayNum}
                    onClick={() => setMarshalRosterDay(dayNum)}
                    className={`p-2.5 rounded-2xl border text-center transition-all cursor-pointer relative ${
                      isSelected
                        ? "bg-purple-600 text-white border-purple-600 shadow-md scale-105 z-10"
                        : "bg-zinc-50 dark:bg-zinc-800/40 border-zinc-200 dark:border-zinc-700/60 hover:border-purple-400 text-zinc-800 dark:text-zinc-200"
                    }`}
                  >
                    {isToday && (
                      <span className="absolute top-1 right-1 px-1 rounded text-[7px] font-black uppercase bg-emerald-500 text-white">
                        Today
                      </span>
                    )}
                    <span className="text-[9px] uppercase block opacity-70 font-bold">
                      Day
                    </span>
                    <strong className="text-sm font-mono font-black block">
                      {dayNum}
                    </strong>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Roster Vehicles for Selected Day */}
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-6 rounded-3xl shadow-sm space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-150 dark:border-zinc-800">
              <h4 className="text-sm font-black text-zinc-900 dark:text-white uppercase">
                Day {marshalRosterDay} Sequence for {assignedRoute?.origin} ➔ {assignedRoute?.destination}
              </h4>
              <span className="text-xs font-mono font-bold text-purple-600 dark:text-purple-400">
                {dailyRosterVehicles.length} Registered Kombis
              </span>
            </div>

            <div className="space-y-2.5">
              {dailyRosterVehicles.length === 0 ? (
                <div className="p-8 text-center text-xs text-zinc-400">
                  No vehicles assigned to this corridor.
                </div>
              ) : (
                dailyRosterVehicles.map((veh) => {
                  const originalVeh = vehicles.find(v => v.registrationNumber === veh.vehicleReg);
                  const isLead = veh.position === 1;

                  return (
                    <div
                      key={veh.vehicleReg}
                      onClick={() => originalVeh && setSelectedVehicleForModal(originalVeh)}
                      className={`p-4 rounded-2xl border flex items-center justify-between gap-4 cursor-pointer transition-all hover:scale-[1.005] ${
                        isLead
                          ? "bg-emerald-50 dark:bg-emerald-950/20 border-emerald-400 dark:border-emerald-700"
                          : "bg-zinc-50 dark:bg-zinc-850/40 border-zinc-200 dark:border-zinc-800"
                      }`}
                    >
                      <div className="flex items-center gap-3.5">
                        <span className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs font-mono ${
                          isLead ? "bg-emerald-600 text-white" : "bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300"
                        }`}>
                          #{veh.position}
                        </span>
                        <div>
                          <span className="font-mono font-black text-sm text-zinc-900 dark:text-white block">
                            {formatVIC(veh.vic || veh.fleetNumber || veh.vehicleReg)}
                          </span>
                          <span className="text-[10px] text-zinc-500 font-mono">
                            {veh.vehicleReg} • Driver: {veh.driverName || "Assigned Driver"}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {isLead && (
                          <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 text-[10px] font-bold uppercase font-mono">
                            Day {marshalRosterDay} Lead
                          </span>
                        )}
                        <span className="text-xs text-zinc-400 font-mono">
                          Bay 1
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* SUB-VIEW 3: DRIVER COMMS */}
      {activeSubTab === "chat" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Driver List */}
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-5 rounded-3xl space-y-3">
            <h4 className="text-xs font-black text-zinc-900 dark:text-white uppercase">
              Fleet Drivers on Route
            </h4>
            <div className="space-y-2 max-h-[450px] overflow-y-auto pr-1">
              {drivers.map(d => {
                const isSelected = d.id === selectedChatDriverId;
                const assignedV = vehicles.find(v => v.registrationNumber === d.assignedVehicleReg);
                const vic = assignedV ? formatVIC(assignedV.vic || assignedV.registrationNumber) : null;

                return (
                  <button
                    key={d.id}
                    onClick={() => setSelectedChatDriverId(d.id)}
                    className={`w-full text-left p-3 rounded-2xl border transition-all flex items-center gap-3 cursor-pointer ${
                      isSelected
                        ? "bg-blue-50 dark:bg-blue-950/30 border-blue-500 dark:border-blue-500 shadow-sm"
                        : "bg-zinc-50 dark:bg-zinc-850/40 border-zinc-200 dark:border-zinc-800 hover:border-zinc-300"
                    }`}
                  >
                    <div className="w-9 h-9 rounded-full bg-zinc-200 dark:bg-zinc-800 flex items-center justify-center font-bold text-xs uppercase">
                      {d.fullName.split(" ").map(n => n[0]).join("")}
                    </div>
                    <div className="min-w-0 flex-1">
                      <span className="font-bold text-xs text-zinc-900 dark:text-zinc-100 block truncate">
                        {d.fullName}
                      </span>
                      <span className="text-[10px] text-zinc-500 font-mono block">
                        {vic ? `${vic} (${d.assignedVehicleReg})` : d.phone}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Chat Transcript and Input */}
          <div className="lg:col-span-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-6 rounded-3xl flex flex-col justify-between min-h-[450px] shadow-sm">
            {(() => {
              const activeDriver = drivers.find(d => d.id === selectedChatDriverId) || drivers[0];
              const driverMessages = notifications.filter(
                n => n.recipientName === activeDriver?.fullName || n.recipientPhone === activeDriver?.phone
              );

              return (
                <>
                  <div className="border-b border-zinc-200 dark:border-zinc-800 pb-3 mb-4 flex items-center justify-between">
                    <div>
                      <span className="text-[9px] font-black text-blue-500 uppercase block">Dispatch Comms</span>
                      <h4 className="text-sm font-black text-zinc-900 dark:text-white uppercase">
                        {activeDriver?.fullName} ({activeDriver?.phone})
                      </h4>
                    </div>
                    <span className="px-2 py-0.5 bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 text-[10px] font-bold rounded-full">
                      Direct Channel
                    </span>
                  </div>

                  <div className="flex-1 overflow-y-auto space-y-3 mb-4 max-h-[300px] pr-1">
                    {driverMessages.length === 0 ? (
                      <div className="p-8 text-center text-xs text-zinc-400">
                        No previous messages logged with {activeDriver?.fullName}. Type a message below.
                      </div>
                    ) : (
                      driverMessages.map((msg, i) => (
                        <div key={i} className="p-3 bg-zinc-50 dark:bg-zinc-800/50 rounded-2xl text-xs space-y-1">
                          <div className="flex items-center justify-between text-[10px] text-zinc-400">
                            <span className="font-bold text-zinc-600 dark:text-zinc-300">{msg.type} Dispatch</span>
                            <span>{new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                          </div>
                          <p className="text-zinc-800 dark:text-zinc-200">{msg.message}</p>
                        </div>
                      ))
                    )}
                  </div>

                  <div className="space-y-2 pt-3 border-t border-zinc-200 dark:border-zinc-800">
                    {/* Presets */}
                    <div className="flex flex-wrap gap-1">
                      {[
                        "Your loading bay slot is now active. Please pull forward.",
                        "Documents verified. You are cleared for departure.",
                        "Traffic advisory on corridor. Maintain caution."
                      ].map((preset, idx) => (
                        <button
                          key={idx}
                          onClick={() => handleSendChatMessage(preset)}
                          className="px-2.5 py-1 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 text-zinc-700 dark:text-zinc-300 text-[10px] font-bold rounded-lg cursor-pointer transition-colors"
                        >
                          {preset}
                        </button>
                      ))}
                    </div>

                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        handleSendChatMessage(marshalChatInput);
                      }}
                      className="flex items-center gap-2 mt-2"
                    >
                      <input
                        type="text"
                        placeholder={`Message ${activeDriver?.fullName}...`}
                        value={marshalChatInput}
                        onChange={(e) => setMarshalChatInput(e.target.value)}
                        className="flex-1 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl px-3.5 py-2 text-xs font-medium focus:ring-2 focus:ring-blue-500 outline-none"
                      />
                      <button
                        type="submit"
                        className="p-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl cursor-pointer transition-colors"
                      >
                        <Send className="w-4 h-4" />
                      </button>
                    </form>
                  </div>
                </>
              );
            })()}
          </div>
        </div>
      )}

      {/* VEHICLE DETAILS MODAL */}
      {selectedVehicleForModal && (
        <VehicleDetailsModal
          isOpen={!!selectedVehicleForModal}
          vehicle={selectedVehicleForModal}
          driver={drivers.find(d => d.id === selectedVehicleForModal.driverId)}
          route={routes.find(r => r.id === selectedVehicleForModal.routeAssignmentId)}
          onClose={() => setSelectedVehicleForModal(null)}
          onDepart={handleDepartVehicle}
          onFullCabin={handleFullCabin}
          onMoveUp={(reg) => handleMoveQueue(reg, "up")}
          onMoveDown={(reg) => handleMoveQueue(reg, "down")}
          queuePosition={selectedVehicleForModal.currentQueuePosition}
        />
      )}
    </div>
  );
}
