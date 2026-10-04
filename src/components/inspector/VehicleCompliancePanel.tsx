/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

"use client";

import {
  ShieldCheck,
  ShieldAlert,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  FileWarning,
} from "lucide-react";
import type { InspectorVehicleView } from "@/lib/inspector/queries";

interface Props {
  vehicle: InspectorVehicleView;
  onIssueTicket: () => void;
}

export default function VehicleCompliancePanel({
  vehicle,
  onIssueTicket,
}: Props) {
  const overallColor = vehicle.overallValid
    ? "emerald"
    : vehicle.permitValid
    ? "amber"
    : "red";

  const bgClass =
    overallColor === "emerald"
      ? "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800"
      : overallColor === "amber"
      ? "bg-amber-50 dark:bg-amber-950/40 border-amber-300 dark:border-amber-800"
      : "bg-rose-500/10 border-rose-500/30";

  const textClass =
    overallColor === "emerald"
      ? "text-emerald-900 dark:text-emerald-100"
      : overallColor === "amber"
      ? "text-amber-900 dark:text-amber-100"
      : "text-red-900 dark:text-red-100";

  return (
    <div
      className={`border-2 rounded-2xl p-5 space-y-4 ${bgClass} ${textClass}`}
    >
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3">
          <div
            className={`w-12 h-12 rounded-2xl flex items-center justify-center ${
              overallColor === "emerald"
                ? "bg-emerald-600 text-white"
                : overallColor === "amber"
                ? "bg-amber-600 text-white"
                : "bg-red-600 text-white"
            }`}
          >
            {vehicle.overallValid ? (
              <ShieldCheck className="w-6 h-6" />
            ) : (
              <ShieldAlert className="w-6 h-6" />
            )}
          </div>
          <div>
            <div className="text-[10px] font-black uppercase tracking-widest opacity-75">
              {vehicle.overallValid
                ? "COMPLIANT"
                : vehicle.permitValid
                ? "NON-CRITICAL ISSUES"
                : "NON-COMPLIANT"}
            </div>
            <div className="text-lg font-black uppercase tracking-tight font-mono">
              {vehicle.registrationNumber}
            </div>
            <div className="text-xs opacity-80">
              {vehicle.make} {vehicle.model} • {vehicle.seatingCapacity} seats
            </div>
          </div>
        </div>
        <button
          onClick={onIssueTicket}
          className="px-3.5 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-black uppercase tracking-wider flex items-center gap-1.5 shadow-sm"
        >
          <FileWarning className="w-3.5 h-3.5" />
          Issue Ticket
        </button>
      </div>

      {/* Compliance checks */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <ComplianceRow
          label="Permit"
          value={vehicle.permitNumber ?? "\u2014"}
          expiry={vehicle.permitExpiryDate}
          valid={vehicle.permitValid}
        />
        <ComplianceRow
          label="Fitness (COF)"
          value={vehicle.cofNumber ?? "\u2014"}
          expiry={vehicle.cofExpiryDate}
          valid={vehicle.cofValid}
        />
        <ComplianceRow
          label="Insurance"
          value="\u2014"
          expiry={vehicle.insuranceExpiry}
          valid={vehicle.insuranceValid}
        />
      </div>

      {/* Vehicle details */}
      <div className="grid grid-cols-2 gap-3 pt-3 border-t border-current/20 text-xs">
        <div>
          <div className="text-[10px] uppercase font-bold opacity-70">
            Driver
          </div>
          <div className="font-bold">
            {vehicle.driverName ?? "Unassigned"}
          </div>
          {vehicle.driverPdpStatus && (
            <div
              className={`text-[10px] font-bold ${
                vehicle.driverPdpStatus === "Valid"
                  ? "text-emerald-700 dark:text-emerald-400"
                  : "text-red-700 dark:text-red-400"
              }`}
            >
              PDP {vehicle.driverPdpStatus}
              {vehicle.driverPdpExpiry && ` • exp ${vehicle.driverPdpExpiry}`}
            </div>
          )}
        </div>
        <div>
          <div className="text-[10px] uppercase font-bold opacity-70">
            Owner
          </div>
          <div className="font-bold">{vehicle.ownerName ?? "\u2014"}</div>
          {vehicle.ownerPhone && (
            <div className="text-[10px] font-mono opacity-80">
              {vehicle.ownerPhone}
            </div>
          )}
        </div>
        <div>
          <div className="text-[10px] uppercase font-bold opacity-70">
            Route
          </div>
          <div className="font-bold">
            {vehicle.routeOrigin && vehicle.routeDestination
              ? `${vehicle.routeOrigin} \u2192 ${vehicle.routeDestination}`
              : "\u2014"}
          </div>
        </div>
        <div>
          <div className="text-[10px] uppercase font-bold opacity-70">
            Association
          </div>
          <div className="font-bold">{vehicle.association ?? "\u2014"}</div>
        </div>
      </div>
    </div>
  );
}

function ComplianceRow({
  label,
  value,
  expiry,
  valid,
}: {
  label: string;
  value: string;
  expiry: string | null;
  valid: boolean;
}) {
  return (
    <div className="bg-white/[0.03] rounded-xl p-3 border border-current/20">
      <div className="flex items-center justify-between mb-1">
        <span className="text-[10px] uppercase font-black opacity-70">
          {label}
        </span>
        {valid ? (
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
        ) : (
          <XCircle className="w-4 h-4 text-red-600" />
        )}
      </div>
      <div className="font-mono font-bold text-sm truncate">{value}</div>
      {expiry && (
        <div
          className={`text-[10px] font-mono ${
            valid
              ? "opacity-70"
              : "text-red-700 dark:text-red-400 font-bold"
          }`}
        >
          Exp: {expiry}
        </div>
      )}
    </div>
  );
}
