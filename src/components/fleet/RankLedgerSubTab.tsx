/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { MarshalAccount, MarshalTransaction, Route, EswatiniRegion } from "../../types";
import {
  Users,
  Clock,
  ShieldCheck,
  Coins,
  TrendingUp,
  MapPin,
  Calendar,
  Layers,
  ArrowRight,
  Filter,
  CheckCircle2,
  Plus,
  CreditCard,
  Edit2,
  Phone
} from "lucide-react";
import { formatVIC } from "../../utils/helper";

interface RankLedgerSubTabProps {
  marshals: MarshalAccount[];
  marshalTransactions: MarshalTransaction[];
  routes?: Route[];
  rankFee?: number;
  splitOperational?: number;
  splitNRTC?: number;
  splitMaintenance?: number;
  onUpdateRankFee?: (newFee: number) => void;
  onUpdateRankFeeSplits?: (operational: number, nrtc: number, maintenance: number) => void;
  onOpenAddMarshal?: () => void;
  onOpenEditMarshal?: (marshal: MarshalAccount) => void;
  onOpenMarshalCard?: (marshal: MarshalAccount) => void;
}

export default function RankLedgerSubTab({
  marshals,
  marshalTransactions,
  routes = [],
  rankFee = 25,
  splitOperational = 20,
  splitNRTC = 3.5,
  splitMaintenance = 1.5,
  onUpdateRankFee,
  onUpdateRankFeeSplits,
  onOpenAddMarshal,
  onOpenEditMarshal,
  onOpenMarshalCard
}: RankLedgerSubTabProps) {
  const [selectedRegion, setSelectedRegion] = useState<string>("All");
  const [selectedMarshalId, setSelectedMarshalId] = useState<string>(marshals[0]?.id || "");
  const [isEditingFeeConfig, setIsEditingFeeConfig] = useState(false);
  const [tempRankFee, setTempRankFee] = useState<number>(rankFee);
  const [tempOp, setTempOp] = useState<number>(splitOperational);
  const [tempNRTC, setTempNRTC] = useState<number>(splitNRTC);
  const [tempMaint, setTempMaint] = useState<number>(splitMaintenance);

  const regionalMarshals = selectedRegion === "All"
    ? marshals
    : marshals.filter(m => m.region === selectedRegion);

  const selectedMarshal = regionalMarshals.find(m => m.id === selectedMarshalId) || regionalMarshals[0];
  const selectedMarshalTx = marshalTransactions.filter(tx => tx.marshalId === selectedMarshal?.id);

  // Group by date
  const txByDate: { [date: string]: { txs: MarshalTransaction[], total: number } } = {};
  selectedMarshalTx.forEach(tx => {
    if (!txByDate[tx.date]) {
      txByDate[tx.date] = { txs: [], total: 0 };
    }
    txByDate[tx.date].txs.push(tx);
    txByDate[tx.date].total += tx.amountSZL;
  });

  const sortedDates = Object.keys(txByDate).sort((a, b) => b.localeCompare(a));

  // Group by month
  const txByMonth: { [month: string]: MarshalTransaction[] } = {};
  selectedMarshalTx.forEach(tx => {
    if (!txByMonth[tx.month]) {
      txByMonth[tx.month] = [];
    }
    txByMonth[tx.month].push(tx);
  });
  const sortedMonths = Object.keys(txByMonth).sort((a, b) => b.localeCompare(a));

  const todayStr = new Date().toISOString().split("T")[0];
  const totalPoolRevenue = marshalTransactions.reduce((sum, tx) => sum + tx.amountSZL, 0);
  const todayDispatchesCount = marshalTransactions.filter(tx => tx.date === todayStr).length;

  const assignedRoute = routes.find(r => r.id === selectedMarshal?.assignedRouteId);

  return (
    <div className="space-y-6">
      {/* Top Consolidated Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-zinc-950 text-white p-6 rounded-3xl border border-zinc-900 shadow-sm flex flex-col justify-between">
          <div>
            <span className="text-[10px] font-black tracking-widest text-emerald-400 uppercase flex items-center gap-1.5">
              <Coins className="w-3.5 h-3.5" />
              Gross Rank Pool Revenue
            </span>
            <div className="text-3xl font-black text-white font-mono mt-2">
              E {totalPoolRevenue.toFixed(2)}
            </div>
          </div>
          <p className="text-xs text-zinc-400 mt-2">
            Flat E{rankFee.toFixed(2)} mandatory rank fee collected per dispatched vehicle.
          </p>
        </div>

        <div className="bg-white dark:bg-zinc-900 p-6 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-sm flex flex-col justify-between">
          <div>
            <span className="text-[10px] font-black tracking-widest text-blue-500 uppercase flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5" />
              Unified Dispatches Logged
            </span>
            <div className="text-3xl font-black text-zinc-900 dark:text-zinc-100 font-mono mt-2">
              {marshalTransactions.length} Events
            </div>
          </div>
          <p className="text-xs text-zinc-500 mt-2">
            Vehicles credited upon full-cabin loading and marshal bay departure.
          </p>
        </div>

        <div className="bg-white dark:bg-zinc-900 p-6 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-sm flex flex-col justify-between">
          <div>
            <span className="text-[10px] font-black tracking-widest text-amber-500 uppercase flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5" />
              Today's Station Dispatches
            </span>
            <div className="text-3xl font-black text-amber-500 font-mono mt-2">
              {todayDispatchesCount} Dispatches
            </div>
          </div>
          <p className="text-xs text-zinc-500 mt-2">
            Real-time daily dispatch queue traffic across all Eswatini regions.
          </p>
        </div>
      </div>

      {/* Two-Column Marshal Accounts Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Registered Marshals (1/3 width) */}
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-6 rounded-3xl h-fit space-y-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-emerald-600" />
              <h4 className="text-xs font-black text-zinc-900 dark:text-zinc-100 uppercase tracking-wider">
                Rank Marshals ({regionalMarshals.length})
              </h4>
            </div>
            {onOpenAddMarshal && (
              <button
                type="button"
                onClick={onOpenAddMarshal}
                className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-[10px] font-bold flex items-center gap-1 cursor-pointer shadow-sm transition-all"
              >
                <Plus className="w-3 h-3" />
                <span>+ Register</span>
              </button>
            )}
          </div>

          {/* Region Filter Selector */}
          <div className="space-y-1.5">
            <label className="text-[9px] font-black uppercase text-zinc-400 tracking-wider block">
              Filter by Region:
            </label>
            <div className="flex flex-wrap gap-1">
              {["All", "Hhohho", "Manzini", "Lubombo", "Shiselweni"].map((r) => (
                <button
                  key={r}
                  onClick={() => setSelectedRegion(r)}
                  className={`px-2.5 py-1 rounded-xl text-[10px] font-black uppercase tracking-wider cursor-pointer transition-all ${
                    selectedRegion === r
                      ? "bg-emerald-600 text-white shadow-sm"
                      : "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200"
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>

          <p className="text-[11px] text-zinc-500 leading-relaxed">
            Every marshal maintains a dedicated Rank Fee account where vehicles are registered and credited per dispatch.
          </p>

          <div className="space-y-2.5 pt-2 border-t border-zinc-150 dark:border-zinc-800">
            {regionalMarshals.map((m) => {
              const mTx = marshalTransactions.filter(tx => tx.marshalId === m.id);
              const mBalance = mTx.reduce((sum, tx) => sum + tx.amountSZL, 0);
              const isSelected = selectedMarshal?.id === m.id;
              const mTodayTxs = mTx.filter(tx => tx.date === todayStr).length;

              return (
                <button
                  key={m.id}
                  onClick={() => setSelectedMarshalId(m.id)}
                  className={`w-full text-left p-4 rounded-2xl border transition-all flex items-start gap-3 cursor-pointer ${
                    isSelected
                      ? "bg-zinc-50 dark:bg-zinc-800 border-emerald-500 dark:border-emerald-500 shadow-sm ring-1 ring-emerald-500/30"
                      : "bg-zinc-50/50 dark:bg-zinc-850/40 border-zinc-200/60 dark:border-zinc-800 hover:border-zinc-350 dark:hover:border-zinc-700"
                  }`}
                >
                  <div className={`w-10 h-10 rounded-2xl flex items-center justify-center font-black text-xs uppercase ${
                    isSelected ? "bg-emerald-600 text-white" : "bg-zinc-200 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
                  }`}>
                    {m.fullName.split(" ").map(n => n[0]).join("")}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <span className="font-bold text-xs text-zinc-900 dark:text-zinc-100 truncate block">
                        {m.fullName}
                      </span>
                      <div className="flex items-center gap-1">
                        {onOpenMarshalCard && (
                          <span
                            role="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onOpenMarshalCard(m);
                            }}
                            className="p-1 rounded-lg text-emerald-600 hover:bg-emerald-100 dark:hover:bg-emerald-950/80 transition-colors"
                            title="View Official Station Marshal Pass"
                          >
                            <CreditCard className="w-3.5 h-3.5" />
                          </span>
                        )}
                        {mTodayTxs > 0 && (
                          <span className="bg-emerald-500 text-white text-[9px] font-black px-1.5 py-0.5 rounded-full flex-shrink-0">
                            +{mTodayTxs} Today
                          </span>
                        )}
                      </div>
                    </div>
                    <span className="text-[10px] text-zinc-500 block truncate mt-0.5">
                      {m.terminalName}
                    </span>
                    <div className="flex items-center justify-between mt-2 pt-2 border-t border-zinc-200/50 dark:border-zinc-800/50">
                      <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest">
                        Accrued Balance
                      </span>
                      <span className="font-mono font-extrabold text-[11px] text-emerald-600 dark:text-emerald-400">
                        E {mBalance.toFixed(2)}
                      </span>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right Column: Marshal Ledger & Audits (2/3 width) */}
        {selectedMarshal ? (
          <div className="lg:col-span-2 space-y-6">
            {/* Marshal Header summary */}
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-6 rounded-3xl shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <span className="text-[9px] font-black tracking-widest text-emerald-600 dark:text-emerald-400 uppercase block">
                    Active Station Marshal Account
                  </span>
                  <h3 className="text-lg font-black text-zinc-900 dark:text-white uppercase mt-1 flex items-center gap-2">
                    <span>{selectedMarshal.fullName}</span>
                    {selectedMarshal.badgeNumber && (
                      <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 text-xs rounded-full font-mono font-bold">
                        {selectedMarshal.badgeNumber}
                      </span>
                    )}
                  </h3>
                  <p className="text-xs text-zinc-500 mt-1">
                    Station: <strong className="text-zinc-900 dark:text-zinc-100">{selectedMarshal.terminalName}</strong> ({selectedMarshal.region} Region)
                  </p>
                </div>

                {assignedRoute && (
                  <div className="p-3 bg-zinc-50 dark:bg-zinc-800 rounded-2xl border border-zinc-200 dark:border-zinc-700 text-xs">
                    <span className="text-[9px] font-black text-zinc-400 uppercase block">Assigned Corridor</span>
                    <strong className="text-zinc-900 dark:text-zinc-100 block">
                      {assignedRoute.origin} ➔ {assignedRoute.destination}
                    </strong>
                    <span className="text-[10px] text-amber-600 font-bold">Fare: E{assignedRoute.baseFareE || 50}.00</span>
                  </div>
                )}
              </div>

              {/* Action Buttons: Card Pass & Edit Profile */}
              <div className="flex items-center gap-2 flex-wrap mt-4 pt-4 border-t border-zinc-150 dark:border-zinc-800">
                {onOpenMarshalCard && (
                  <button
                    type="button"
                    onClick={() => onOpenMarshalCard(selectedMarshal)}
                    className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-sm transition-all"
                  >
                    <CreditCard className="w-3.5 h-3.5" />
                    <span>View Official Station Pass</span>
                  </button>
                )}
                {onOpenEditMarshal && (
                  <button
                    type="button"
                    onClick={() => onOpenEditMarshal(selectedMarshal)}
                    className="px-3 py-1.5 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                    <span>Edit Profile</span>
                  </button>
                )}
                {(selectedMarshal.cellPhone || selectedMarshal.phone) && (
                  <span className="text-[11px] font-mono text-zinc-500 flex items-center gap-1 sm:ml-auto">
                    <Phone className="w-3 h-3 text-zinc-400" />
                    <span>{selectedMarshal.cellPhone || selectedMarshal.phone}</span>
                  </span>
                )}
              </div>
            </div>

            {/* Accrued rank fees per day */}
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-6 rounded-3xl shadow-sm">
              <div className="flex items-center gap-2 mb-4">
                <Clock className="w-5 h-5 text-blue-500" />
                <h4 className="text-xs font-black text-zinc-900 dark:text-zinc-100 uppercase tracking-wider">
                  Accrued Rank Fees Per Day
                </h4>
              </div>

              {sortedDates.length === 0 ? (
                <div className="p-8 text-center text-zinc-500 text-xs border border-dashed border-zinc-200 dark:border-zinc-800 rounded-2xl bg-zinc-50/50 dark:bg-zinc-850/20">
                  No vehicle dispatch transactions logged for this marshal yet.
                </div>
              ) : (
                <div className="space-y-3">
                  {sortedDates.map((dateVal) => {
                    const dateObj = txByDate[dateVal];
                    const isToday = dateVal === todayStr;

                    return (
                      <div
                        key={dateVal}
                        className={`p-4 rounded-2xl border flex flex-col md:flex-row md:items-center justify-between gap-3 ${
                          isToday
                            ? "bg-zinc-50 dark:bg-zinc-850/60 border-emerald-500/40"
                            : "bg-zinc-50/50 dark:bg-zinc-850/20 border-zinc-200/60 dark:border-zinc-800"
                        }`}
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-black text-zinc-900 dark:text-zinc-150">
                              {new Date(dateVal).toLocaleDateString([], { weekday: 'long', year: 'numeric', month: 'short', day: 'numeric' })}
                            </span>
                            {isToday && (
                              <span className="bg-emerald-500 text-white text-[9px] font-black px-1.5 py-0.5 rounded">
                                TODAY
                              </span>
                            )}
                          </div>
                          <div className="mt-2 flex items-center gap-1.5 flex-wrap">
                            <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider">
                              Dispatched:
                            </span>
                            {dateObj.txs.map((tx) => (
                              <span
                                key={tx.id}
                                className="font-mono text-[10px] bg-zinc-200/60 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 px-2 py-0.5 rounded-lg font-bold border border-zinc-200 dark:border-zinc-700"
                                title={`Triggered at ${new Date(tx.timestamp).toLocaleTimeString()} via ${tx.triggerSource}`}
                              >
                                🚗 {formatVIC(tx.vehicleReg)}
                              </span>
                            ))}
                          </div>
                        </div>
                        <div className="flex items-center justify-between md:justify-end gap-3 pt-2 md:pt-0 border-t md:border-t-0 border-zinc-200 dark:border-zinc-800">
                          <div className="text-right">
                            <div className="text-sm font-black text-zinc-900 dark:text-white font-mono">
                              E {dateObj.total.toFixed(2)}
                            </div>
                            <div className="text-[9px] text-zinc-400 uppercase font-bold tracking-wider mt-0.5">
                              {dateObj.txs.length} vehicle{dateObj.txs.length !== 1 ? "s" : ""}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Monthly data/timestamp records */}
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-6 rounded-3xl shadow-sm">
              <div className="flex items-center gap-2 mb-4">
                <ShieldCheck className="w-5 h-5 text-emerald-500" />
                <h4 className="text-xs font-black text-zinc-900 dark:text-zinc-100 uppercase tracking-wider">
                  Monthly Detailed Timestamp Audit Ledger
                </h4>
              </div>

              {sortedMonths.length === 0 ? (
                <div className="p-8 text-center text-zinc-500 text-xs border border-dashed border-zinc-200 dark:border-zinc-800 rounded-2xl">
                  No monthly records found.
                </div>
              ) : (
                <div className="space-y-6">
                  {sortedMonths.map((monthVal) => {
                    const monthTxs = txByMonth[monthVal];
                    const [yearNum, monthNum] = monthVal.split("-");
                    const monthDate = new Date(parseInt(yearNum), parseInt(monthNum) - 1, 1);
                    const monthLabel = monthDate.toLocaleDateString([], { month: "long", year: "numeric" });

                    return (
                      <div key={monthVal} className="space-y-3 border-l-2 border-emerald-500/50 pl-4">
                        <div className="flex items-center justify-between pb-1">
                          <h5 className="text-xs font-black text-zinc-800 dark:text-zinc-200 uppercase tracking-wider">
                            🗓️ {monthLabel}
                          </h5>
                          <span className="text-xs font-mono font-black text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-1 rounded-xl">
                            E {(monthTxs.length * rankFee).toFixed(2)}
                          </span>
                        </div>

                        <div className="overflow-x-auto">
                          <table className="w-full text-left text-xs">
                            <thead>
                              <tr className="border-b border-zinc-200 dark:border-zinc-800 pb-1.5 text-[9px] text-zinc-400 uppercase font-bold tracking-wider">
                                <th className="py-2">Timestamp</th>
                                <th className="py-2">Vehicle (VIC / Reg)</th>
                                <th className="py-2">Trigger Method</th>
                                <th className="py-2 text-right">Fee Accrued</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-850">
                              {monthTxs.slice().reverse().map((tx) => (
                                <tr key={tx.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/40 transition-colors">
                                  <td className="py-2.5 font-mono text-[10px] text-zinc-500">
                                    {new Date(tx.timestamp).toLocaleString([], { month: "short", day: "2-digit", hour: "2-digit", minute: "2-digit" })}
                                  </td>
                                  <td className="py-2.5 font-bold font-mono text-zinc-900 dark:text-white">
                                    {formatVIC(tx.vehicleReg)} <span className="text-zinc-400 text-[10px] font-normal">({tx.vehicleReg})</span>
                                  </td>
                                  <td className="py-2.5">
                                    <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full uppercase ${
                                      tx.triggerSource === "Full Cabin Button"
                                        ? "bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300"
                                        : "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300"
                                    }`}>
                                      {tx.triggerSource === "Full Cabin Button" ? "Full Cabin" : "Bay Depart"}
                                    </span>
                                  </td>
                                  <td className="py-2.5 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">
                                    E {tx.amountSZL.toFixed(2)}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="lg:col-span-2 p-12 text-center text-zinc-500 text-xs border border-dashed border-zinc-200 dark:border-zinc-800 rounded-3xl bg-zinc-50 dark:bg-zinc-900/30 flex flex-col items-center justify-center">
            <Users className="w-8 h-8 text-zinc-400 mb-2" />
            Please select a registered Marshal on the left to review their ledger accounts.
          </div>
        )}
      </div>
    </div>
  );
}
