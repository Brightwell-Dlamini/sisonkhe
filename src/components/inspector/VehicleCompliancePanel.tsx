/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Pass / fail compliance card for roadside stops.
 */

"use client";

import {
  ShieldCheck,
  ShieldAlert,
  CheckCircle2,
  XCircle,
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
      ? "bg-emerald-500/10 border-emerald-500/40"
      : overallColor === "amber"
        ? "bg-amber-500/10 border-amber-500/40"
        : "bg-rose-500/10 border-rose-500/40";

  const textClass =
    overallColor === "emerald"
      ? "text-emerald-100"
      : overallColor === "amber"
        ? "text-amber-100"
        : "text-red-100";

  return (
    <div className={`border-2 rounded-2xl p-5 space-y-4 ${bgClass} ${textClass}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0">
          <div
            className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${
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
          <div className="min-w-0">
            <div className="text-[10px] font-black uppercase tracking-widest opacity-75">
              {vehicle.overallValid
                ? "Compliant"
                : vehicle.permitValid
                  ? "Issues found"
                  : "Non-compliant"}
            </div>
            <div className="text-lg font-black uppercase tracking-tight font-mono truncate">
              {vehicle.registrationNumber}
            </div>
            {vehicle.vic && (
              <div className="text-[11px] font-mono opacity-80">
                VIC {vehicle.vic}
              </div>
            )}
            <div className="text-xs opacity-80">
              {vehicle.make} {vehicle.model}
              {vehicle.seatingCapacity
                ? ` · ${vehicle.seatingCapacity} seats`
                : ""}
            </div>
          </div>
        </div>
        <button
          type="button"
          onClick={onIssueTicket}
          className="px-3.5 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-black uppercase tracking-wider flex items-center gap-1.5 shadow-sm shrink-0"
        >
          <FileWarning className="w-3.5 h-3.5" />
          Ticket
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <ComplianceRow
          label="Permit"
          value={vehicle.permitNumber ?? "—"}
          expiry={vehicle.permitExpiryDate}
          valid={vehicle.permitValid}
        />
        <ComplianceRow
          label="Fitness (COF)"
          value={vehicle.cofNumber ?? "—"}
          expiry={vehicle.cofExpiryDate}
          valid={vehicle.cofValid}
        />
        <ComplianceRow
          label="Insurance"
          value="—"
          expiry={vehicle.insuranceExpiry}
          valid={vehicle.insuranceValid}
        />
        <ComplianceRow
          label="Driver PDP"
          value={vehicle.driverPdpStatus ?? (vehicle.driverName ? "—" : "N/A")}
          expiry={vehicle.driverPdpExpiry}
          valid={vehicle.driverPdpValid}
        />
      </div>

      <div className="grid grid-cols-2 gap-3 pt-3 border-t border-current/20 text-xs">
        <div>
          <div className="text-[10px] uppercase font-bold opacity-70">Driver</div>
          <div className="font-bold">{vehicle.driverName ?? "Unassigned"}</div>
          {vehicle.driverLicenseNumber && (
            <div className="text-[10px] font-mono opacity-80">
              Licence {vehicle.driverLicenseNumber}
            </div>
          )}
          {vehicle.driverStatus === "Suspended" && (
            <div className="text-[10px] font-bold text-red-400">Suspended</div>
          )}
        </div>
        <div>
          <div className="text-[10px] uppercase font-bold opacity-70">Owner</div>
          <div className="font-bold">{vehicle.ownerName ?? "—"}</div>
          {vehicle.ownerPhone && (
            <div className="text-[10px] font-mono opacity-80">
              {vehicle.ownerPhone}
            </div>
          )}
        </div>
        <div>
          <div className="text-[10px] uppercase font-bold opacity-70">Route</div>
          <div className="font-bold">
            {vehicle.routeOrigin && vehicle.routeDestination
              ? `${vehicle.routeOrigin} → ${vehicle.routeDestination}`
              : "—"}
          </div>
          {vehicle.region && (
            <div className="text-[10px] opacity-70">{vehicle.region}</div>
          )}
        </div>
        <div>
          <div className="text-[10px] uppercase font-bold opacity-70">
            Association
          </div>
          <div className="font-bold">{vehicle.association ?? "—"}</div>
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
    <div className="bg-black/20 rounded-xl p-3 border border-current/15">
      <div className="flex items-center justify-between mb-1">
        <span className="text-[10px] uppercase font-black opacity-70">
          {label}
        </span>
        {valid ? (
          <CheckCircle2 className="w-4 h-4 text-emerald-500" />
        ) : (
          <XCircle className="w-4 h-4 text-red-500" />
        )}
      </div>
      <div className="font-mono font-bold text-sm truncate">{value}</div>
      {expiry && (
        <div
          className={`text-[10px] font-mono ${
            valid ? "opacity-70" : "text-red-400 font-bold"
          }`}
        >
          Exp: {expiry}
        </div>
      )}
    </div>
  );
}
