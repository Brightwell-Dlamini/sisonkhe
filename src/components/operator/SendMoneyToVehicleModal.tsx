/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { FleetOperator, OperatorMasterCard, Vehicle, Driver, RankNotification } from "../../types";
import { disburseFundsToVehicle } from "../../utils/operatorCards";
import { getOrCreateVehicleVirtualCard } from "../../utils/virtualCards";
import { X, Send, CreditCard, Fuel, Zap, Wrench, AlertCircle, CheckCircle2, ShieldCheck, Phone } from "lucide-react";

interface SendMoneyToVehicleModalProps {
  operator: FleetOperator;
  masterCard: OperatorMasterCard;
  vehicles: Vehicle[];
  drivers: Driver[];
  selectedVehicleReg?: string;
  onClose: () => void;
  onSuccess: (message: string) => void;
  onAddNotification?: (notif: Omit<RankNotification, "id" | "timestamp">) => void;
}

type AllowanceCategory = "Fuel Allowance" | "Daily Rank Fee Budget" | "Maintenance" | "Emergency Driver Cash" | "Permit Renewal" | "Other";

export default function SendMoneyToVehicleModal({
  operator,
  masterCard,
  vehicles,
  drivers,
  selectedVehicleReg,
  onClose,
  onSuccess,
  onAddNotification
}: SendMoneyToVehicleModalProps) {
  const [targetReg, setTargetReg] = useState<string>(selectedVehicleReg || vehicles[0]?.registrationNumber || "");
  const [amount, setAmount] = useState<number>(250);
  const [category, setCategory] = useState<AllowanceCategory>("Fuel Allowance");
  const [customNote, setCustomNote] = useState<string>("");
  const [notifyDriverSMS, setNotifyDriverSMS] = useState<boolean>(true);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [error, setError] = useState<string>("");

  const targetVehicle = vehicles.find((v) => v.registrationNumber === targetReg) || vehicles[0];
  const targetDriver = drivers.find((d) => d.id === targetVehicle?.driverId || d.assignedVehicleReg === targetReg);

  const vehicleVirtualCard = targetVehicle ? getOrCreateVehicleVirtualCard(targetVehicle, targetDriver) : null;
  const currentVehicleBalance = vehicleVirtualCard ? vehicleVirtualCard.balanceSZL : 0;

  const handlePreset = (val: number, cat: AllowanceCategory) => {
    setAmount(val);
    setCategory(cat);
  };

  const handleDisburse = () => {
    setError("");
    if (!targetVehicle) {
      setError("Please select a target vehicle");
      return;
    }

    if (amount <= 0) {
      setError("Amount must be greater than zero");
      return;
    }

    if (amount > masterCard.balanceSZL) {
      setError(`Insufficient Master Card balance. Available: E${masterCard.balanceSZL.toFixed(2)}`);
      return;
    }

    setIsProcessing(true);

    try {
      const result = disburseFundsToVehicle(
        operator.id,
        targetVehicle.registrationNumber,
        targetDriver?.fullName || "Assigned Driver",
        amount,
        category,
        customNote || `${category} allocated by ${operator.name}`
      );

      if (!result.success) {
        setError(result.error || "Failed to disburse funds");
        setIsProcessing(false);
        return;
      }

      // Notify Driver via SMS if enabled
      if (notifyDriverSMS && targetDriver && onAddNotification) {
        onAddNotification({
          type: "SMS",
          recipientName: targetDriver.fullName,
          recipientPhone: targetDriver.phone || "+268 7600 0000",
          message: `Sisonkhe Fleet: Operator ${operator.name} sent E${amount.toFixed(2)} (${category}) to vehicle ${targetVehicle.registrationNumber}. New card balance: E${((vehicleVirtualCard?.balanceSZL || 0) + amount).toFixed(2)}. Ref: ${result.receiptRef}.`,
          status: "Delivered"
        });
      }

      onSuccess(`Successfully sent E${amount.toFixed(2)} to ${targetVehicle.registrationNumber}! (Ref: ${result.receiptRef})`);
      onClose();
    } catch (err: any) {
      setError(err?.message || "An unexpected error occurred during transfer");
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4">
      <div 
        className="bg-white dark:bg-zinc-900 rounded-3xl max-w-lg w-full overflow-hidden border border-zinc-200 dark:border-zinc-800 shadow-2xl animate-in zoom-in-95 duration-150 flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* MODAL HEADER */}
        <div className="p-5 border-b border-zinc-150 dark:border-zinc-800 flex items-center justify-between bg-zinc-50/50 dark:bg-zinc-800/30">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center border border-amber-500/20">
              <Send className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-zinc-900 dark:text-white font-space">
                Send Money to Fleet Vehicle
              </h2>
              <p className="text-xs text-zinc-500">
                Disburse funds directly from Operator Master Card to vehicle card
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* MODAL BODY */}
        <div className="p-5 overflow-y-auto space-y-4 text-xs font-mono flex-1">
          {error && (
            <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-300 dark:border-rose-800 text-rose-700 dark:text-rose-300 rounded-xl flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Master Card Balance Banner */}
          <div className="p-3.5 bg-zinc-100 dark:bg-zinc-800/60 rounded-2xl border border-zinc-200 dark:border-zinc-700 flex items-center justify-between">
            <div>
              <span className="text-[10px] text-zinc-500 uppercase tracking-wider block font-sans">
                Source: Operator Master Card
              </span>
              <span className="text-xs font-bold text-zinc-900 dark:text-white font-mono">
                {masterCard.cardNumber} ({operator.name})
              </span>
            </div>
            <div className="text-right">
              <span className="text-[10px] text-zinc-500 uppercase tracking-wider block font-sans">
                Available Master Balance
              </span>
              <span className="text-sm font-black text-emerald-600 dark:text-emerald-400 font-mono">
                E {masterCard.balanceSZL.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
          </div>

          {/* Target Vehicle Selection */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 block font-sans">
              1. Select Fleet Vehicle
            </label>
            <select
              value={targetReg}
              onChange={(e) => setTargetReg(e.target.value)}
              className="w-full bg-white dark:bg-black border border-zinc-300 dark:border-zinc-700 rounded-xl p-2.5 font-bold text-zinc-900 dark:text-white text-xs cursor-pointer focus:ring-2 focus:ring-amber-500"
            >
              {vehicles.map((v) => {
                const drv = drivers.find((d) => d.id === v.driverId || d.assignedVehicleReg === v.registrationNumber);
                return (
                  <option key={v.registrationNumber} value={v.registrationNumber}>
                    {v.registrationNumber} • {v.fleetNumber || v.vic} — Driver: {drv?.fullName || "Unassigned"} ({v.loadingBay})
                  </option>
                );
              })}
            </select>
          </div>

          {/* Target Vehicle Card Status Preview */}
          {targetVehicle && (
            <div className="p-3 bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/40 rounded-xl flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-amber-500" />
                <div>
                  <span className="font-bold text-zinc-900 dark:text-white block">
                    {targetVehicle.registrationNumber} ({targetVehicle.fleetNumber || targetVehicle.vic})
                  </span>
                  <span className="text-[10px] text-zinc-500 font-sans">
                    Driver: {targetDriver?.fullName || "Unassigned"} ({targetDriver?.phone || "No phone"})
                  </span>
                </div>
              </div>
              <div className="text-right">
                <span className="text-[10px] text-zinc-400 font-sans block">Current Card Balance</span>
                <span className="font-bold text-amber-600 dark:text-amber-400">
                  E {currentVehicleBalance.toFixed(2)}
                </span>
              </div>
            </div>
          )}

          {/* Transfer Purpose / Category */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 block font-sans">
              2. Purpose / Category
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {[
                { label: "Fuel Allowance", icon: Fuel, preset: 350 },
                { label: "Daily Rank Fee Budget", icon: Zap, preset: 100 },
                { label: "Maintenance", icon: Wrench, preset: 500 },
                { label: "Emergency Driver Cash", icon: Phone, preset: 200 },
                { label: "Permit Renewal", icon: ShieldCheck, preset: 450 },
                { label: "Other", icon: CreditCard, preset: 150 }
              ].map((item) => (
                <button
                  key={item.label}
                  type="button"
                  onClick={() => handlePreset(item.preset, item.label as AllowanceCategory)}
                  className={`p-2 rounded-xl text-left border transition-all cursor-pointer font-sans ${
                    category === item.label
                      ? "bg-amber-500/15 border-amber-500 text-amber-800 dark:text-amber-300 font-bold"
                      : "bg-zinc-50 dark:bg-zinc-800/40 border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300"
                  }`}
                >
                  <div className="flex items-center gap-1.5">
                    <item.icon className="w-3.5 h-3.5 flex-shrink-0" />
                    <span className="text-[11px] truncate">{item.label}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Amount Input with Quick Presets */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 font-sans">
                3. Disbursement Amount (SZL)
              </label>
              <span className="text-[10px] text-zinc-400 font-sans">
                Quick amounts:
              </span>
            </div>

            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-bold text-zinc-400 text-sm">
                  E
                </span>
                <input
                  type="number"
                  min="1"
                  max={masterCard.balanceSZL}
                  value={amount}
                  onChange={(e) => setAmount(Number(e.target.value) || 0)}
                  className="w-full pl-8 pr-4 py-2.5 bg-white dark:bg-black border border-zinc-300 dark:border-zinc-700 rounded-xl font-mono text-base font-extrabold text-zinc-900 dark:text-white"
                />
              </div>

              {[50, 100, 250, 500].map((presetVal) => (
                <button
                  key={presetVal}
                  type="button"
                  onClick={() => setAmount(presetVal)}
                  className="px-2.5 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 text-[11px] font-bold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer"
                >
                  +{presetVal}
                </button>
              ))}
            </div>
          </div>

          {/* Optional Note */}
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-zinc-500 font-sans">
              Reference Note (Optional):
            </label>
            <input
              type="text"
              placeholder="e.g. Weekend Corridor Fuel Float"
              value={customNote}
              onChange={(e) => setCustomNote(e.target.value)}
              className="w-full px-3 py-2 bg-white dark:bg-black border border-zinc-300 dark:border-zinc-700 rounded-xl text-xs"
            />
          </div>

          {/* Live Outcome Summary */}
          <div className="p-3 bg-zinc-50 dark:bg-zinc-800/40 rounded-xl border border-zinc-200 dark:border-zinc-800 text-[11px] space-y-1">
            <div className="flex justify-between">
              <span className="text-zinc-500 font-sans">Master Card Balance After Transfer:</span>
              <span className="font-bold font-mono text-zinc-900 dark:text-white">
                E {(masterCard.balanceSZL - amount).toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-500 font-sans">Vehicle Card Balance After Credit:</span>
              <span className="font-bold font-mono text-emerald-600 dark:text-emerald-400">
                E {(currentVehicleBalance + amount).toFixed(2)}
              </span>
            </div>
          </div>

          {/* Driver SMS Toggle */}
          <label className="flex items-center gap-2 text-xs font-sans text-zinc-700 dark:text-zinc-300 cursor-pointer pt-1">
            <input
              type="checkbox"
              checked={notifyDriverSMS}
              onChange={(e) => setNotifyDriverSMS(e.target.checked)}
              className="rounded text-amber-500 focus:ring-amber-400 w-4 h-4"
            />
            <span>Send automated SMS notification to assigned driver ({targetDriver?.phone || "No phone"})</span>
          </label>
        </div>

        {/* MODAL FOOTER */}
        <div className="p-4 border-t border-zinc-150 dark:border-zinc-800 flex items-center justify-end gap-3 bg-zinc-50/50 dark:bg-zinc-800/30">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white cursor-pointer"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleDisburse}
            disabled={isProcessing || amount <= 0 || amount > masterCard.balanceSZL}
            className="px-5 py-2.5 bg-amber-500 hover:bg-amber-600 text-black font-extrabold text-xs rounded-xl flex items-center gap-2 transition-all cursor-pointer shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isProcessing ? (
              <span>Processing Transfer...</span>
            ) : (
              <>
                <Send className="w-4 h-4" />
                <span>Confirm Send E{amount.toFixed(2)}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
