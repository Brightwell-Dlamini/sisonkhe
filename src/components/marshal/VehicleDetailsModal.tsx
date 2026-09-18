/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";
import { Vehicle, Driver, Route, KombiStatus } from "../../types";
import { formatVIC, calculateDaysRemaining } from "../../utils/helper";
import { getOrCreateVehicleVirtualCard } from "../../utils/virtualCards";
import {
  X,
  Car,
  ShieldCheck,
  Award,
  Calendar,
  FileCheck,
  AlertTriangle,
  CheckCircle2,
  Users,
  Phone,
  CreditCard,
  ArrowRight,
  ExternalLink,
  ShieldAlert,
  Send,
  ArrowUp,
  ArrowDown
} from "lucide-react";

interface VehicleDetailsModalProps {
  isOpen: boolean;
  vehicle: Vehicle | null;
  driver?: Driver | null;
  route?: Route | null;
  onClose: () => void;
  onDepart?: (vehicleReg: string) => void;
  onFullCabin?: (vehicleReg: string) => void;
  onMoveUp?: (vehicleReg: string) => void;
  onMoveDown?: (vehicleReg: string) => void;
  queuePosition?: number;
}

export default function VehicleDetailsModal({
  isOpen,
  vehicle,
  driver,
  route,
  onClose,
  onDepart,
  onFullCabin,
  onMoveUp,
  onMoveDown,
  queuePosition
}: VehicleDetailsModalProps) {
  if (!isOpen || !vehicle) return null;

  const vic = formatVIC(vehicle.vic || vehicle.fleetNumber || vehicle.registrationNumber);
  const vCard = getOrCreateVehicleVirtualCard(vehicle, driver);

  const pdpDaysRemaining = driver?.pdpExpiryDate ? calculateDaysRemaining(driver.pdpExpiryDate) : null;
  const cofDaysRemaining = vehicle.cofExpiryDate ? calculateDaysRemaining(vehicle.cofExpiryDate) : null;
  const permitDaysRemaining = vehicle.permitExpiryDate ? calculateDaysRemaining(vehicle.permitExpiryDate) : null;

  const isPdpValid = driver?.pdpStatus === "Valid" || (pdpDaysRemaining !== null && pdpDaysRemaining > 0);
  const isCofValid = cofDaysRemaining !== null && cofDaysRemaining > 0;
  const isPermitValid = vehicle.permitStatus === "Active" || (permitDaysRemaining !== null && permitDaysRemaining > 0);

  const currentPos = queuePosition ?? vehicle.currentQueuePosition ?? 0;

  return (
    <div
      id="vehicle-details-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
    >
      <div
        id="vehicle-details-modal-dialog"
        className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl max-w-2xl w-full max-h-[92vh] overflow-y-auto shadow-2xl flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Bar */}
        <div className="p-6 border-b border-zinc-150 dark:border-zinc-800 flex items-start justify-between bg-zinc-50/70 dark:bg-zinc-850/60 sticky top-0 z-10 backdrop-blur-md rounded-t-3xl">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-blue-600/10 dark:bg-blue-500/20 border border-blue-500/30 flex items-center justify-center text-blue-600 dark:text-blue-400">
              <Car className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-2xl font-black text-zinc-950 dark:text-white tracking-wider">
                  {vic}
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-amber-100 dark:bg-amber-950/70 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-700/60">
                  {vehicle.registrationNumber}
                </span>
              </div>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5 flex items-center gap-2 font-medium">
                <span>{vehicle.make} {vehicle.model}</span>
                <span>•</span>
                <span>{vehicle.seatingCapacity} Seater</span>
                <span>•</span>
                <span className="text-blue-600 dark:text-blue-400 font-bold">{vehicle.loadingBay || "Bay 01"}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {currentPos > 0 && (
              <span className={`px-2.5 py-1 rounded-xl text-xs font-black font-mono uppercase tracking-wider ${
                currentPos === 1
                  ? "bg-emerald-500 text-white shadow-sm animate-pulse"
                  : "bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300"
              }`}>
                {currentPos === 1 ? "🔥 Loading (#1)" : `Queue Pos #${currentPos}`}
              </span>
            )}
            <button
              id="close-vehicle-details-modal-btn"
              onClick={onClose}
              className="p-2 rounded-xl text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-6">
          {/* Quick Status Pill Matrix */}
          <div className="grid grid-cols-3 gap-3">
            {/* PDP Badge */}
            <div className={`p-3 rounded-2xl border ${
              isPdpValid
                ? "bg-emerald-50/70 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800/60 text-emerald-800 dark:text-emerald-300"
                : "bg-rose-50/70 dark:bg-rose-950/30 border-rose-200 dark:border-rose-800/60 text-rose-800 dark:text-rose-300"
            }`}>
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-wider">Driver PDP</span>
                {isPdpValid ? <CheckCircle2 className="w-4 h-4 text-emerald-500" /> : <AlertTriangle className="w-4 h-4 text-rose-500" />}
              </div>
              <div className="font-mono text-sm font-bold mt-1">
                {driver?.pdpNumber || "PDP-22010"}
              </div>
              <div className="text-[10px] opacity-80 mt-0.5">
                {isPdpValid ? `Valid (${pdpDaysRemaining ? `${pdpDaysRemaining}d remaining` : "Current"})` : "EXPIRED / INVALID"}
              </div>
            </div>

            {/* COF Badge */}
            <div className={`p-3 rounded-2xl border ${
              isCofValid
                ? "bg-emerald-50/70 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800/60 text-emerald-800 dark:text-emerald-300"
                : "bg-rose-50/70 dark:bg-rose-950/30 border-rose-200 dark:border-rose-800/60 text-rose-800 dark:text-rose-300"
            }`}>
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-wider">COF Roadworthy</span>
                {isCofValid ? <CheckCircle2 className="w-4 h-4 text-emerald-500" /> : <AlertTriangle className="w-4 h-4 text-rose-500" />}
              </div>
              <div className="font-mono text-sm font-bold mt-1">
                {vehicle.cofNumber || "COF-5020-SZ"}
              </div>
              <div className="text-[10px] opacity-80 mt-0.5">
                {isCofValid ? `Valid (${cofDaysRemaining ? `${cofDaysRemaining}d remaining` : "Current"})` : "EXPIRED / DUE"}
              </div>
            </div>

            {/* Concession Permit Badge */}
            <div className={`p-3 rounded-2xl border ${
              isPermitValid
                ? "bg-emerald-50/70 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800/60 text-emerald-800 dark:text-emerald-300"
                : "bg-rose-50/70 dark:bg-rose-950/30 border-rose-200 dark:border-rose-800/60 text-rose-800 dark:text-rose-300"
            }`}>
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-wider">Route Permit</span>
                {isPermitValid ? <CheckCircle2 className="w-4 h-4 text-emerald-500" /> : <AlertTriangle className="w-4 h-4 text-rose-500" />}
              </div>
              <div className="font-mono text-sm font-bold mt-1">
                {vehicle.permitNumber || "G1090/2026"}
              </div>
              <div className="text-[10px] opacity-80 mt-0.5">
                {isPermitValid ? "Active Concession" : "PERMIT SUSPENDED"}
              </div>
            </div>
          </div>

          {/* Section 1: Official Driver Profile */}
          <div className="bg-zinc-50 dark:bg-zinc-800/40 p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black uppercase tracking-wider text-zinc-500 dark:text-zinc-400 flex items-center gap-1.5">
                <Users className="w-4 h-4 text-blue-500" />
                Assigned Kombi Driver
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 font-bold">
                {driver?.status || "Active Driver"}
              </span>
            </div>

            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                {driver?.profilePictureUrl ? (
                  <img
                    src={driver.profilePictureUrl}
                    alt={driver.fullName}
                    className="w-12 h-12 rounded-2xl object-cover border border-zinc-200 dark:border-zinc-700"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-2xl bg-zinc-200 dark:bg-zinc-700 flex items-center justify-center font-bold text-zinc-600 dark:text-zinc-300 text-base">
                    {driver?.fullName ? driver.fullName.charAt(0) : "D"}
                  </div>
                )}
                <div>
                  <h4 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                    {driver?.fullName || "Unassigned Driver"}
                  </h4>
                  <p className="text-xs text-zinc-500 font-mono mt-0.5">
                    ID: {driver?.nationalId || "9102144510882"} • Lic: {driver?.licenseNumber || "SZ-DL-29381"}
                  </p>
                </div>
              </div>

              {driver?.phone && (
                <a
                  href={`tel:${driver.phone}`}
                  className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer"
                >
                  <Phone className="w-3.5 h-3.5" />
                  <span>Call {driver.phone}</span>
                </a>
              )}
            </div>
          </div>

          {/* Section 2: Detailed Vehicle Compliance Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Regulatory & Safety Documents */}
            <div className="bg-white dark:bg-zinc-850/60 p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 space-y-3">
              <span className="text-[11px] font-black uppercase tracking-wider text-zinc-400 dark:text-zinc-500 flex items-center gap-1.5">
                <FileCheck className="w-4 h-4 text-emerald-500" />
                Permits & Certificates
              </span>

              <div className="space-y-2.5 text-xs">
                <div className="flex justify-between items-center py-1 border-b border-zinc-100 dark:border-zinc-800">
                  <span className="text-zinc-500">Number Plate (Reg):</span>
                  <span className="font-mono font-bold text-zinc-900 dark:text-white bg-amber-50 dark:bg-amber-950/40 px-2 py-0.5 rounded border border-amber-200 dark:border-amber-800/60">
                    {vehicle.registrationNumber}
                  </span>
                </div>
                <div className="flex justify-between items-center py-1 border-b border-zinc-100 dark:border-zinc-800">
                  <span className="text-zinc-500">Official VIC Code:</span>
                  <span className="font-mono font-bold text-blue-600 dark:text-blue-400">
                    {vic}
                  </span>
                </div>
                <div className="flex justify-between items-center py-1 border-b border-zinc-100 dark:border-zinc-800">
                  <span className="text-zinc-500">PDP Expiry Date:</span>
                  <span className="font-mono text-zinc-800 dark:text-zinc-200 font-semibold">
                    {driver?.pdpExpiryDate || "2027-07-14"}
                  </span>
                </div>
                <div className="flex justify-between items-center py-1 border-b border-zinc-100 dark:border-zinc-800">
                  <span className="text-zinc-500">COF Fitness Expiry:</span>
                  <span className="font-mono text-zinc-800 dark:text-zinc-200 font-semibold">
                    {vehicle.cofExpiryDate || "2027-07-14"}
                  </span>
                </div>
                <div className="flex justify-between items-center py-1 border-b border-zinc-100 dark:border-zinc-800">
                  <span className="text-zinc-500">Road Carrier Permit:</span>
                  <span className="font-mono text-zinc-800 dark:text-zinc-200 font-semibold">
                    {vehicle.permitNumber || "G1090/2026"} (Exp: {vehicle.permitExpiryDate || "2027-07-14"})
                  </span>
                </div>
                <div className="flex justify-between items-center py-1">
                  <span className="text-zinc-500">Roadworthiness:</span>
                  <span className="font-mono text-zinc-800 dark:text-zinc-200 font-semibold">
                    {vehicle.roadworthinessExpiry || "2026-09-20"}
                  </span>
                </div>
              </div>
            </div>

            {/* Vehicle Fleet & Ownership Specs */}
            <div className="bg-white dark:bg-zinc-850/60 p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 space-y-3">
              <span className="text-[11px] font-black uppercase tracking-wider text-zinc-400 dark:text-zinc-500 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-purple-500" />
                Ownership & Association
              </span>

              <div className="space-y-2.5 text-xs">
                <div className="flex justify-between items-center py-1 border-b border-zinc-100 dark:border-zinc-800">
                  <span className="text-zinc-500">Association:</span>
                  <span className="font-bold text-zinc-900 dark:text-white text-right truncate max-w-[180px]">
                    {vehicle.association || "Mbabane Transport Association"}
                  </span>
                </div>
                <div className="flex justify-between items-center py-1 border-b border-zinc-100 dark:border-zinc-800">
                  <span className="text-zinc-500">Registered Owner:</span>
                  <span className="font-bold text-zinc-900 dark:text-white">
                    {vehicle.ownerName || "Cyril Kunene"}
                  </span>
                </div>
                <div className="flex justify-between items-center py-1 border-b border-zinc-100 dark:border-zinc-800">
                  <span className="text-zinc-500">Owner Contact:</span>
                  <span className="font-mono font-semibold text-zinc-800 dark:text-zinc-200">
                    {vehicle.ownerPhone || "+268 7602 8899"}
                  </span>
                </div>
                <div className="flex justify-between items-center py-1 border-b border-zinc-100 dark:border-zinc-800">
                  <span className="text-zinc-500">Virtual Transit Card:</span>
                  <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                    E {vCard.balanceSZL.toFixed(2)} Balance
                  </span>
                </div>
                <div className="flex justify-between items-center py-1 border-b border-zinc-100 dark:border-zinc-800">
                  <span className="text-zinc-500">Annual Reg Fee (E450):</span>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400">
                    {vCard.registrationFeePaid ? "PAID (Official Seal OK)" : "PENDING"}
                  </span>
                </div>
                <div className="flex justify-between items-center py-1">
                  <span className="text-zinc-500">Assigned Bay:</span>
                  <span className="font-mono font-bold text-blue-600 dark:text-blue-400">
                    {vehicle.loadingBay || "Bay 01"}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Assigned Corridor Route Info */}
          {route && (
            <div className="p-3.5 bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/40 rounded-2xl flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                <span className="text-amber-900 dark:text-amber-200 font-bold">
                  Assigned Route: {route.origin} ➔ {route.destination}
                </span>
                <span className="text-zinc-400 font-mono">({route.distanceKm || 40} km)</span>
              </div>
              <span className="font-mono font-bold text-amber-700 dark:text-amber-300">
                Fare: E {route.baseFareE || route.fare || 50}.00
              </span>
            </div>
          )}
        </div>

        {/* Footer Actions for Marshal */}
        <div className="p-5 border-t border-zinc-150 dark:border-zinc-800 bg-zinc-50/90 dark:bg-zinc-900/90 rounded-b-3xl flex flex-wrap items-center justify-between gap-3">
          {/* Queue Reorder Shift Controls */}
          <div className="flex items-center gap-1.5">
            {onMoveUp && currentPos > 1 && (
              <button
                id="modal-move-queue-up-btn"
                onClick={() => onMoveUp(vehicle.registrationNumber)}
                className="px-3 py-2 bg-zinc-200 dark:bg-zinc-800 hover:bg-zinc-300 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 rounded-xl text-xs font-bold flex items-center gap-1 transition-colors"
                title="Move up 1 spot in queue"
              >
                <ArrowUp className="w-3.5 h-3.5" />
                <span>Move Up</span>
              </button>
            )}
            {onMoveDown && currentPos >= 1 && (
              <button
                id="modal-move-queue-down-btn"
                onClick={() => onMoveDown(vehicle.registrationNumber)}
                className="px-3 py-2 bg-zinc-200 dark:bg-zinc-800 hover:bg-zinc-300 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 rounded-xl text-xs font-bold flex items-center gap-1 transition-colors"
                title="Move down 1 spot in queue"
              >
                <ArrowDown className="w-3.5 h-3.5" />
                <span>Move Down</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 ml-auto">
            {/* Full Cabin Button */}
            {onFullCabin && (
              <button
                id="modal-mark-full-cabin-btn"
                onClick={() => onFullCabin(vehicle.registrationNumber)}
                className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Full Cabin (E25 Fee)</span>
              </button>
            )}

            {/* Depart Button */}
            {onDepart && (
              <button
                id="modal-depart-vehicle-btn"
                onClick={() => {
                  onDepart(vehicle.registrationNumber);
                  onClose();
                }}
                className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer"
              >
                <Send className="w-4 h-4" />
                <span>Depart Bay ➔ Next</span>
              </button>
            )}

            <button
              id="modal-close-details-btn"
              onClick={onClose}
              className="px-4 py-2.5 bg-zinc-200 dark:bg-zinc-800 hover:bg-zinc-300 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 rounded-xl text-xs font-bold transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
