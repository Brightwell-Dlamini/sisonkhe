/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

"use client";

import { useState } from "react";
import { Loader2, AlertCircle, RefreshCw } from "lucide-react";
import { useDriverSummary } from "@/hooks/useDriverSummary";
import DriverVehicleCard from "./DriverVehicleCard";
import DriverSummaryCards from "./DriverSummaryCards";
import DriverTripsList from "./DriverTripsList";
import MessageMarshalModal from "./MessageMarshalModal";

export default function DriverDashboard() {
  const { context, summary, trips, loading, error, refresh } = useDriverSummary();
  const [showMessage, setShowMessage] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3500);
  };

  if (loading && !context) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
      </div>
    );
  }

  if (error && !context) {
    return (
      <div className="bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 rounded-xl px-4 py-3 text-xs flex items-start gap-2">
        <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
        <div>
          <div className="font-bold">Could not load driver data</div>
          <div className="mt-0.5">{error}</div>
        </div>
      </div>
    );
  }

  if (!context) return null;

  return (
    <div className="space-y-5">
      {toast && (
        <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 rounded-xl px-4 py-3 text-xs font-bold">
          {toast}
        </div>
      )}

      <header className="flex items-center justify-between">
        <div>
          <span className="text-[10px] font-black uppercase tracking-widest text-blue-600 dark:text-blue-400">
            Driver Cab
          </span>
          <h1 className="text-lg font-black text-zinc-900 dark:text-white">
            {context.fullName}
          </h1>
        </div>
        <button
          onClick={refresh}
          disabled={loading}
          className="p-2 rounded-xl bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 text-zinc-700 dark:text-zinc-300 disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
        </button>
      </header>

      <DriverVehicleCard
        vehicle={context.vehicle}
        marshal={context.marshal}
        onMessageMarshal={() => setShowMessage(true)}
      />

      {summary && <DriverSummaryCards summary={summary} />}

      <DriverTripsList trips={trips} />

      {showMessage && context.marshal && (
        <MessageMarshalModal
          marshal={context.marshal}
          driverName={context.fullName}
          onClose={() => setShowMessage(false)}
          onSent={() => {
            showToast("Message sent to marshal");
            setShowMessage(false);
          }}
        />
      )}
    </div>
  );
}
