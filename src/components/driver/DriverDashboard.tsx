"use client";

import { useState } from "react";
import { Car, Calendar, CreditCard, RefreshCw } from "lucide-react";
import { useDriverSummary } from "@/hooks/useDriverSummary";
import { useDriverRoster } from "@/hooks/useDriverRoster";
import DriverHeader from "./DriverHeader";
import DriverVehicleCard from "./DriverVehicleCard";
import DriverSummaryCards from "./DriverSummaryCards";
import DriverTripsList from "./DriverTripsList";
import DriverRosterView from "./DriverRosterView";
import DriverCardView from "./DriverCardView";
import MessageMarshalModal from "./MessageMarshalModal";
import { IconButton, TableSkeleton, useToast } from "@/components/ui";

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
  const toast = useToast();

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
      toast.success("Status updated", "Marshal notified");
      return { success: true };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : "Network error",
      };
    }
  };

  if (loading && !context) return <TableSkeleton rows={6} />;

  if (error && !context) {
    return (
      <div className="bg-rose-500/10 border border-rose-500/25 text-rose-400 rounded-xl p-3 text-xs font-medium">
        {error}
      </div>
    );
  }

  if (!context) return null;

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <DriverHeader context={context} onPhotoUploaded={refresh} />
        </div>
        <IconButton
          icon={RefreshCw}
          label="Refresh"
          onClick={refresh}
          disabled={loading}
          className={loading ? "[&_svg]:animate-spin" : ""}
        />
      </div>

      <DriverSummaryCards summary={summary} />

      <div className="flex items-center gap-1.5 bg-[#0F0F10] border border-white/[0.06] p-1 rounded-2xl w-fit">
        {TABS.map((t) => {
          const Icon = t.icon;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                tab === t.id
                  ? "bg-white/[0.08] text-white"
                  : "text-zinc-500 hover:text-zinc-300"
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {t.label}
            </button>
          );
        })}
      </div>

      {tab === "vehicle" && (
        <div className="space-y-4">
          <DriverVehicleCard
            context={context}
            onStatusUpdate={handleStatusUpdate}
            onMessageMarshal={() => setShowMessage(true)}
          />
          <DriverTripsList trips={trips} />
        </div>
      )}
      {tab === "roster" && <DriverRosterView roster={roster} />}
      {tab === "card" && <DriverCardView context={context} />}

      {showMessage && (
        <MessageMarshalModal
          onClose={() => setShowMessage(false)}
          onSent={() => {
            setShowMessage(false);
            toast.success("Message sent to marshal");
          }}
        />
      )}
    </div>
  );
}
