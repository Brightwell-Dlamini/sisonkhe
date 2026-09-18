/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from "react";
import { 
  FleetOperator, 
  OperatorMasterCard, 
  Vehicle, 
  Driver, 
  Route, 
  PermitRenewalRequest, 
  RankNotification,
  VehicleVirtualCard
} from "../types";
import { 
  getAllOperators, 
  getOrCreateOperatorMasterCard, 
  toggleFreezeOperatorMasterCard 
} from "../utils/operatorCards";
import { getOrCreateVehicleVirtualCard } from "../utils/virtualCards";
import OperatorMasterCardView from "./common/OperatorMasterCardView";
import VirtualTransitCard from "./common/VirtualTransitCard";
import SendMoneyToVehicleModal from "./operator/SendMoneyToVehicleModal";
import OperatorTopUpModal from "./operator/OperatorTopUpModal";
import OperatorPermitRenewalModal from "./operator/OperatorPermitRenewalModal";
import { 
  Building2, 
  CreditCard, 
  Send, 
  ArrowUpRight, 
  Award, 
  Truck, 
  Users, 
  FileText, 
  CheckCircle2, 
  AlertCircle, 
  Clock, 
  ShieldCheck, 
  Phone, 
  ChevronRight,
  RefreshCw,
  Search,
  Filter,
  DollarSign,
  Fuel,
  Zap,
  X
} from "lucide-react";

interface OperatorDashboardProps {
  vehicles: Vehicle[];
  drivers: Driver[];
  routes: Route[];
  onAddNotification?: (notif: Omit<RankNotification, "id" | "timestamp">) => void;
}

