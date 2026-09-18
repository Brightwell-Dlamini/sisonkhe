/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from "react";
import { Driver, Vehicle, Route, KombiStatus, Trip, RankNotification, RankFeePayment, IncidentReport } from "../types";
import { 
  UserCheck, MapPin, CheckCircle2, CreditCard, 
  Clock, ArrowRight, Zap, RefreshCw, Moon, Sun, AlertTriangle, ShieldCheck
} from "lucide-react";
import { getOrCreateVehicleVirtualCard, chargeVirtualCard, topUpVirtualCard } from "../utils/virtualCards";
import { computeMonthlyRoster } from "../utils/queueSequence";
import VirtualTransitCard from "./common/VirtualTransitCard";
import VehicleVirtualCardModal from "./fleet/VehicleVirtualCardModal";

interface DriverDashboardProps {
  drivers: Driver[];
  vehicles: Vehicle[];
  routes: Route[];
  trips: Trip[];
  notifications: RankNotification[];
  payments: RankFeePayment[];
  onAddPayment: (pay: RankFeePayment) => void;
  onUpdateVehicleStatus: (regNum: string, status: KombiStatus) => void;
  onUpdateQueuePosition: (regNum: string, change: number) => void;
  onAddTrip: (trip: Omit<Trip, "id">) => void;
  onAddNotification: (notif: Omit<RankNotification, "id" | "timestamp">) => void;
  onAddIncident?: (inc: Omit<IncidentReport, "id" | "timestamp">) => void;
  onEditVehicle?: (updatedVeh: Vehicle) => void;
  onEditDriver?: (updatedDrv: Driver) => void;
  rankFee?: number;
  splitOperational?: number;
  splitNRTC?: number;
  splitMaintenance?: number;
}

