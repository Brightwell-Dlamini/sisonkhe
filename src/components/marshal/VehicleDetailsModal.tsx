"use client";

import { useEffect, useState } from "react";
import { X, Loader2 } from "lucide-react";
import type { MarshalVehicle } from "@/lib/marshal/queries";

interface Props {
  registrationNumber: string;
  onClose: () => void;
}

interface DetailResponse {
  vehicle: {
    registrationNumber: string;
    vic: string | null;
    make: string;
    model: string;
    seatingCapacity: number;
    classification: string;
    status: string;
    loadingBay: string | null;
    permitNumber: string | null;
    permitStatus: string | null;
    permitExpiryDate: string | null;
    cofNumber: string | null;
    cofExpiryDate: string | null;
    ownerName: string | null;
    ownerPhone: string | null;
    association: string | null;
    driverName: string | null;
    driverPhone: string | null;
    driverPdpStatus: string | null;
  };
}

export default function VehicleDetailsModal({ registrationNumber, onClose }: Props) {
  const [data, setData] = useState<DetailResponse["vehicle"] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const res = await fetch(
          `/api/inspector/vehicle?reg=${encodeURIComponent(registrationNumber)}`,
          { cache: "no-store" }
        );
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        if (!cancelled) {
          const v = json.vehicle;
          setData({
            registrationNumber: v.registrationNumber,
            vic: v.vic,
            make: v.make,
            model: v.model,
            seatingCapacity: v.seatingCapacity,
            classification: v.classification,
            status: v.status,
            loadingBay: v.loadingBay,
            permitNumber: v.permitNumber,
            permitStatus: v.permitStatus,
            permitExpiryDate: v.permitExpiryDate,
            cofNumber: v.cofNumber,
            cofExpiryDate: v.cofExpiryDate,
            ownerName: v.ownerName,
            ownerPhone: v.ownerPhone,
            association: v.association,
            driverName: v.driverName,
            driverPhone: null,
            driverPdpStatus: v.driverPdpStatus,
          });
        }
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Error");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [registrationNumber]);

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-start justify-between p-5 border-b border-zinc-100 dark:border-zinc-800">
          <div>
            <h3 className="text-sm font-black uppercase tracking-wide text-zinc-900 dark:text-white">
              Vehicle Details
            </h3>
            <p className="text-xs text-zinc-500 font-mono mt-0.5">
              {registrationNumber}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-3 text-xs">
          {loading && (
            <div className="flex justify-center py-8">
              <Loader2 className="w-5 h-5 animate-spin text-emerald-600" />
            </div>
          )}

          {error && (
            <div className="bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 rounded-xl p-3">
              {error}
            </div>
          )}

          {data && (
            <>
              <Row label="Plate" value={data.registrationNumber} mono />
              <Row label="VIC" value={data.vic ?? "—"} mono />
              <Row label="Vehicle" value={`${data.make} ${data.model}`} />
              <Row label="Classification" value={data.classification} />
              <Row label="Seats" value={String(data.seatingCapacity)} />
              <Row label="Status" value={data.status} />
              <Row label="Loading Bay" value={data.loadingBay ?? "—"} />

              <div className="pt-2 mt-2 border-t border-zinc-100 dark:border-zinc-800 space-y-3">
                <span className="text-[10px] font-black uppercase text-emerald-600 dark:text-emerald-400">
                  Permit & Compliance
                </span>
                <Row label="Permit #" value={data.permitNumber ?? "—"} mono />
                <Row label="Permit Status" value={data.permitStatus ?? "—"} />
                <Row label="Permit Expiry" value={data.permitExpiryDate ?? "—"} mono />
                <Row label="COF #" value={data.cofNumber ?? "—"} mono />
                <Row label="COF Expiry" value={data.cofExpiryDate ?? "—"} mono />
              </div>

              <div className="pt-2 mt-2 border-t border-zinc-100 dark:border-zinc-800 space-y-3">
                <span className="text-[10px] font-black uppercase text-emerald-600 dark:text-emerald-400">
                  Ownership
                </span>
                <Row label="Owner" value={data.ownerName ?? "—"} />
                <Row label="Owner Phone" value={data.ownerPhone ?? "—"} mono />
                <Row label="Association" value={data.association ?? "—"} />
              </div>

              <div className="pt-2 mt-2 border-t border-zinc-100 dark:border-zinc-800 space-y-3">
                <span className="text-[10px] font-black uppercase text-emerald-600 dark:text-emerald-400">
                  Driver
                </span>
                <Row label="Name" value={data.driverName ?? "—"} />
                <Row label="Phone" value={data.driverPhone ?? "—"} mono />
                <Row label="PDP Status" value={data.driverPdpStatus ?? "—"} />
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3 py-1.5 border-b border-zinc-100 dark:border-zinc-800 last:border-0">
      <span className="text-zinc-500">{label}</span>
      <span className={`font-bold text-zinc-900 dark:text-white text-right ${mono ? "font-mono" : ""}`}>
        {value}
      </span>
    </div>
  );
}
