"use client";

import { useState } from "react";
import {
  Loader2,
  AlertCircle,
  RefreshCw,
  Car,
  Calendar,
  CreditCard,
} from "lucide-react";
import { useDriverSummary } from "@/hooks/useDriverSummary";
import { useDriverRoster } from "@/hooks/useDriverRoster";
import DriverHeader from "./DriverHeader";
import DriverVehicleCard from "./DriverVehicleCard";
import DriverSummaryCards from "./DriverSummaryCards";
import DriverTripsList from "./DriverTripsList";
import DriverRosterView from "./DriverRosterView";
import DriverCardView from "./DriverCardView";
import MessageMarshalModal from "./MessageMarshalModal";

type Tab = "vehicle" | "roster" | "card";

const TABS: { id: Tab; label: string; icon: React.ElementType }[] = [
  { id: "vehicle", label: "My Vehicle", icon: Car },
  { id: "roster", label: "30-Day Roster", icon: Calendar },
  { id: "card", label: "Virtual Card", icon: CreditCard },
];

export default function DriverDashboard() {
  const { context, summary, trips, loading, error, refresh } = useDriverSummary();
  const { roster } = useDriverRoster();
  const [tab, setTab] = useState<Tab>("vehicle");
  const [showMessage, setShowMessage] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3500);
  };

  const handleStatusUpdate = async (status: string) => {
    try {
      const res = await fetch("/api/driver/status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const data = await res.json();
      if (!res.ok) return { success: false, error: data.error };
      await refresh();
      showToast(`Status updated. Marshal notified.`);
      return { success: true };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : "Network error",
      };
    }
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
      <div className="bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 rounded-xl px-4 py-3 text-xs">
        {error}
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

      <DriverHeader context={context} onPhotoUploaded={refresh} />

      {/* Tabs */}
      <div className="flex items-center gap-1 bg-zinc-100 dark:bg-zinc-900 p-1 rounded-2xl border border-zinc-200 dark:border-zinc-800 overflow-x-auto scrollbar-none">
        {TABS.map((t) => {
          const Icon = t.icon;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 whitespace-nowrap cursor-pointer transition-all ${
                tab === t.id
                  ? "bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-sm"
                  : "text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {t.label}
            </button>
          );
        })}
      </div>

      {tab === "vehicle" && (
        <>
          <DriverVehicleCard
            vehicle={context.vehicle}
            marshal={context.marshal}
            onMessageMarshal={() => setShowMessage(true)}
            onStatusUpdate={handleStatusUpdate}
            isAfter830PM={roster?.after830PM}
          />

          {summary && <DriverSummaryCards summary={summary} />}

          <DriverTripsList trips={trips} />
        </>
      )}

      {tab === "roster" && <DriverRosterView />}
      {tab === "card" && <DriverCardView />}

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