export default function DriverDashboard({
  drivers,
  vehicles,
  routes,
  trips,
  notifications,
  payments,
  onAddPayment,
  onUpdateVehicleStatus,
  onUpdateQueuePosition,
  onAddTrip,
  onAddNotification,
  onEditVehicle,
  onEditDriver,
  rankFee = 25,
  splitOperational = 20,
  splitNRTC = 3.5,
  splitMaintenance = 1.5
}: DriverDashboardProps) {
  // Active driver simulation context
  const [selectedDriverId, setSelectedDriverId] = useState<string>(drivers[0]?.id || "");
  const [successMsg, setSuccessMsg] = useState("");
  const [cardSyncTick, setCardSyncTick] = useState(0);
  const [isVirtualCardModalOpen, setIsVirtualCardModalOpen] = useState(false);

  // Time & Queuing Roster Auto-Update engine (8:30 PM Rule)
  // Check if real current local time is past 8:30 PM (20:30)
  const isRealTimePast830 = useMemo(() => {
    const d = new Date();
    const hrs = d.getHours();
    const mins = d.getMinutes();
    return hrs > 20 || (hrs === 20 && mins >= 30);
  }, []);

  // State allows testing both before 8:30 PM and post 8:30 PM
  const [isAfter830PM, setIsAfter830PM] = useState<boolean>(isRealTimePast830);

  // Auto-check periodically every 30 seconds if real-world time crossed 8:30 PM
  useEffect(() => {
    const timer = setInterval(() => {
      const d = new Date();
      const hrs = d.getHours();
      const mins = d.getMinutes();
      const nowPast830 = hrs > 20 || (hrs === 20 && mins >= 30);
      setIsAfter830PM(nowPast830);
    }, 30000);
    return () => clearInterval(timer);
  }, []);

  // Sync virtual card storage events
  useEffect(() => {
    const handleCardsUpdated = () => setCardSyncTick((t) => t + 1);
    window.addEventListener("sisonkhe_virtual_cards_updated", handleCardsUpdated);
    window.addEventListener("storage", handleCardsUpdated);
    return () => {
      window.removeEventListener("sisonkhe_virtual_cards_updated", handleCardsUpdated);
      window.removeEventListener("storage", handleCardsUpdated);
    };
  }, []);

  const showTempMessage = (msg: string) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(""), 4500);
  };

  const activeDriver = drivers.find((d) => d.id === selectedDriverId) || drivers[0];
  const activeVehicle = vehicles.find((v) => v.registrationNumber === activeDriver?.assignedVehicleReg) || vehicles[0];
  const activeRoute = routes.find((r) => r.id === activeVehicle?.routeAssignmentId) || routes[0];

  // Linked Virtual Transit Card (Exact same model used in Fleet Manager)
  const activeVirtualCard = useMemo(() => {
    if (!activeVehicle) return null;
    return getOrCreateVehicleVirtualCard(activeVehicle, activeDriver);
  }, [activeVehicle, activeDriver, cardSyncTick]);

  // Compute 30-day circular queuing roster for the active vehicle's route
  const rosterPlan = useMemo(() => {
    if (!activeRoute) return null;
    const routeVehicles = vehicles.filter((v) => v.routeAssignmentId === activeRoute.id);
    return computeMonthlyRoster(routeVehicles, undefined, drivers, trips);
  }, [vehicles, activeRoute, drivers, trips]);

  // Current calendar day (e.g. Day 15)
  const todayCalendarDay = useMemo(() => {
    const d = new Date().getDate();
    return rosterPlan ? Math.min(d, rosterPlan.totalDays) : d;
  }, [rosterPlan]);

  // Target Roster Day:
  // Rule: After 8:30 PM every day, the queuing roster is automatically updated to tomorrow's sequence!
  const effectiveRosterDay = useMemo(() => {
    if (!rosterPlan) return 1;
    if (!isAfter830PM) {
      return todayCalendarDay;
    } else {
      // Advance to tomorrow's day in the month
      return todayCalendarDay >= rosterPlan.totalDays ? 1 : todayCalendarDay + 1;
    }
  }, [rosterPlan, todayCalendarDay, isAfter830PM]);

  // Find effective day entry in computed circular roster
  const effectiveDayEntry = useMemo(() => {
    if (!rosterPlan) return null;
    return rosterPlan.dailyRoster.find((d) => d.dayNumber === effectiveRosterDay) || rosterPlan.dailyRoster[0];
  }, [rosterPlan, effectiveRosterDay]);

  // Find driver's vehicle queue position on that specific day
  const driverQueueItem = useMemo(() => {
    if (!effectiveDayEntry || !activeVehicle) return null;
    return effectiveDayEntry.queueOrder.find(
      (item) => item.vehicleReg === activeVehicle.registrationNumber
    ) || null;
  }, [effectiveDayEntry, activeVehicle]);

  // Handle Pay Mandatory Rank Fee with 1-click debit from Virtual Card
  const handlePayRankFee = () => {
    if (!activeVehicle || !activeVirtualCard) return;

    if (activeVirtualCard.balanceSZL < rankFee) {
      alert(`Insufficient virtual card balance (E${activeVirtualCard.balanceSZL.toFixed(2)}). Please quick reload first.`);
      return;
    }

    const result = chargeVirtualCard(
      activeVehicle.registrationNumber,
      rankFee,
      "RANK_FEE",
      `Daily Terminal Rank Fee - Bay ${activeVehicle.loadingBay}`,
      activeDriver?.fullName || "Driver"
    );

    if (result.success) {
      const refId = result.receiptRef || ("VCRD-" + Math.floor(Math.random() * 90000 + 10000) + "-SZ");
      const newPay: RankFeePayment = {
        id: "pay_" + Date.now(),
        timestamp: new Date().toISOString(),
        vehicleReg: activeVehicle.registrationNumber,
        amountSZL: rankFee,
        paymentMethod: "Virtual Card",
        transactionRef: refId,
        status: "Success",
        allocationOperational: splitOperational,
        allocationNRTC: splitNRTC,
        allocationMaintenance: splitMaintenance
      };

      onAddPayment(newPay);
      setCardSyncTick((t) => t + 1);
      showTempMessage(`E${rankFee.toFixed(2)} Rank Fee debited successfully from Virtual Card! (Ref: ${refId})`);

      onAddNotification({
        type: "SMS",
        recipientName: activeDriver?.fullName || "Driver",
        recipientPhone: activeDriver?.phone || "",
        message: `Sisonkhe Virtual Card: E${rankFee.toFixed(2)} deducted for rank fee. Ref: ${refId}. Balance: E${(activeVirtualCard.balanceSZL - rankFee).toFixed(2)}.`,
        status: "Delivered"
      });
    }
  };

  // Quick reload card balance
  const handleQuickReload = (amount: number = 100) => {
    if (!activeVehicle) return;
    topUpVirtualCard(activeVehicle.registrationNumber, amount, `Quick Top-Up (+E${amount.toFixed(2)})`);
    setCardSyncTick((t) => t + 1);
    showTempMessage(`E${amount.toFixed(2)} loaded onto Virtual Transit Card!`);
  };

  // Cab status updates for rank marshals
  const handleStatusChange = (newStatus: KombiStatus) => {
    if (!activeVehicle) return;
    onUpdateVehicleStatus(activeVehicle.registrationNumber, newStatus);
    showTempMessage(`Cab status updated to: ${newStatus}`);

    if (newStatus === KombiStatus.Departed && activeRoute) {
      const passengerCount = activeVehicle.seatingCapacity || 15;
      const tripRevenue = passengerCount * activeRoute.baseFareE;
      onAddTrip({
        date: new Date().toISOString().split("T")[0],
        departureTime: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        routeId: activeRoute.id,
        vehicleReg: activeVehicle.registrationNumber,
        driverId: selectedDriverId,
        passengerCount,
        status: "InProgress",
        revenueSZL: tripRevenue
      });

      onAddNotification({
        type: "SMS",
        recipientName: activeDriver?.fullName || "Driver",
        recipientPhone: activeDriver?.phone || "",
        message: `Sisonkhe: ${activeVehicle.registrationNumber} departed for ${activeRoute.destination} with ${passengerCount} passengers. Safe journey!`,
        status: "Delivered"
      });
    }
  };

  return (
    <div id="driver-dashboard-root" className="space-y-6 pb-12">
      {/* DRIVER SWITCHER BAR (SIMULATION / MULTI-DRIVER PREVIEW) */}
      <div className="bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-3.5 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2 text-zinc-700 dark:text-zinc-300">
          <UserCheck className="w-4 h-4 text-amber-500" />
          <span className="font-bold uppercase tracking-wider text-[11px]">
            Driver Session (Switch Driver Context):
          </span>
        </div>

        <select
          value={selectedDriverId}
          onChange={(e) => setSelectedDriverId(e.target.value)}
          className="w-full sm:w-auto bg-white dark:bg-black border border-zinc-300 dark:border-zinc-700 rounded-xl px-3 py-1.5 font-bold text-zinc-900 dark:text-white cursor-pointer"
        >
          {drivers.map((drv) => {
            const veh = vehicles.find((v) => v.registrationNumber === drv.assignedVehicleReg);
            return (
              <option key={drv.id} value={drv.id}>
                {drv.fullName} • {drv.assignedVehicleReg} ({veh?.fleetNumber || veh?.vic || "VIC"})
              </option>
            );
          })}
        </select>
      </div>

      {/* SUCCESS BANNER */}
      {successMsg && (
        <div className="bg-emerald-600 text-white p-3.5 rounded-2xl text-xs flex items-center gap-2.5 shadow-md animate-in fade-in duration-200">
          <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
          <span className="font-medium">{successMsg}</span>
        </div>
      )}

      {/* MAIN DRIVER LAYOUT: STRICTLY 3 MANDATED SECTIONS */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* LEFT COLUMN: DRIVER PROFILE ACTIVE & QUEUE POSITION (ON THAT DAY) */}
        <div className="lg:col-span-6 space-y-6">

          {/* 1. DRIVER PROFILE ACTIVE */}
          <div 
            id="driver-profile-active-card"
            className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 sm:p-6 shadow-sm relative overflow-hidden"
          >
            {/* Header with Active badge */}
            <div className="flex items-start justify-between gap-3 pb-4 border-b border-zinc-150 dark:border-zinc-800">
              <div className="flex items-center gap-4">
                {/* Profile Picture with photo upload */}
                <div className="relative group flex-shrink-0">
                  <div className="w-16 h-16 rounded-2xl border-2 border-amber-500/40 overflow-hidden bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-3xl shadow-inner">
                    {activeDriver?.profilePictureUrl ? (
                      <img
                        src={activeDriver.profilePictureUrl}
                        alt={activeDriver.fullName}
                        className="w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <span>👨‍✈️</span>
                    )}
                  </div>

                  <label 
                    className="absolute -bottom-1 -right-1 bg-amber-500 hover:bg-amber-600 text-black p-1.5 rounded-full cursor-pointer shadow-md transition-all" 
                    title="Upload driver photo"
                  >
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        if (file.size > 1024 * 1024) {
                          alert("Error: Image file size must be less than 1 MB.");
                          return;
                        }
                        const reader = new FileReader();
                        reader.onload = (event) => {
                          const base64 = event.target?.result as string;
                          if (onEditDriver && activeDriver) {
                            onEditDriver({
                              ...activeDriver,
                              profilePictureUrl: base64
                            });
                            showTempMessage("Driver profile photo updated successfully!");
                          }
                        };
                        reader.readAsDataURL(file);
                      }}
                    />
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M4 5a2 2 0 00-2 2v8a2 2 0 002 2h12a2 2 0 002-2V7a2 2 0 00-2-2h-1.586l-1.293-1.293A1 1 0 0012.414 3H7.586a1 1 0 00-.707.293L5.586 5H4zm6 9a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
                    </svg>
                  </label>
                </div>

                <div>
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-800 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      Driver Profile Active
                    </span>
                  </div>
                  <h2 className="text-xl sm:text-2xl font-black text-zinc-900 dark:text-white mt-1">
                    {activeDriver?.fullName}
                  </h2>
                  <p className="text-xs text-zinc-500 font-mono">
                    ID: {activeDriver?.nationalId} • Lic: {activeDriver?.licenseNumber}
                  </p>
                </div>
              </div>

              {/* Status pill */}
              <div className="text-right">
                <span className="text-[10px] uppercase font-bold text-zinc-400 block font-mono">PDP Status</span>
                <span className="px-2 py-0.5 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 text-[10px] font-bold font-mono">
                  {activeDriver?.pdpStatus || "Valid"}
                </span>
              </div>
            </div>

            {/* Vehicle & Assignment details grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-4 text-xs font-mono">
              <div className="bg-zinc-50 dark:bg-zinc-800/50 p-2.5 rounded-xl border border-zinc-200/60 dark:border-zinc-800">
                <span className="text-[9px] uppercase tracking-wider text-zinc-400 block font-sans">Vehicle Plate</span>
                <strong className="text-zinc-900 dark:text-white font-bold text-sm">
                  {activeVehicle?.registrationNumber}
                </strong>
                <span className="text-[10px] text-amber-500 font-bold block">
                  VIC: {activeVehicle?.fleetNumber || activeVehicle?.vic || "MMZ-601"}
                </span>
              </div>

              <div className="bg-zinc-50 dark:bg-zinc-800/50 p-2.5 rounded-xl border border-zinc-200/60 dark:border-zinc-800">
                <span className="text-[9px] uppercase tracking-wider text-zinc-400 block font-sans">Route Assigned</span>
                <strong className="text-zinc-900 dark:text-white font-bold text-xs truncate block mt-0.5">
                  {activeRoute?.origin} → {activeRoute?.destination}
                </strong>
                <span className="text-[10px] text-zinc-500 block">
                  Fare: E{activeRoute?.baseFareE || 50}
                </span>
              </div>

              <div className="bg-zinc-50 dark:bg-zinc-800/50 p-2.5 rounded-xl border border-zinc-200/60 dark:border-zinc-800 col-span-2 sm:col-span-1">
                <span className="text-[9px] uppercase tracking-wider text-zinc-400 block font-sans">Loading Bay</span>
                <strong className="text-amber-500 font-bold text-sm mt-0.5 block">
                  {driverQueueItem?.loadingBay || activeVehicle?.loadingBay || "Bay 01"}
                </strong>
                <span className="text-[10px] text-zinc-500 block">
                  Cap: {activeVehicle?.seatingCapacity || 15} Pax
                </span>
              </div>
            </div>
          </div>

          {/* 3. QUEUE POSITION (ON THAT DAY) WITH 8:30 PM AUTO-UPDATE RULE */}
          <div 
            id="driver-queue-position-card"
            className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 sm:p-6 shadow-sm space-y-5"
          >
            {/* Header with 8:30 PM rule indicator */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-zinc-150 dark:border-zinc-800">
              <div>
                <div className="flex items-center gap-2">
                  <Clock className="w-5 h-5 text-blue-500" />
                  <h3 className="text-sm font-black uppercase tracking-tight text-zinc-900 dark:text-white font-space">
                    Queue Position (On That Day)
                  </h3>
                </div>
                <p className="text-xs text-zinc-500 mt-0.5">
                  Daily circular dispatch queue. Roster automatically updates after 8:30 PM daily.
                </p>
              </div>

              {/* Simulation switch to preview before/after 8:30 PM */}
              <button
                onClick={() => setIsAfter830PM((prev) => !prev)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer border ${
                  isAfter830PM
                    ? "bg-purple-50 dark:bg-purple-950/50 text-purple-700 dark:text-purple-300 border-purple-300 dark:border-purple-800"
                    : "bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 border-blue-300 dark:border-blue-800"
                }`}
                title="Toggle between regular daytime roster and post-8:30 PM auto-updated roster"
              >
                {isAfter830PM ? (
                  <>
                    <Moon className="w-3.5 h-3.5 text-purple-600" />
                    <span>Post-8:30 PM Live (Tomorrow)</span>
                  </>
                ) : (
                  <>
                    <Sun className="w-3.5 h-3.5 text-blue-600" />
                    <span>Pre-8:30 PM Live (Today)</span>
                  </>
                )}
              </button>
            </div>

            {/* Roster Day Status Banner */}
            <div className={`p-3.5 rounded-xl border flex items-center justify-between text-xs ${
              isAfter830PM 
                ? "bg-purple-500/10 border-purple-500/30 text-purple-900 dark:text-purple-200" 
                : "bg-blue-500/10 border-blue-500/30 text-blue-900 dark:text-blue-200"
            }`}>
              <div className="flex items-center gap-2">
                <span className="font-bold font-mono">
                  {effectiveDayEntry ? effectiveDayEntry.dateStr : `Day ${effectiveRosterDay}`}
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-full font-bold uppercase bg-white/70 dark:bg-black/40 border border-current">
                  {isAfter830PM ? "Auto-Rolled Over for Tomorrow" : "Today's Active Roster"}
                </span>
              </div>
              <span className="text-[10px] font-mono">
                {isAfter830PM ? "Updates after 20:30 ✓" : "Rolls over at 20:30"}
              </span>
            </div>

            {/* Highlighted Queue Position Display */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {/* Position */}
              <div className="bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200 dark:border-zinc-800 p-4 rounded-xl text-center">
                <span className="text-[10px] uppercase font-bold text-zinc-400 block font-sans">Queue Position</span>
                <div className="text-2xl sm:text-3xl font-black mt-1 text-blue-600 dark:text-blue-400 font-mono">
                  {driverQueueItem ? `#${driverQueueItem.position}` : `#${activeVehicle?.currentQueuePosition || 1}`}
                </div>
                <span className="text-[10px] font-bold text-zinc-500 mt-1 block">
                  {driverQueueItem?.position === 1 ? "Lead Kombi" : driverQueueItem?.position === 2 ? "Next in Line" : "In Line"}
                </span>
              </div>

              {/* Bay */}
              <div className="bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200 dark:border-zinc-800 p-4 rounded-xl text-center">
                <span className="text-[10px] uppercase font-bold text-zinc-400 block font-sans">Assigned Bay</span>
                <div className="text-lg sm:text-xl font-bold mt-1 text-amber-500 font-mono">
                  {driverQueueItem?.loadingBay || activeVehicle?.loadingBay || "Bay 01"}
                </div>
                <span className="text-[10px] text-zinc-400 mt-1 block font-mono">Priority Slot</span>
              </div>

              {/* Roster Rule Status */}
              <div className="bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200 dark:border-zinc-800 p-4 rounded-xl text-center col-span-2">
                <span className="text-[10px] uppercase font-bold text-zinc-400 block font-sans">30-Day Circular Rule</span>
                <div className="text-xs font-bold mt-1 text-zinc-800 dark:text-zinc-200 truncate">
                  {driverQueueItem?.rosterStatusLabel || "Standard 30-Day Rotation Sequence"}
                </div>
                <p className="text-[10px] text-zinc-500 mt-1 line-clamp-2">
                  {driverQueueItem?.metadataOriginExplanation || "Positions advance circularly each day at 8:30 PM."}
                </p>
              </div>
            </div>

            {/* Cab Operation Status Selector */}
            <div className="space-y-2 pt-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block">
                Update Cab Status at Rank
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <button
                  onClick={() => handleStatusChange(KombiStatus.Waiting)}
                  className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                    activeVehicle?.status === KombiStatus.Waiting
                      ? "bg-blue-500/15 border-blue-500 text-blue-600 dark:text-blue-400 shadow-xs"
                      : "bg-zinc-50 dark:bg-zinc-800/40 border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300"
                  }`}
                >
                  💤 Waiting
                </button>

                <button
                  onClick={() => handleStatusChange(KombiStatus.Loading)}
                  className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                    activeVehicle?.status === KombiStatus.Loading
                      ? "bg-emerald-500/15 border-emerald-500 text-emerald-600 dark:text-emerald-400 shadow-xs"
                      : "bg-zinc-50 dark:bg-zinc-800/40 border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300"
                  }`}
                >
                  🏁 Loading
                </button>

                <button
                  onClick={() => handleStatusChange(KombiStatus.Full)}
                  className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                    activeVehicle?.status === KombiStatus.Full
                      ? "bg-purple-500/15 border-purple-500 text-purple-600 dark:text-purple-400 shadow-xs"
                      : "bg-zinc-50 dark:bg-zinc-800/40 border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300"
                  }`}
                >
                  👥 Full Cabin
                </button>

                <button
                  onClick={() => handleStatusChange(KombiStatus.Departed)}
                  className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                    activeVehicle?.status === KombiStatus.Departed
                      ? "bg-amber-500/15 border-amber-500 text-amber-600 dark:text-amber-400 shadow-xs"
                      : "bg-zinc-50 dark:bg-zinc-800/40 border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300"
                  }`}
                >
                  🚀 Depart
                </button>
              </div>
            </div>

            {/* Departure Confirmation button if loaded or loading */}
            {(activeVehicle?.status === KombiStatus.Full || activeVehicle?.status === KombiStatus.Loading) && (
              <div className="p-3.5 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-300 dark:border-emerald-800 rounded-xl flex items-center justify-between gap-3">
                <div>
                  <span className="text-xs font-bold text-emerald-800 dark:text-emerald-300 block">
                    Cabin Ready for Departure
                  </span>
                  <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-mono">
                    Bay: {activeVehicle.loadingBay} • Capacity: {activeVehicle.seatingCapacity || 15} Pass.
                  </span>
                </div>
                <button
                  onClick={() => handleStatusChange(KombiStatus.Departed)}
                  className="py-2 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs transition-all cursor-pointer shadow-sm"
                >
                  Confirm Departure Now
                </button>
              </div>
            )}

            {/* Top queue positions preview table for that day */}
            {effectiveDayEntry && (
              <div className="pt-2 border-t border-zinc-150 dark:border-zinc-800">
                <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block mb-2">
                  Top Sequence for {effectiveDayEntry.dateStr}:
                </span>
                <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                  {effectiveDayEntry.queueOrder.slice(0, 5).map((q) => {
                    const isCurrent = q.vehicleReg === activeVehicle?.registrationNumber;
                    return (
                      <div
                        key={q.vehicleReg}
                        className={`flex items-center justify-between p-2 rounded-lg text-xs font-mono ${
                          isCurrent
                            ? "bg-amber-500/15 border border-amber-500/40 font-bold text-zinc-900 dark:text-white"
                            : "bg-zinc-50 dark:bg-zinc-800/30 text-zinc-600 dark:text-zinc-400"
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                            isCurrent ? "bg-amber-500 text-black" : "bg-zinc-200 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-300"
                          }`}>
                            {q.position}
                          </span>
                          <span>{q.vic || q.fleetNumber}</span>
                          <span className="text-[10px] text-zinc-400 font-sans truncate max-w-[100px]">
                            ({q.driverName})
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] text-amber-500">{q.loadingBay}</span>
                          {isCurrent && (
                            <span className="px-1.5 py-0.2 bg-amber-500 text-black text-[9px] font-bold rounded">
                              YOU
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

          </div>

        </div>

        {/* RIGHT COLUMN: 2. LINKED VEHICLE VIRTUAL CARD */}
        <div className="lg:col-span-6 space-y-6">

          <div 
            id="linked-vehicle-virtual-card-section"
            className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 sm:p-6 shadow-sm space-y-5"
          >
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-zinc-150 dark:border-zinc-800">
              <div className="flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-amber-500" />
                <div>
                  <h3 className="text-sm font-black uppercase tracking-tight text-zinc-900 dark:text-white font-space">
                    Linked Vehicle Virtual Card
                  </h3>
                  <p className="text-xs text-zinc-500 mt-0.5">
                    Commercial transit pass for rank fees, terminal clearance & concession payments.
                  </p>
                </div>
              </div>

              <span className="px-2.5 py-1 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-800 rounded-lg text-[10px] font-bold flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                <span>ACTIVE</span>
              </span>
            </div>

            {/* The Official Virtual Transit Card - Exactly matches image.png */}
            {activeVirtualCard && (
              <div className="flex justify-center w-full">
                <VirtualTransitCard
                  card={activeVirtualCard}
                  driver={activeDriver}
                  vehicle={activeVehicle}
                  onPayRankFee={handlePayRankFee}
                  onTopUp={handleQuickReload}
                  onOpenDetails={() => setIsVirtualCardModalOpen(true)}
                  rankFee={rankFee}
                  showActions={true}
                  className="w-full"
                />
              </div>
            )}

            {/* Quick Card Features & Concession Verification */}
            <div className="bg-zinc-50 dark:bg-zinc-800/40 p-3.5 rounded-xl border border-zinc-200 dark:border-zinc-800 text-xs font-mono space-y-1.5">
              <div className="flex justify-between items-center">
                <span className="text-zinc-500 font-sans">National Registration Fee:</span>
                <span className="font-bold text-emerald-600 dark:text-emerald-400">
                  PAID (E{activeVirtualCard?.registrationFeeAmount?.toFixed(2) || "250.00"})
                </span>
              </div>
              <div className="flex justify-between items-center text-[11px]">
                <span className="text-zinc-500 font-sans">Receipt Reference:</span>
                <span className="text-zinc-700 dark:text-zinc-300 font-mono">
                  {activeVirtualCard?.registrationReceiptRef || "REG-SZ-9042"}
                </span>
              </div>
              <div className="flex justify-between items-center text-[11px]">
                <span className="text-zinc-500 font-sans">Daily Rank Fee (SZL):</span>
                <span className="text-amber-500 font-bold font-mono">E{rankFee.toFixed(2)} / Day</span>
              </div>
            </div>

          </div>

        </div>

      </div>

      {/* Virtual Card Management Modal (Card Transactions & Top-Up) */}
      {isVirtualCardModalOpen && activeVehicle && (
        <VehicleVirtualCardModal
          vehicle={activeVehicle}
          driver={activeDriver}
          onClose={() => {
            setIsVirtualCardModalOpen(false);
            setCardSyncTick((t) => t + 1);
          }}
        />
      )}
    </div>
  );
}
