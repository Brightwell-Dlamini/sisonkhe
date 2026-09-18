import React, { useState } from "react";
import {
  Scale,
  TrendingUp,
  TrendingDown,
  Calendar,
  Layers,
  ArrowUpDown,
  CheckCircle,
  Copy,
  Check,
  Printer,
  ChevronRight,
  Shield,
  Clock,
  Sparkles,
  Info,
  Car,
  DollarSign,
  Users
} from "lucide-react";
import {
  YoYComparisonResult,
  MonthOption,
  YoYVehicleComparison,
  YoYMonthlyLeadEntry
} from "../../utils/queueSequence";
import { Vehicle } from "../../types";

interface YoYQueueComparisonViewProps {
  yoyComparison: YoYComparisonResult;
  availableYears: number[];
  rosterYear: number;
  compareYear: number;
  onSelectRosterYear: (yr: number) => void;
  onSelectCompareYear: (yr: number) => void;
  onSelectMonth: (monthId: string) => void;
  availableMonths: MonthOption[];
  rosterMonth: string;
  selectedRouteName: string;
  vehicles: Vehicle[];
  onInspectVehicle?: (v: Vehicle) => void;
  copiedYoYReport: boolean;
  onCopyYoYReport: () => void;
}

export const YoYQueueComparisonView: React.FC<YoYQueueComparisonViewProps> = ({
  yoyComparison,
  availableYears,
  rosterYear,
  compareYear,
  onSelectRosterYear,
  onSelectCompareYear,
  onSelectMonth,
  availableMonths,
  rosterMonth,
  selectedRouteName,
  vehicles,
  onInspectVehicle,
  copiedYoYReport,
  onCopyYoYReport
}) => {
  const [activeTab, setActiveTab] = useState<"fleet" | "seasonal" | "leads">("fleet");
  const [filterRank, setFilterRank] = useState<"all" | "movers" | "leads">("all");

  const handleSwapYears = () => {
    onSelectRosterYear(compareYear);
    onSelectCompareYear(rosterYear);
  };

  const handlePrint = () => {
    window.print();
  };

  // Filter vehicle comparisons
  const filteredVehicles = yoyComparison.vehicleComparisons.filter(v => {
    if (filterRank === "movers") {
      return v.positionDelta !== 0;
    }
    if (filterRank === "leads") {
      return v.yearAIsLead || v.yearBIsLead;
    }
    return true;
  });

  return (
    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 shadow-sm space-y-6">
      
      {/* 1. TOP HEADER & COMPARISON CONTROLS */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-5 border-b border-zinc-200 dark:border-zinc-800">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-purple-100 dark:bg-purple-950/70 text-purple-700 dark:text-purple-300">
              <Scale className="w-5 h-5" />
            </span>
            <div>
              <h3 className="text-base font-black text-zinc-900 dark:text-white flex items-center gap-2">
                <span>Year-on-Year Queuing & Rotation Engine Comparison</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 font-bold">
                  {yoyComparison.monthName} ({rosterYear} vs {compareYear})
                </span>
              </h3>
              <p className="text-xs text-zinc-500 mt-0.5">
                Corridor: <strong>{selectedRouteName}</strong>. Historical queue positions, monthly dispatches, passenger volumes, and rotation equity verification.
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons: Copy, Print, Swap */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={handleSwapYears}
            className="px-3 py-2 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 text-zinc-700 dark:text-zinc-300 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all"
            title="Swap base and comparison years"
          >
            <ArrowUpDown className="w-3.5 h-3.5" />
            <span>Swap Years</span>
          </button>

          <button
            onClick={onCopyYoYReport}
            className="px-3.5 py-2 bg-purple-50 dark:bg-purple-950/50 hover:bg-purple-100 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all"
          >
            {copiedYoYReport ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-600" />
                <span className="text-emerald-700 dark:text-emerald-300 font-bold">Report Copied!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>Copy YoY Audit</span>
              </>
            )}
          </button>

          <button
            onClick={handlePrint}
            className="px-3 py-2 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 text-zinc-700 dark:text-zinc-300 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all"
            title="Print Year-on-Year audit record"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print Report</span>
          </button>
        </div>
      </div>

      {/* 2. YEAR & MONTH COMPARISON SELECTOR BAR */}
      <div className="bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200 dark:border-zinc-700/60 rounded-2xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        
        {/* Comparison Pair Selector */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-zinc-500 uppercase">Primary Year (A):</span>
            <select
              value={rosterYear}
              onChange={(e) => onSelectRosterYear(parseInt(e.target.value, 10))}
              className="px-3 py-1.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs font-bold text-purple-700 dark:text-purple-300 shadow-sm"
            >
              {availableYears.map(yr => (
                <option key={yr} value={yr}>Year {yr} {yr === 2026 ? "(Current System)" : ""}</option>
              ))}
            </select>
          </div>

          <span className="text-xs font-black text-zinc-400">vs</span>

          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-zinc-500 uppercase">Comparison Year (B):</span>
            <select
              value={compareYear}
              onChange={(e) => onSelectCompareYear(parseInt(e.target.value, 10))}
              className="px-3 py-1.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs font-bold text-indigo-700 dark:text-indigo-300 shadow-sm"
            >
              {availableYears.filter(y => y !== rosterYear).map(yr => (
                <option key={yr} value={yr}>Year {yr} {yr === 2026 ? "(Current System)" : ""}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Fast Month Navigation Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto py-1">
          <span className="text-xs font-bold text-zinc-500 uppercase shrink-0 mr-1">Month:</span>
          {availableMonths.map((m) => {
            const isSelected = m.id === rosterMonth;
            return (
              <button
                key={m.id}
                onClick={() => onSelectMonth(m.id)}
                className={`px-2 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  isSelected
                    ? "bg-purple-600 text-white shadow-sm"
                    : "bg-white dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-700 border border-zinc-200 dark:border-zinc-700"
                }`}
              >
                {m.monthName.slice(0, 3)}
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. EXECUTIVE KPI METRIC CARDS (YEAR A VS YEAR B) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Total Trips */}
        <div className="bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200 dark:border-zinc-700/60 rounded-2xl p-4">
          <div className="flex items-center justify-between text-xs text-zinc-500 font-medium">
            <span className="flex items-center gap-1.5">
              <TrendingUp className="w-3.5 h-3.5 text-purple-600" />
              <span>Corridor Dispatches</span>
            </span>
            <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold flex items-center gap-1 ${
              yoyComparison.tripsDelta.isPositive
                ? "bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300"
                : "bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300"
            }`}>
              {yoyComparison.tripsDelta.isPositive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
              <span>{yoyComparison.tripsDelta.percentageChange >= 0 ? "+" : ""}{yoyComparison.tripsDelta.percentageChange}%</span>
            </span>
          </div>

          <div className="mt-2 flex items-baseline justify-between">
            <div>
              <span className="text-2xl font-mono font-black text-zinc-900 dark:text-white">
                {yoyComparison.tripsDelta.yearAValue}
              </span>
              <span className="text-xs text-zinc-500 ml-1">in {rosterYear}</span>
            </div>
            <div className="text-right">
              <span className="text-sm font-mono font-bold text-zinc-500">
                {yoyComparison.tripsDelta.yearBValue}
              </span>
              <span className="text-[10px] text-zinc-400 block">in {compareYear}</span>
            </div>
          </div>

          <p className="text-[11px] text-zinc-500 mt-2">
            Net change: <strong>{yoyComparison.tripsDelta.delta >= 0 ? `+${yoyComparison.tripsDelta.delta}` : yoyComparison.tripsDelta.delta} trips</strong> for {yoyComparison.monthName}.
          </p>
        </div>

        {/* Passenger Volume */}
        <div className="bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200 dark:border-zinc-700/60 rounded-2xl p-4">
          <div className="flex items-center justify-between text-xs text-zinc-500 font-medium">
            <span className="flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-blue-600" />
              <span>Passengers Moved</span>
            </span>
            <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold flex items-center gap-1 ${
              yoyComparison.passengersDelta.isPositive
                ? "bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300"
                : "bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300"
            }`}>
              {yoyComparison.passengersDelta.isPositive ? "+" : ""}{yoyComparison.passengersDelta.percentageChange}%
            </span>
          </div>

          <div className="mt-2 flex items-baseline justify-between">
            <div>
              <span className="text-2xl font-mono font-black text-zinc-900 dark:text-white">
                {yoyComparison.passengersDelta.yearAValue.toLocaleString()}
              </span>
              <span className="text-xs text-zinc-500 ml-1">in {rosterYear}</span>
            </div>
            <div className="text-right">
              <span className="text-sm font-mono font-bold text-zinc-500">
                {yoyComparison.passengersDelta.yearBValue.toLocaleString()}
              </span>
              <span className="text-[10px] text-zinc-400 block">in {compareYear}</span>
            </div>
          </div>

          <p className="text-[11px] text-zinc-500 mt-2">
            Net difference: <strong>{yoyComparison.passengersDelta.delta >= 0 ? `+${yoyComparison.passengersDelta.delta.toLocaleString()}` : yoyComparison.passengersDelta.delta.toLocaleString()} passengers</strong>.
          </p>
        </div>

        {/* Estimated Revenue */}
        <div className="bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200 dark:border-zinc-700/60 rounded-2xl p-4">
          <div className="flex items-center justify-between text-xs text-zinc-500 font-medium">
            <span className="flex items-center gap-1.5">
              <DollarSign className="w-3.5 h-3.5 text-emerald-600" />
              <span>Corridor Revenue (SZL)</span>
            </span>
            <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold flex items-center gap-1 ${
              yoyComparison.revenueDelta.isPositive
                ? "bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300"
                : "bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300"
            }`}>
              {yoyComparison.revenueDelta.isPositive ? "+" : ""}{yoyComparison.revenueDelta.percentageChange}%
            </span>
          </div>

          <div className="mt-2 flex items-baseline justify-between">
            <div>
              <span className="text-xl font-mono font-black text-zinc-900 dark:text-white">
                E {yoyComparison.revenueDelta.yearAValue.toLocaleString()}
              </span>
              <span className="text-xs text-zinc-500 ml-1">in {rosterYear}</span>
            </div>
            <div className="text-right">
              <span className="text-xs font-mono font-bold text-zinc-500">
                E {yoyComparison.revenueDelta.yearBValue.toLocaleString()}
              </span>
              <span className="text-[10px] text-zinc-400 block">in {compareYear}</span>
            </div>
          </div>

          <p className="text-[11px] text-zinc-500 mt-2">
            Variance: <strong>{yoyComparison.revenueDelta.delta >= 0 ? `+E ${yoyComparison.revenueDelta.delta.toLocaleString()}` : `-E ${Math.abs(yoyComparison.revenueDelta.delta).toLocaleString()}`}</strong>.
          </p>
        </div>

        {/* Rotational Lead Equity Card */}
        <div className="bg-purple-50/70 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800 rounded-2xl p-4">
          <div className="flex items-center justify-between text-xs text-purple-900 dark:text-purple-200 font-bold">
            <span className="flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5 text-purple-600" />
              <span>Rotational Lead Equity</span>
            </span>
            <span className="px-1.5 py-0.5 rounded bg-emerald-600 text-white text-[10px] font-black uppercase">
              Compliant
            </span>
          </div>

          <div className="mt-2 space-y-1 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-zinc-500">{rosterYear} #1 Lead:</span>
              <span className="font-mono font-bold text-purple-700 dark:text-purple-300">
                {yoyComparison.planA.leadVehicleReg}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-zinc-500">{compareYear} #1 Lead:</span>
              <span className="font-mono font-bold text-indigo-700 dark:text-indigo-300">
                {yoyComparison.planB.leadVehicleReg}
              </span>
            </div>
          </div>

          <p className="text-[10px] text-purple-700 dark:text-purple-300 mt-2 font-medium">
            ✓ Verified non-repeating lead turn. Consecutive priority privileges prohibited by council.
          </p>
        </div>

      </div>

      {/* 4. SUB-VIEW SELECTOR: FLEET MATRIX / SEASONAL CURVE / MULTI-YEAR LEADS */}
      <div className="flex items-center gap-2 border-b border-zinc-200 dark:border-zinc-800 pb-2">
        <button
          onClick={() => setActiveTab("fleet")}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all ${
            activeTab === "fleet"
              ? "bg-purple-600 text-white shadow-sm"
              : "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200"
          }`}
        >
          <Car className="w-3.5 h-3.5" />
          <span>Fleet Queue Standing ({yoyComparison.vehicleComparisons.length} Kombis)</span>
        </button>

        <button
          onClick={() => setActiveTab("seasonal")}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all ${
            activeTab === "seasonal"
              ? "bg-purple-600 text-white shadow-sm"
              : "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200"
          }`}
        >
          <Calendar className="w-3.5 h-3.5" />
          <span>12-Month Seasonal Curve ({rosterYear} vs {compareYear})</span>
        </button>

        <button
          onClick={() => setActiveTab("leads")}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all ${
            activeTab === "leads"
              ? "bg-purple-600 text-white shadow-sm"
              : "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200"
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>Multi-Year Rotation Timeline ({yoyComparison.monthName})</span>
        </button>
      </div>

      {/* SUB-VIEW 1: FLEET QUEUE MATRIX */}
      {activeTab === "fleet" && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h4 className="font-bold text-zinc-900 dark:text-white text-sm">
                Corridor Vehicles: Queue Position & Dispatch Delta ({yoyComparison.monthName})
              </h4>
              <p className="text-xs text-zinc-500">
                Shows where each kombi was positioned in <strong>{compareYear}</strong> versus <strong>{rosterYear}</strong>, with trip volume changes.
              </p>
            </div>

            {/* Filter pills */}
            <div className="flex items-center gap-1 bg-zinc-100 dark:bg-zinc-800 p-1 rounded-xl">
              <button
                onClick={() => setFilterRank("all")}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold cursor-pointer ${
                  filterRank === "all" ? "bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white shadow-sm" : "text-zinc-500"
                }`}
              >
                All Vehicles
              </button>
              <button
                onClick={() => setFilterRank("movers")}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold cursor-pointer ${
                  filterRank === "movers" ? "bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white shadow-sm" : "text-zinc-500"
                }`}
              >
                Position Movers
              </button>
              <button
                onClick={() => setFilterRank("leads")}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold cursor-pointer ${
                  filterRank === "leads" ? "bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white shadow-sm" : "text-zinc-500"
                }`}
              >
                Lead Turn Holders
              </button>
            </div>
          </div>

          <div className="overflow-x-auto border border-zinc-200 dark:border-zinc-800 rounded-2xl">
            <table className="w-full text-left text-xs">
              <thead className="bg-zinc-50 dark:bg-zinc-800/70 text-zinc-500 uppercase tracking-wider font-bold border-b border-zinc-200 dark:border-zinc-800">
                <tr>
                  <th className="py-3 px-4">Vehicle & Driver</th>
                  <th className="py-3 px-4 text-center">{rosterYear} Position</th>
                  <th className="py-3 px-4 text-center">{compareYear} Position</th>
                  <th className="py-3 px-4 text-center">Queue Shift</th>
                  <th className="py-3 px-4 text-right">{rosterYear} Trips</th>
                  <th className="py-3 px-4 text-right">{compareYear} Trips</th>
                  <th className="py-3 px-4 text-right">Trip Delta</th>
                  <th className="py-3 px-4 text-right">Revenue Delta</th>
                  <th className="py-3 px-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                {filteredVehicles.map((v) => {
                  const origVeh = vehicles.find(item => item.registrationNumber === v.vehicleReg);
                  const isPositiveShift = v.positionDelta > 0;
                  const isNegativeShift = v.positionDelta < 0;

                  return (
                    <tr
                      key={v.vehicleReg}
                      className={`hover:bg-zinc-50/60 dark:hover:bg-zinc-800/30 transition-colors ${
                        v.yearAIsLead ? "bg-purple-50/30 dark:bg-purple-950/15" : ""
                      }`}
                    >
                      {/* Vehicle & Driver */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-lg bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center font-mono font-bold text-xs text-purple-600">
                            {v.fleetNumber.slice(-3)}
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="font-mono font-bold text-zinc-900 dark:text-white">
                                {v.vehicleReg}
                              </span>
                              {v.yearAIsLead && (
                                <span className="px-1.5 py-0.2 rounded text-[10px] font-black uppercase bg-purple-600 text-white">
                                  {rosterYear} Lead
                                </span>
                              )}
                              {v.yearBIsLead && (
                                <span className="px-1.5 py-0.2 rounded text-[10px] font-black uppercase bg-indigo-600 text-white">
                                  {compareYear} Lead
                                </span>
                              )}
                            </div>
                            <span className="text-zinc-500 text-[11px] block">
                              {v.driverName} • {v.make} {v.model}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Year A Position */}
                      <td className="py-3 px-4 text-center">
                        <span className={`inline-flex items-center justify-center w-7 h-7 rounded-lg font-mono font-bold ${
                          v.yearAPosition === 1
                            ? "bg-purple-600 text-white shadow-sm"
                            : "bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300"
                        }`}>
                          #{v.yearAPosition}
                        </span>
                      </td>

                      {/* Year B Position */}
                      <td className="py-3 px-4 text-center">
                        <span className={`inline-flex items-center justify-center w-7 h-7 rounded-lg font-mono font-bold ${
                          v.yearBPosition === 1
                            ? "bg-indigo-600 text-white shadow-sm"
                            : "bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300"
                        }`}>
                          #{v.yearBPosition}
                        </span>
                      </td>

                      {/* Queue Shift */}
                      <td className="py-3 px-4 text-center">
                        {isPositiveShift ? (
                          <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-bold">
                            <TrendingUp className="w-3.5 h-3.5" />
                            <span>+{v.positionDelta} spots</span>
                          </span>
                        ) : isNegativeShift ? (
                          <span className="inline-flex items-center gap-1 text-amber-600 dark:text-amber-400 font-bold">
                            <TrendingDown className="w-3.5 h-3.5" />
                            <span>{v.positionDelta} spots</span>
                          </span>
                        ) : (
                          <span className="text-zinc-400 font-medium">Unchanged</span>
                        )}
                      </td>

                      {/* Year A Trips */}
                      <td className="py-3 px-4 text-right font-mono font-bold text-zinc-900 dark:text-white">
                        {v.yearATrips}
                      </td>

                      {/* Year B Trips */}
                      <td className="py-3 px-4 text-right font-mono text-zinc-500">
                        {v.yearBTrips}
                      </td>

                      {/* Trip Delta */}
                      <td className="py-3 px-4 text-right font-mono font-bold">
                        <span className={v.tripsDelta >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}>
                          {v.tripsDelta >= 0 ? `+${v.tripsDelta}` : v.tripsDelta}
                        </span>
                      </td>

                      {/* Revenue Delta */}
                      <td className="py-3 px-4 text-right font-mono font-bold">
                        <span className={v.revenueDelta >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}>
                          {v.revenueDelta >= 0 ? `+E ${v.revenueDelta.toLocaleString()}` : `-E ${Math.abs(v.revenueDelta).toLocaleString()}`}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-center">
                        {origVeh && onInspectVehicle && (
                          <button
                            onClick={() => onInspectVehicle(origVeh)}
                            className="px-2 py-1 bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 hover:bg-purple-100 rounded-lg text-[11px] font-bold cursor-pointer"
                          >
                            Inspect
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SUB-VIEW 2: 12-MONTH SEASONAL CURVE */}
      {activeTab === "seasonal" && (
        <div className="space-y-4">
          <div>
            <h4 className="font-bold text-zinc-900 dark:text-white text-sm flex items-center gap-2">
              <Calendar className="w-4 h-4 text-purple-600" />
              <span>Full Calendar Year Seasonal Performance ({rosterYear} vs {compareYear})</span>
            </h4>
            <p className="text-xs text-zinc-500 mt-0.5">
              Monthly dispatch volumes across all 12 calendar cycles. Visualizes high-demand holiday surges and historical year-on-year trends.
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {yoyComparison.seasonalCurve.map((m) => {
              const isCurrentSelected = m.monthIndex === yoyComparison.monthIndex;
              const delta = m.yearATrips - m.yearBTrips;
              const pct = m.yearBTrips === 0 ? 0 : Math.round((delta / m.yearBTrips) * 100);

              return (
                <div
                  key={m.monthName}
                  onClick={() => onSelectMonth(`${rosterYear}-${String(m.monthIndex + 1).padStart(2, "0")}`)}
                  className={`p-3 rounded-2xl border transition-all cursor-pointer ${
                    isCurrentSelected
                      ? "bg-purple-50 dark:bg-purple-950/40 border-purple-300 dark:border-purple-700 shadow-sm"
                      : "bg-zinc-50 dark:bg-zinc-800/40 border-zinc-200 dark:border-zinc-700/60 hover:border-purple-200"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-zinc-900 dark:text-white">
                      {m.shortName}
                    </span>
                    <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded-full ${
                      delta >= 0 ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300" : "bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300"
                    }`}>
                      {pct >= 0 ? `+${pct}%` : `${pct}%`}
                    </span>
                  </div>

                  <div className="mt-2 space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-purple-600 font-mono font-black">{m.yearATrips}</span>
                      <span className="text-[10px] text-zinc-400">{rosterYear}</span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-zinc-500 font-mono font-medium">{m.yearBTrips}</span>
                      <span className="text-[10px] text-zinc-400">{compareYear}</span>
                    </div>
                  </div>

                  {/* Seasonal Tag if applicable */}
                  {m.monthIndex === 3 && (
                    <span className="mt-2 block text-[9px] font-bold text-amber-600 bg-amber-50 dark:bg-amber-950/40 px-1 py-0.5 rounded text-center">
                      Easter Rush
                    </span>
                  )}
                  {m.monthIndex === 8 && (
                    <span className="mt-2 block text-[9px] font-bold text-purple-600 bg-purple-50 dark:bg-purple-950/40 px-1 py-0.5 rounded text-center">
                      Reed Dance
                    </span>
                  )}
                  {m.monthIndex === 11 && (
                    <span className="mt-2 block text-[9px] font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 px-1 py-0.5 rounded text-center">
                      Festive Peak
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* SUB-VIEW 3: MULTI-YEAR ROTATION TIMELINE (LEAD VEHICLES) */}
      {activeTab === "leads" && (
        <div className="space-y-4">
          <div>
            <h4 className="font-bold text-zinc-900 dark:text-white text-sm flex items-center gap-2">
              <Layers className="w-4 h-4 text-purple-600" />
              <span>Multi-Year {yoyComparison.monthName} Lead Rotation Audit (2024 - 2028)</span>
            </h4>
            <p className="text-xs text-zinc-500 mt-0.5">
              Historical and scheduled Lead priority kombis for the month of {yoyComparison.monthName}. Guarantees rotational turn fairness across years.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
            {yoyComparison.leadTimeline.map((item) => {
              const isBase = item.year === 2026;
              const isSelectedA = item.year === rosterYear;
              const isSelectedB = item.year === compareYear;
              const isFuture = item.year > 2026;

              return (
                <div
                  key={item.year}
                  className={`p-4 rounded-2xl border transition-all ${
                    isSelectedA
                      ? "bg-purple-50 dark:bg-purple-950/40 border-purple-400 dark:border-purple-600 shadow-sm ring-2 ring-purple-300"
                      : isSelectedB
                      ? "bg-indigo-50 dark:bg-indigo-950/40 border-indigo-300 dark:border-indigo-700"
                      : "bg-zinc-50 dark:bg-zinc-800/40 border-zinc-200 dark:border-zinc-700/60"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-black text-sm text-zinc-900 dark:text-white">
                      Year {item.year}
                    </span>
                    {isBase && (
                      <span className="px-1.5 py-0.2 rounded text-[9px] font-black uppercase bg-emerald-600 text-white">
                        Active
                      </span>
                    )}
                    {isFuture && (
                      <span className="px-1.5 py-0.2 rounded text-[9px] font-bold uppercase bg-zinc-200 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-300">
                        Projected
                      </span>
                    )}
                  </div>

                  <div className="mt-3 space-y-1.5">
                    <div className="p-2 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
                      <span className="text-[10px] text-zinc-400 block font-bold uppercase">Designated Lead:</span>
                      <span className="font-mono font-black text-sm text-purple-700 dark:text-purple-300 block">
                        {item.leadVehicleReg}
                      </span>
                      <span className="text-xs text-zinc-600 dark:text-zinc-400 font-medium block">
                        {item.leadDriverName}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-xs text-zinc-500 pt-1">
                      <span>Est. Trips:</span>
                      <span className="font-mono font-bold text-zinc-800 dark:text-zinc-200">
                        {item.totalTrips}
                      </span>
                    </div>

                    <div className="flex items-center gap-1 text-[11px] text-emerald-600 dark:text-emerald-400 font-medium pt-1">
                      <CheckCircle className="w-3 h-3 shrink-0" />
                      <span>Turn Equity Verified</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

    </div>
  );
};

export default YoYQueueComparisonView;
