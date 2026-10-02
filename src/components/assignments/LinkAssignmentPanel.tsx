/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Bidirectional driver ↔ vehicle link UI.
 * Humans type National ID and/or number plate; server writes both sides.
 */

"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Link2,
  Unlink,
  Search,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Car,
  User,
  IdCard,
} from "lucide-react";

type Mode = "either" | "driver" | "vehicle";

type DriverPreview = {
  id: string;
  fullName: string;
  nationalId: string | null;
  phone: string | null;
  assignedVehicleReg: string | null;
  status: string | null;
};

type VehiclePreview = {
  registrationNumber: string;
  make: string | null;
  model: string | null;
  vic: string | null;
  driverId: string | null;
  status: string | null;
  ownerName: string | null;
};

type AssignmentResult = {
  driverId: string;
  driverName: string;
  nationalId: string | null;
  vehicleReg: string;
  vehicleMake: string | null;
  vehicleModel: string | null;
  vic: string | null;
};

interface Props {
  defaultNationalId?: string;
  defaultVehicleReg?: string;
  defaultDriverId?: string;
  mode?: Mode;
  forceStaff?: boolean;
  onLinked?: (result: AssignmentResult) => void;
  onUnlinked?: () => void;
  className?: string;
}

export default function LinkAssignmentPanel({
  defaultNationalId = "",
  defaultVehicleReg = "",
  defaultDriverId = "",
  mode = "either",
  forceStaff = false,
  onLinked,
  onUnlinked,
  className = "",
}: Props) {
  const [nationalId, setNationalId] = useState(defaultNationalId);
  const [vehicleReg, setVehicleReg] = useState(defaultVehicleReg);
  const [driverId] = useState(defaultDriverId);

  const [driver, setDriver] = useState<DriverPreview | null>(null);
  const [vehicle, setVehicle] = useState<VehiclePreview | null>(null);
  const [lookupLoading, setLookupLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState<AssignmentResult | null>(null);

  const canEditNid = mode === "either" || mode === "vehicle";
  const canEditPlate = mode === "either" || mode === "driver";

  const lookup = useCallback(async () => {
    setError("");
    setSuccess(null);
    const nid = nationalId.trim();
    const plate = vehicleReg.trim();
    if (!nid && !driverId && !plate) {
      setDriver(null);
      setVehicle(null);
      return;
    }

    setLookupLoading(true);
    try {
      const params = new URLSearchParams();
      if (nid) params.set("nationalId", nid);
      if (driverId) params.set("driverId", driverId);
      if (plate) params.set("vehicleReg", plate);

      const res = await fetch(`/api/assignments/resolve?${params.toString()}`);
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Lookup failed");
        setDriver(null);
        setVehicle(null);
        return;
      }
      setDriver((data.driver as DriverPreview) || null);
      setVehicle((data.vehicle as VehiclePreview) || null);
    } catch {
      setError("Network error during lookup");
    } finally {
      setLookupLoading(false);
    }
  }, [nationalId, vehicleReg, driverId]);

  useEffect(() => {
    if (defaultNationalId || defaultVehicleReg || defaultDriverId) {
      void lookup();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleLink() {
    setError("");
    setSuccess(null);
    setActionLoading(true);
    try {
      const res = await fetch("/api/assignments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nationalId: nationalId.trim() || undefined,
          driverId: driverId.trim() || undefined,
          vehicleReg: vehicleReg.trim(),
          force: forceStaff,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Could not link");
        return;
      }
      const assignment = data.assignment as AssignmentResult;
      setSuccess(assignment);
      onLinked?.(assignment);
      await lookup();
    } catch {
      setError("Network error while linking");
    } finally {
      setActionLoading(false);
    }
  }

  async function handleUnlink() {
    setError("");
    setSuccess(null);
    setActionLoading(true);
    try {
      const res = await fetch("/api/assignments", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nationalId: nationalId.trim() || undefined,
          driverId: driverId.trim() || undefined,
          vehicleReg: vehicleReg.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Could not unlink");
        return;
      }
      onUnlinked?.();
      setDriver(null);
      setVehicle(null);
      await lookup();
    } catch {
      setError("Network error while unlinking");
    } finally {
      setActionLoading(false);
    }
  }

  const alreadyLinked =
    driver &&
    vehicle &&
    driver.assignedVehicleReg &&
    vehicle.registrationNumber &&
    driver.assignedVehicleReg.replace(/\s+/g, " ").toUpperCase() ===
      vehicle.registrationNumber.replace(/\s+/g, " ").toUpperCase() &&
    vehicle.driverId === driver.id;

  return (
    <div
      className={`bg-white rounded-2xl shadow-xl border border-slate-200/90 overflow-hidden ${className}`}
    >
      <div className="bg-slate-900 text-white p-5 sm:p-6 border-b-4 border-amber-500">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
            <Link2 className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-lg font-black uppercase tracking-wider text-amber-400">
              Link driver ↔ vehicle
            </h1>
            <p className="text-xs font-bold text-slate-300 uppercase tracking-widest">
              National ID · Number plate · One source of truth
            </p>
          </div>
        </div>
      </div>

      <div className="p-5 sm:p-6 space-y-5">
        {error && (
          <div className="flex items-start gap-2 rounded-xl border border-red-300 bg-red-50 px-3 py-2.5 text-xs text-red-800">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span className="font-medium">{error}</span>
          </div>
        )}

        {success && (
          <div className="flex items-start gap-2 rounded-xl border border-emerald-300 bg-emerald-50 px-3 py-2.5 text-xs text-emerald-900">
            <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
            <span>
              Linked <strong>{success.driverName}</strong> ↔{" "}
              <strong className="font-mono">{success.vehicleReg}</strong>
              {success.vic ? ` (${success.vic})` : ""}
            </span>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {canEditNid && (
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-800 mb-1.5">
                Driver National ID
              </label>
              <div className="relative">
                <IdCard className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  value={nationalId}
                  onChange={(e) => setNationalId(e.target.value)}
                  className="w-full pl-10 pr-3 py-2.5 rounded-xl border border-slate-300 bg-white text-sm font-mono focus:outline-none focus:ring-2 focus:ring-amber-500"
                  placeholder="e.g. 8701016123456"
                />
              </div>
            </div>
          )}
          {canEditPlate && (
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-800 mb-1.5">
                Vehicle number plate
              </label>
              <div className="relative">
                <Car className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  value={vehicleReg}
                  onChange={(e) => setVehicleReg(e.target.value.toUpperCase())}
                  className="w-full pl-10 pr-3 py-2.5 rounded-xl border border-slate-300 bg-white text-sm font-mono tracking-wide focus:outline-none focus:ring-2 focus:ring-amber-500"
                  placeholder="e.g. HSD 999 BM"
                />
              </div>
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={() => void lookup()}
          disabled={lookupLoading}
          className="w-full sm:w-auto px-4 py-2.5 rounded-xl border border-slate-300 bg-slate-50 hover:bg-slate-100 text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2"
        >
          {lookupLoading ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Search className="w-3.5 h-3.5" />
          )}
          Preview match
        </button>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <PreviewCard
            title="Driver"
            icon={<User className="w-4 h-4 text-blue-600" />}
            empty={!driver}
            emptyText="Enter National ID and preview"
          >
            {driver && (
              <>
                <p className="font-bold text-slate-900">{driver.fullName}</p>
                <p className="font-mono text-[11px] text-slate-600">
                  {driver.nationalId || "—"}
                </p>
                <p className="text-[11px] text-slate-500 mt-1">
                  Current vehicle:{" "}
                  <span className="font-mono font-semibold">
                    {driver.assignedVehicleReg || "None"}
                  </span>
                </p>
              </>
            )}
          </PreviewCard>
          <PreviewCard
            title="Vehicle"
            icon={<Car className="w-4 h-4 text-amber-600" />}
            empty={!vehicle}
            emptyText="Enter plate and preview"
          >
            {vehicle && (
              <>
                <p className="font-mono font-black text-slate-900">
                  {vehicle.registrationNumber}
                </p>
                <p className="text-[11px] text-slate-600">
                  {[vehicle.make, vehicle.model].filter(Boolean).join(" ") || "—"}
                  {vehicle.vic ? ` · ${vehicle.vic}` : ""}
                </p>
                <p className="text-[11px] text-slate-500 mt-1">
                  Current driver id:{" "}
                  <span className="font-mono font-semibold">
                    {vehicle.driverId || "None"}
                  </span>
                </p>
              </>
            )}
          </PreviewCard>
        </div>

        <div className="flex flex-col sm:flex-row gap-2.5 pt-1">
          <button
            type="button"
            onClick={() => void handleLink()}
            disabled={
              actionLoading ||
              !vehicleReg.trim() ||
              (!nationalId.trim() && !driverId.trim()) ||
              !!alreadyLinked
            }
            className="flex-1 py-3 rounded-xl bg-slate-900 hover:bg-slate-800 disabled:opacity-40 text-white text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2"
          >
            {actionLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Link2 className="w-4 h-4 text-amber-400" />
            )}
            {alreadyLinked ? "Already linked" : "Confirm link"}
          </button>
          <button
            type="button"
            onClick={() => void handleUnlink()}
            disabled={actionLoading || (!driver && !vehicle)}
            className="px-4 py-3 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 disabled:opacity-40 text-slate-800 text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2"
          >
            <Unlink className="w-4 h-4" />
            Unlink
          </button>
        </div>

        <p className="text-[10px] text-slate-500 text-center">
          Linking updates both records in one step. If either side was linked
          elsewhere, staff can force a swap from admin tools.
        </p>
      </div>
    </div>
  );
}

function PreviewCard({
  title,
  icon,
  empty,
  emptyText,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  empty: boolean;
  emptyText: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4 min-h-[100px]">
      <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-slate-600 mb-2">
        {icon}
        {title}
      </div>
      {empty ? (
        <p className="text-xs text-slate-400">{emptyText}</p>
      ) : (
        children
      )}
    </div>
  );
}