export default function OperatorDashboard({
  vehicles,
  drivers,
  routes,
  onAddNotification
}: OperatorDashboardProps) {
  // 1. Available Operators State
  const [operators, setOperators] = useState<FleetOperator[]>(() => getAllOperators());
  const [selectedOperatorId, setSelectedOperatorId] = useState<string>(() => operators[0]?.id || "op_cyril_kunene");

  // Active Operator
  const activeOperator = useMemo(() => {
    return operators.find((op) => op.id === selectedOperatorId) || operators[0];
  }, [operators, selectedOperatorId]);

  // Master Card state
  const [masterCard, setMasterCard] = useState<OperatorMasterCard>(() => {
    return getOrCreateOperatorMasterCard(activeOperator);
  });

  // Active Sub-tab in Operator Dashboard
  const [activeSubTab, setActiveSubTab] = useState<"vehicles" | "transactions" | "renewals">("vehicles");

  // Modals state
  const [isSendMoneyOpen, setIsSendMoneyOpen] = useState<boolean>(false);
  const [isTopUpOpen, setIsTopUpOpen] = useState<boolean>(false);
  const [isRenewalOpen, setIsRenewalOpen] = useState<boolean>(false);
  const [preSelectedVehicleReg, setPreSelectedVehicleReg] = useState<string | undefined>(undefined);
  const [inspectVehicleCard, setInspectVehicleCard] = useState<{ vehicle: Vehicle; card: VehicleVirtualCard; driver?: Driver } | null>(null);

  // Success Toast Banner
  const [toastMessage, setToastMessage] = useState<string>("");

  // Search and filter inside tabs
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [txFilter, setTxFilter] = useState<string>("ALL");

  // Permit renewal requests (loaded from shared localStorage key)
  const [renewalRequests, setRenewalRequests] = useState<PermitRenewalRequest[]>([]);

  // Function to refresh renewal requests from storage
  const loadRenewalRequests = () => {
    try {
      const raw = localStorage.getItem("kombiflow_permit_renewal_requests");
      if (raw) {
        setRenewalRequests(JSON.parse(raw));
      } else {
        setRenewalRequests([]);
      }
    } catch (e) {
      console.error("Error loading renewals in OperatorDashboard:", e);
    }
  };

  // Reload Master Card when active operator changes or on custom event
  const refreshMasterCard = () => {
    if (activeOperator) {
      const card = getOrCreateOperatorMasterCard(activeOperator);
      setMasterCard({ ...card });
    }
  };

  useEffect(() => {
    refreshMasterCard();
    loadRenewalRequests();
  }, [selectedOperatorId, activeOperator]);

  // Listen to window update events from transfers, top-ups, and renewals
  useEffect(() => {
    const handleOperatorUpdate = () => refreshMasterCard();
    const handleRenewalUpdate = () => loadRenewalRequests();

    window.addEventListener("sisonkhe_operator_cards_updated", handleOperatorUpdate);
    window.addEventListener("sisonkhe_permit_renewal_created", handleRenewalUpdate);

    return () => {
      window.removeEventListener("sisonkhe_operator_cards_updated", handleOperatorUpdate);
      window.removeEventListener("sisonkhe_permit_renewal_created", handleRenewalUpdate);
    };
  }, [activeOperator]);

  // Toast helper
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(""), 5000);
  };

  // Filter vehicles belonging to this operator
  const operatorVehicles = useMemo(() => {
    if (!activeOperator) return [];
    const opNameNorm = activeOperator.name.toLowerCase().trim();
    const matched = vehicles.filter((v) => {
      const owner = (v.ownerName || "").toLowerCase().trim();
      return owner.includes(opNameNorm) || opNameNorm.includes(owner);
    });

    // If specific match found, return them. Otherwise show Cyril Kunene's default vehicles if Cyril is selected
    if (matched.length > 0) return matched;
    if (activeOperator.id === "op_cyril_kunene") {
      return vehicles.filter((v) => v.registrationNumber === "HSD 101 BM" || v.registrationNumber === "HSD 202 BM");
    }
    // Fallback: if no vehicles specifically assigned, return the first 2 vehicles so user can test transfers!
    return vehicles.slice(0, 2);
  }, [vehicles, activeOperator]);

  // Filter renewals for this operator's vehicles
  const operatorRenewals = useMemo(() => {
    const regSet = new Set(operatorVehicles.map((v) => v.registrationNumber));
    return renewalRequests.filter((r) => 
      regSet.has(r.vehicleReg) || 
      (r.operator && r.operator.toLowerCase().includes(activeOperator.name.toLowerCase()))
    );
  }, [renewalRequests, operatorVehicles, activeOperator]);

  // Calculate combined fleet card balances
  const totalFleetCardBalances = useMemo(() => {
    return operatorVehicles.reduce((sum, v) => {
      const drv = drivers.find((d) => d.id === v.driverId || d.assignedVehicleReg === v.registrationNumber);
      const vCard = getOrCreateVehicleVirtualCard(v, drv);
      return sum + (vCard?.balanceSZL || 0);
    }, 0);
  }, [operatorVehicles, drivers]);

  // Filter master card transactions
  const filteredTransactions = useMemo(() => {
    if (!masterCard || !masterCard.transactions) return [];
    return masterCard.transactions.filter((tx) => {
      if (txFilter === "DISBURSEMENT" && tx.type !== "VEHICLE_DISBURSEMENT") return false;
      if (txFilter === "TOPUP" && tx.type !== "MASTER_TOP_UP") return false;
      if (txFilter === "RENEWAL" && tx.type !== "PERMIT_RENEWAL_FEE") return false;

      if (!searchQuery) return true;
      const q = searchQuery.toLowerCase();
      return (
        tx.description.toLowerCase().includes(q) ||
        (tx.targetVehicleReg && tx.targetVehicleReg.toLowerCase().includes(q)) ||
        (tx.receiptNumber && tx.receiptNumber.toLowerCase().includes(q)) ||
        (tx.category && tx.category.toLowerCase().includes(q))
      );
    });
  }, [masterCard, txFilter, searchQuery]);

  // Handle open send money modal with preselected vehicle
  const handleOpenSendMoney = (reg?: string) => {
    setPreSelectedVehicleReg(reg);
    setIsSendMoneyOpen(true);
  };

  // Handle open permit renewal with preselected vehicle
  const handleOpenRenewal = (reg?: string) => {
    setPreSelectedVehicleReg(reg);
    setIsRenewalOpen(true);
  };

  // Handle toggle freeze
  const handleToggleFreeze = () => {
    if (!activeOperator) return;
    const updated = toggleFreezeOperatorMasterCard(activeOperator.id);
    setMasterCard({ ...updated });
    showToast(updated.status === "Frozen" ? "Master Card frozen for security" : "Master Card unfreezed and active");
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-2 sm:px-4 py-4">
      {/* SUCCESS TOAST NOTIFICATION */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-zinc-950 text-white px-5 py-3.5 rounded-2xl shadow-2xl border border-amber-500/40 flex items-center gap-3 animate-in fade-in slide-in-from-bottom-5 duration-200">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
          <span className="text-xs font-bold font-sans">{toastMessage}</span>
          <button 
            onClick={() => setToastMessage("")} 
            className="text-zinc-400 hover:text-white ml-2 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* TOP HEADER: OPERATOR IDENTITY & SWITCHER */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-5 sm:p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-500 to-amber-600 text-black flex items-center justify-center font-extrabold shadow-md flex-shrink-0">
            <Building2 className="w-6 h-6 text-black" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-black text-zinc-900 dark:text-white font-space">
                Vehicle Owner / Operator
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/30">
                Enterprise Fleet
              </span>
            </div>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
              Manage your commercial kombi fleet, disburse funds via your Master Card, and submit official permit renewals.
            </p>
          </div>
        </div>

        {/* Operator Profile Selector */}
        <div className="flex items-center gap-2 bg-zinc-50 dark:bg-zinc-800/60 p-2 rounded-2xl border border-zinc-200 dark:border-zinc-700">
          <span className="text-[10px] uppercase font-bold text-zinc-400 font-mono pl-2">
            Owner Profile:
          </span>
          <select
            value={selectedOperatorId}
            onChange={(e) => setSelectedOperatorId(e.target.value)}
            className="bg-white dark:bg-black border border-zinc-300 dark:border-zinc-700 rounded-xl px-3 py-2 text-xs font-bold text-zinc-900 dark:text-white cursor-pointer focus:ring-2 focus:ring-amber-500 font-sans"
          >
            {operators.map((op) => (
              <option key={op.id} value={op.id}>
                {op.name} — {op.companyName}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* OPERATOR DETAILS BAR */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-4 text-xs font-mono">
        <div>
          <span className="text-[10px] text-zinc-400 uppercase tracking-wider block font-sans">
            Company / Concession
          </span>
          <strong className="text-zinc-900 dark:text-white font-bold truncate block">
            {activeOperator.companyName}
          </strong>
        </div>
        <div>
          <span className="text-[10px] text-zinc-400 uppercase tracking-wider block font-sans">
            Operator License
          </span>
          <span className="text-amber-600 dark:text-amber-400 font-bold block">
            {activeOperator.operatorLicenseNumber || "OP-HHO-2024-0012"}
          </span>
        </div>
        <div>
          <span className="text-[10px] text-zinc-400 uppercase tracking-wider block font-sans">
            Association
          </span>
          <span className="text-zinc-800 dark:text-zinc-200 truncate block">
            {activeOperator.association}
          </span>
        </div>
        <div>
          <span className="text-[10px] text-zinc-400 uppercase tracking-wider block font-sans">
            Contact Phone & Tax ID
          </span>
          <span className="text-zinc-700 dark:text-zinc-300 block truncate">
            {activeOperator.phone} &bull; {activeOperator.taxNumber}
          </span>
        </div>
      </div>

      {/* SECTION 1: MASTER CARD DISPLAY & QUICK METRICS */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Col (5 cols): The Official Master Card */}
        <div className="lg:col-span-6 xl:col-span-5 flex flex-col items-center bg-white dark:bg-zinc-900 p-5 sm:p-6 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
          <div className="w-full flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-amber-500" />
              <h2 className="text-sm font-extrabold text-zinc-900 dark:text-white font-space uppercase tracking-wider">
                Operator Master Card
              </h2>
            </div>
            <span className="text-[10px] font-mono text-zinc-400">
              ID: {masterCard.id}
            </span>
          </div>

          {/* MASTER TRANSIT CARD VISUAL */}
          <OperatorMasterCardView
            card={masterCard}
            operator={activeOperator}
            onTopUp={() => setIsTopUpOpen(true)}
            onSendMoney={() => handleOpenSendMoney()}
            onToggleFreeze={handleToggleFreeze}
            showActions={true}
          />
        </div>

        {/* Right Col (6-7 cols): Overview Metrics & Quick Actions */}
        <div className="lg:col-span-6 xl:col-span-7 space-y-4">
          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3.5">
            <div className="bg-white dark:bg-zinc-900 p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-xs">
              <div className="flex items-center justify-between text-zinc-400 mb-1">
                <span className="text-[10px] uppercase font-bold font-sans">Fleet Size</span>
                <Truck className="w-4 h-4 text-amber-500" />
              </div>
              <div className="text-2xl font-black text-zinc-900 dark:text-white font-space">
                {operatorVehicles.length}
              </div>
              <span className="text-[10px] text-zinc-500 font-sans">
                Active commercial kombis
              </span>
            </div>

            <div className="bg-white dark:bg-zinc-900 p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-xs">
              <div className="flex items-center justify-between text-zinc-400 mb-1">
                <span className="text-[10px] uppercase font-bold font-sans">Master Account</span>
                <DollarSign className="w-4 h-4 text-emerald-500" />
              </div>
              <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 font-mono">
                E {masterCard.balanceSZL.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
              </div>
              <span className="text-[10px] text-zinc-500 font-sans">
                Available to disburse
              </span>
            </div>

            <div className="bg-white dark:bg-zinc-900 p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-xs col-span-2 sm:col-span-1">
              <div className="flex items-center justify-between text-zinc-400 mb-1">
                <span className="text-[10px] uppercase font-bold font-sans">Fleet Balances</span>
                <CreditCard className="w-4 h-4 text-blue-500" />
              </div>
              <div className="text-2xl font-black text-blue-600 dark:text-blue-400 font-mono">
                E {totalFleetCardBalances.toFixed(2)}
              </div>
              <span className="text-[10px] text-zinc-500 font-sans">
                Across all vehicle cards
              </span>
            </div>
          </div>

          {/* Quick Action Cards Banner */}
          <div className="bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent dark:from-amber-950/20 dark:via-zinc-900 p-5 rounded-3xl border border-amber-500/20 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-extrabold text-zinc-900 dark:text-white text-sm font-space">
                  Fleet Financial & Concession Controls
                </h3>
                <p className="text-xs text-zinc-500">
                  Instant real-time disbursements and NRTC licensing actions
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <button
                onClick={() => handleOpenSendMoney()}
                className="p-3 bg-amber-500 hover:bg-amber-600 text-black font-extrabold rounded-2xl text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-sm"
              >
                <Send className="w-4 h-4 text-black" />
                <span>Send Money to Vehicle</span>
              </button>

              <button
                onClick={() => setIsTopUpOpen(true)}
                className="p-3 bg-zinc-900 hover:bg-black text-white dark:bg-zinc-800 dark:hover:bg-zinc-700 font-bold rounded-2xl text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-sm border border-zinc-700"
              >
                <ArrowUpRight className="w-4 h-4 text-emerald-400" />
                <span>Top Up Master Account</span>
              </button>

              <button
                onClick={() => handleOpenRenewal()}
                className="p-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-2xl text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-sm"
              >
                <Award className="w-4 h-4 text-white" />
                <span>Request Permit Renewal</span>
              </button>
            </div>
          </div>

          {/* Recent Activity summary */}
          <div className="bg-white dark:bg-zinc-900 p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-xs">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-500 font-sans">
                Latest Master Card Allocation
              </span>
              <button
                onClick={() => setActiveSubTab("transactions")}
                className="text-xs text-amber-600 dark:text-amber-400 hover:underline font-bold flex items-center gap-1 cursor-pointer"
              >
                <span>View Full Statement</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {masterCard.transactions && masterCard.transactions.length > 0 ? (
              <div className="flex items-center justify-between p-2.5 bg-zinc-50 dark:bg-zinc-800/40 rounded-xl text-xs">
                <div className="flex items-center gap-2.5">
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${
                    masterCard.transactions[0].direction === "DEBIT"
                      ? "bg-amber-500/10 text-amber-600"
                      : "bg-emerald-500/10 text-emerald-600"
                  }`}>
                    {masterCard.transactions[0].direction === "DEBIT" ? <Send className="w-4 h-4" /> : <ArrowUpRight className="w-4 h-4" />}
                  </div>
                  <div>
                    <strong className="text-zinc-900 dark:text-white font-bold block">
                      {masterCard.transactions[0].description}
                    </strong>
                    <span className="text-[10px] text-zinc-400 font-mono">
                      Ref: {masterCard.transactions[0].receiptNumber} &bull; {new Date(masterCard.transactions[0].timestamp).toLocaleDateString()}
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <span className={`font-black font-mono text-sm ${
                    masterCard.transactions[0].direction === "DEBIT"
                      ? "text-zinc-900 dark:text-white"
                      : "text-emerald-600 dark:text-emerald-400"
                  }`}>
                    {masterCard.transactions[0].direction === "DEBIT" ? "-" : "+"}E {masterCard.transactions[0].amountSZL.toFixed(2)}
                  </span>
                </div>
              </div>
            ) : (
              <p className="text-xs text-zinc-400 py-1 font-sans">No transactions recorded yet.</p>
            )}
          </div>
        </div>
      </div>

      {/* SECTION 2: NAVIGATION TABS */}
      <div className="border-b border-zinc-200 dark:border-zinc-800 flex items-center gap-4 pt-4">
        <button
          onClick={() => setActiveSubTab("vehicles")}
          className={`pb-3 text-xs sm:text-sm font-bold flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
            activeSubTab === "vehicles"
              ? "border-amber-500 text-amber-600 dark:text-amber-400 font-extrabold"
              : "border-transparent text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200"
          }`}
        >
          <Truck className="w-4 h-4" />
          <span>My Fleet Kombis ({operatorVehicles.length})</span>
        </button>

        <button
          onClick={() => setActiveSubTab("transactions")}
          className={`pb-3 text-xs sm:text-sm font-bold flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
            activeSubTab === "transactions"
              ? "border-amber-500 text-amber-600 dark:text-amber-400 font-extrabold"
              : "border-transparent text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200"
          }`}
        >
          <CreditCard className="w-4 h-4" />
          <span>Master Card Statement</span>
        </button>

        <button
          onClick={() => setActiveSubTab("renewals")}
          className={`pb-3 text-xs sm:text-sm font-bold flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
            activeSubTab === "renewals"
              ? "border-amber-500 text-amber-600 dark:text-amber-400 font-extrabold"
              : "border-transparent text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200"
          }`}
        >
          <Award className="w-4 h-4" />
          <span>Permit Renewal Requests ({operatorRenewals.length})</span>
        </button>
      </div>

      {/* SUB-TAB 1: MY FLEET VEHICLES */}
      {activeSubTab === "vehicles" && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="font-extrabold text-zinc-900 dark:text-white text-base font-space">
                Kombi Fleet Directory & Virtual Cards
              </h3>
              <p className="text-xs text-zinc-500">
                View live card balances, queue status, and instantly send money to each kombi
              </p>
            </div>

            <button
              onClick={() => handleOpenSendMoney()}
              className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-black font-extrabold text-xs rounded-xl flex items-center gap-1.5 transition-all cursor-pointer shadow-xs self-start sm:self-auto"
            >
              <Send className="w-4 h-4" />
              <span>Send Money to Any Kombi</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {operatorVehicles.map((v) => {
              const driver = drivers.find((d) => d.id === v.driverId || d.assignedVehicleReg === v.registrationNumber);
              const vCard = getOrCreateVehicleVirtualCard(v, driver);
              const routeObj = routes.find((r) => r.id === v.routeAssignmentId);

              return (
                <div
                  key={v.registrationNumber}
                  className="bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800 p-5 shadow-sm hover:shadow-md transition-all space-y-4 flex flex-col justify-between"
                >
                  {/* Top Row: Reg, Fleet VIC, and Loading Bay */}
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-black text-lg font-mono text-zinc-900 dark:text-white select-text">
                          {v.registrationNumber}
                        </span>
                        <span className="px-2 py-0.5 rounded-md bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 font-mono font-bold text-[10px]">
                          {v.fleetNumber || v.vic || "KF-01"}
                        </span>
                      </div>
                      <p className="text-xs text-zinc-500">
                        {v.make} {v.model} &bull; {v.seatingCapacity} Seater
                      </p>
                    </div>

                    <div className="text-right">
                      <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 border border-blue-200 dark:border-blue-800 font-mono">
                        {v.loadingBay}
                      </span>
                    </div>
                  </div>

                  {/* Route & Driver details */}
                  <div className="bg-zinc-50 dark:bg-zinc-800/40 rounded-2xl p-3 border border-zinc-150 dark:border-zinc-800/80 space-y-2 text-xs">
                    <div className="flex justify-between items-center">
                      <span className="text-zinc-400 font-sans text-[10px] uppercase font-bold">Route:</span>
                      <span className="font-bold text-zinc-800 dark:text-zinc-200">
                        {routeObj ? `${routeObj.origin} ➔ ${routeObj.destination}` : "Mbabane ➔ Manzini Corridor"}
                      </span>
                    </div>

                    <div className="flex justify-between items-center">
                      <span className="text-zinc-400 font-sans text-[10px] uppercase font-bold">Driver:</span>
                      <span className="font-bold text-zinc-800 dark:text-zinc-200">
                        {driver?.fullName || "Unassigned"} ({driver?.phone || "+268 7600 0000"})
                      </span>
                    </div>

                    <div className="flex justify-between items-center">
                      <span className="text-zinc-400 font-sans text-[10px] uppercase font-bold">Road Permit:</span>
                      <span className="font-mono text-zinc-700 dark:text-zinc-300 text-[11px]">
                        {v.permitNumber || "PRM-SZ-8910"} (Exp: {v.permitExpiryDate || v.insuranceExpiry || "2026-10"})
                      </span>
                    </div>
                  </div>

                  {/* VIRTUAL CARD STATUS & LIVE BALANCE BANNER */}
                  <div className="p-3.5 bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent dark:from-amber-950/30 rounded-2xl border border-amber-500/20 flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center flex-shrink-0">
                        <CreditCard className="w-4 h-4" />
                      </div>
                      <div>
                        <span className="text-[10px] uppercase font-bold text-zinc-500 block font-sans">
                          Vehicle Virtual Card
                        </span>
                        <span className="font-mono text-xs font-bold text-zinc-800 dark:text-zinc-200">
                          {vCard.cardNumber}
                        </span>
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="text-[10px] text-zinc-400 font-sans block uppercase font-bold">
                        Card Balance
                      </span>
                      <span className="text-base font-black font-mono text-emerald-600 dark:text-emerald-400">
                        E {vCard.balanceSZL.toFixed(2)}
                      </span>
                    </div>
                  </div>

                  {/* ACTIONS FOR THIS VEHICLE */}
                  <div className="grid grid-cols-3 gap-2 pt-1">
                    <button
                      onClick={() => handleOpenSendMoney(v.registrationNumber)}
                      className="py-2 px-2 bg-amber-500 hover:bg-amber-600 text-black font-bold rounded-xl text-xs flex items-center justify-center gap-1 cursor-pointer shadow-2xs"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>Send Money</span>
                    </button>

                    <button
                      onClick={() => handleOpenRenewal(v.registrationNumber)}
                      className="py-2 px-2 bg-blue-50 hover:bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 border border-blue-200 dark:border-blue-800 font-bold rounded-xl text-xs flex items-center justify-center gap-1 cursor-pointer"
                    >
                      <Award className="w-3.5 h-3.5" />
                      <span>Renew Permit</span>
                    </button>

                    <button
                      onClick={() => setInspectVehicleCard({ vehicle: v, card: vCard, driver })}
                      className="py-2 px-2 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-200 font-bold rounded-xl text-xs flex items-center justify-center gap-1 cursor-pointer"
                    >
                      <CreditCard className="w-3.5 h-3.5" />
                      <span>View Card</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* SUB-TAB 2: MASTER CARD STATEMENT */}
      {activeSubTab === "transactions" && (
        <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800 p-5 sm:p-6 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="font-extrabold text-zinc-900 dark:text-white text-base font-space">
                Master Card Audit & Statement
              </h3>
              <p className="text-xs text-zinc-500">
                Complete record of allocations to fleet vehicles, master reloads, and official permit fees
              </p>
            </div>

            {/* Transaction Category Filter */}
            <div className="flex items-center gap-2">
              {["ALL", "DISBURSEMENT", "TOPUP", "RENEWAL"].map((filterKey) => (
                <button
                  key={filterKey}
                  onClick={() => setTxFilter(filterKey)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    txFilter === filterKey
                      ? "bg-amber-500 text-black shadow-xs font-black"
                      : "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200"
                  }`}
                >
                  {filterKey}
                </button>
              ))}
            </div>
          </div>

          {/* Search bar */}
          <div className="relative">
            <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by vehicle reg, receipt ref, or category..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs text-zinc-900 dark:text-white"
            />
          </div>

          {/* Transactions List */}
          <div className="space-y-2">
            {filteredTransactions.length === 0 ? (
              <div className="p-8 text-center text-zinc-400 text-xs font-sans">
                No matching transactions found.
              </div>
            ) : (
              filteredTransactions.map((tx) => (
                <div
                  key={tx.id}
                  className="p-3.5 bg-zinc-50 dark:bg-zinc-800/40 rounded-2xl border border-zinc-150 dark:border-zinc-800/80 flex items-center justify-between gap-3 text-xs"
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${
                      tx.type === "MASTER_TOP_UP"
                        ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                        : tx.type === "PERMIT_RENEWAL_FEE"
                        ? "bg-blue-500/15 text-blue-600 dark:text-blue-400"
                        : "bg-amber-500/15 text-amber-600 dark:text-amber-400"
                    }`}>
                      {tx.type === "MASTER_TOP_UP" ? (
                        <ArrowUpRight className="w-4 h-4" />
                      ) : tx.type === "PERMIT_RENEWAL_FEE" ? (
                        <Award className="w-4 h-4" />
                      ) : (
                        <Send className="w-4 h-4" />
                      )}
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <strong className="font-extrabold text-zinc-900 dark:text-white font-space">
                          {tx.description}
                        </strong>
                        {tx.category && (
                          <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-zinc-200 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-300">
                            {tx.category}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-[10px] text-zinc-400 font-mono mt-0.5">
                        <span>{new Date(tx.timestamp).toLocaleString()}</span>
                        <span>&bull;</span>
                        <span>Ref: {tx.receiptNumber}</span>
                        {tx.targetVehicleReg && (
                          <>
                            <span>&bull;</span>
                            <span className="font-bold text-zinc-700 dark:text-zinc-300">Vehicle: {tx.targetVehicleReg}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="text-right flex-shrink-0">
                    <div className={`text-sm font-black font-mono ${
                      tx.direction === "DEBIT"
                        ? "text-zinc-900 dark:text-white"
                        : "text-emerald-600 dark:text-emerald-400"
                    }`}>
                      {tx.direction === "DEBIT" ? "-" : "+"}E {tx.amountSZL.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                    <span className="text-[9px] text-emerald-600 font-bold uppercase font-sans">
                      {tx.status}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* SUB-TAB 3: PERMIT RENEWAL REQUESTS */}
      {activeSubTab === "renewals" && (
        <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800 p-5 sm:p-6 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="font-extrabold text-zinc-900 dark:text-white text-base font-space">
                Permit Renewal Applications
              </h3>
              <p className="text-xs text-zinc-500">
                Track statutory road passenger transport service permit renewals submitted for your fleet
              </p>
            </div>

            <button
              onClick={() => handleOpenRenewal()}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs rounded-xl flex items-center gap-1.5 transition-all cursor-pointer shadow-xs self-start sm:self-auto"
            >
              <Award className="w-4 h-4" />
              <span>Submit New Permit Renewal</span>
            </button>
          </div>

          {operatorRenewals.length === 0 ? (
            <div className="p-10 text-center rounded-2xl border border-dashed border-zinc-200 dark:border-zinc-800 space-y-3">
              <Award className="w-8 h-8 text-zinc-400 mx-auto" />
              <p className="text-xs text-zinc-500 font-sans">
                No active permit renewal requests found for your fleet.
              </p>
              <button
                onClick={() => handleOpenRenewal()}
                className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-black font-extrabold text-xs rounded-xl cursor-pointer"
              >
                Request Permit Renewal Now
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {operatorRenewals.map((req) => (
                <div
                  key={req.id}
                  className="p-4 bg-zinc-50 dark:bg-zinc-800/40 rounded-2xl border border-zinc-150 dark:border-zinc-800/80 space-y-3"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-zinc-200 dark:border-zinc-700/60 pb-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-black text-sm font-mono text-zinc-900 dark:text-white">
                          {req.vehicleReg}
                        </span>
                        <span className="text-xs text-zinc-400 font-mono">
                          ({req.id})
                        </span>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          req.status === "Approved"
                            ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300"
                            : req.status === "Rejected"
                            ? "bg-rose-100 text-rose-800 dark:bg-rose-950/50 dark:text-rose-300"
                            : "bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300 animate-pulse"
                        }`}>
                          {req.status}
                        </span>
                      </div>
                      <span className="text-[11px] text-zinc-500 font-sans">
                        Reason: {req.reasonForRenewal}
                      </span>
                    </div>

                    <div className="text-left sm:text-right text-xs font-mono">
                      <span className="text-[10px] text-zinc-400 block font-sans">Date Submitted</span>
                      <span className="text-zinc-800 dark:text-zinc-200 font-bold">{req.requestDate}</span>
                    </div>
                  </div>

                  {/* Fee Payment & Admin Feedback Details */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div className="p-2.5 bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 space-y-1">
                      <span className="text-[10px] font-bold uppercase text-zinc-400 block font-sans">
                        Payment Status
                      </span>
                      {req.paidWithMasterCard ? (
                        <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-bold font-mono">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Paid with Master Card (Ref: {req.masterPaymentRef || "REN-PAY"})</span>
                        </div>
                      ) : (
                        <span className="text-zinc-500 font-sans">Payment pending licensing inspection</span>
                      )}
                      {req.renewalFeeAmountSZL && (
                        <div className="text-[10px] text-zinc-400 font-mono">
                          Prescribed Fee: E{req.renewalFeeAmountSZL.toFixed(2)}
                        </div>
                      )}
                    </div>

                    <div className="p-2.5 bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 space-y-1">
                      <span className="text-[10px] font-bold uppercase text-zinc-400 block font-sans">
                        Admin Decision & Permit #
                      </span>
                      {req.newPermitNumber ? (
                        <div className="text-emerald-600 font-bold font-mono text-xs">
                          New Permit: {req.newPermitNumber} (Exp: {req.permitExpiryDate})
                        </div>
                      ) : (
                        <span className="text-zinc-500 font-sans">
                          Under review by NRTC Licensing Officer
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* MODAL 1: SEND MONEY TO VEHICLE */}
      {isSendMoneyOpen && (
        <SendMoneyToVehicleModal
          operator={activeOperator}
          masterCard={masterCard}
          vehicles={operatorVehicles}
          drivers={drivers}
          selectedVehicleReg={preSelectedVehicleReg}
          onClose={() => setIsSendMoneyOpen(false)}
          onSuccess={(msg) => {
            showToast(msg);
            refreshMasterCard();
          }}
          onAddNotification={onAddNotification}
        />
      )}

      {/* MODAL 2: TOP UP MASTER CARD */}
      {isTopUpOpen && (
        <OperatorTopUpModal
          operator={activeOperator}
          masterCard={masterCard}
          onClose={() => setIsTopUpOpen(false)}
          onSuccess={(msg) => {
            showToast(msg);
            refreshMasterCard();
          }}
        />
      )}

      {/* MODAL 3: PERMIT RENEWAL REQUEST */}
      {isRenewalOpen && (
        <OperatorPermitRenewalModal
          operator={activeOperator}
          masterCard={masterCard}
          vehicles={operatorVehicles}
          drivers={drivers}
          selectedVehicleReg={preSelectedVehicleReg}
          onClose={() => setIsRenewalOpen(false)}
          onSuccess={(msg) => {
            showToast(msg);
            refreshMasterCard();
            loadRenewalRequests();
          }}
          onAddNotification={onAddNotification}
        />
      )}

      {/* MODAL 4: INSPECT SPECIFIC VEHICLE TRANSIT CARD */}
      {inspectVehicleCard && (
        <div 
          className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setInspectVehicleCard(null)}
        >
          <div 
            className="bg-white dark:bg-zinc-900 rounded-3xl p-6 max-w-xl w-full border border-zinc-200 dark:border-zinc-800 shadow-2xl space-y-4 animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-2 border-b border-zinc-150 dark:border-zinc-800">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                  Vehicle Commercial Pass
                </span>
                <h3 className="font-extrabold text-zinc-900 dark:text-white text-base">
                  {inspectVehicleCard.vehicle.registrationNumber} ({inspectVehicleCard.vehicle.fleetNumber || inspectVehicleCard.vehicle.vic})
                </h3>
              </div>
              <button
                onClick={() => setInspectVehicleCard(null)}
                className="p-1.5 text-zinc-400 hover:text-zinc-600 rounded-xl"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex justify-center py-2">
              <VirtualTransitCard
                card={inspectVehicleCard.card}
                driver={inspectVehicleCard.driver}
                vehicle={inspectVehicleCard.vehicle}
                showActions={false}
              />
            </div>

            <div className="bg-zinc-50 dark:bg-zinc-800/40 p-3 rounded-2xl border border-zinc-200 dark:border-zinc-800 text-xs font-mono flex items-center justify-between">
              <div>
                <span className="text-zinc-400 font-sans block text-[10px]">Driver Assigned</span>
                <strong className="text-zinc-900 dark:text-white font-bold">{inspectVehicleCard.driver?.fullName || "Unassigned"}</strong>
              </div>
              <button
                onClick={() => {
                  const reg = inspectVehicleCard.vehicle.registrationNumber;
                  setInspectVehicleCard(null);
                  handleOpenSendMoney(reg);
                }}
                className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-black font-bold rounded-xl text-xs cursor-pointer"
              >
                Send Money
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
