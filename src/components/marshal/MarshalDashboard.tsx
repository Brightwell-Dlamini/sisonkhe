"use client";

import { useState, useMemo } from "react";
import {
  Loader2,
  AlertCircle,
  ListOrdered,
  Calendar,
  Scale,
  MessageSquare,
  Settings,
  Plus,
} from "lucide-react";
import { useMarshalTerminal } from "@/hooks/useMarshalTerminal";
import { useMarshalVehicles } from "@/hooks/useMarshalVehicles";
import { useMarshalRoster } from "@/hooks/useMarshalRoster";
import MarshalHeader from "./MarshalHeader";
import SummaryCards from "./SummaryCards";
import QueueList from "./QueueList";
import RecentActivityFeed from "./RecentActivityFeed";
import AddVehicleModal from "./AddVehicleModal";
import VehicleDetailsModal from "./VehicleDetailsModal";
import RosterView from "./RosterView";
import YoYComparisonView from "./YoYComparisonView";
import DriverCommsPanel from "./DriverCommsPanel";
import SettingsPanel from "./SettingsPanel";

type Tab = "queue" | "roster" | "yoy" | "comms" | "settings";

const TABS: { id: Tab; label: string; icon: React.ElementType }[] = [
  { id: "queue", label: "Live Queue", icon: ListOrdered },
  { id: "roster", label: "30-Day Roster", icon: Calendar },
  { id: "yoy", label: "Rotation Summary", icon: Scale },
  { id: "comms", label: "Driver Comms", icon: MessageSquare },
  { id: "settings", label: "Settings", icon: Settings },
];

export default function MarshalDashboard() {
  const {
    context,
    vehicles,
    summary,
    activity,
    loading,
    error,
    refresh,
    dispatch,
  } = useMarshalTerminal();

  const { vehicles: allVehicles, addToQueue, reorderQueue } = useMarshalVehicles();
  const { roster } = useMarshalRoster();

  const [tab, setTab] = useState<Tab>("queue");
  const [showAddVehicle, setShowAddVehicle] = useState(false);
  const [detailReg, setDetailReg] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3500);
  };

  const drivers = useMemo(() => {
    const map = new Map<string, { id: string; name: string; phone: string | null }>();
    for (const v of allVehicles) {
      if (v.driverId && v.driverName) {
        map.set(v.driverId, {
          id: v.driverId,
          name: v.driverName,
          phone: v.driverPhone ?? null,
        });
      }
    }
    return Array.from(map.values());
  }, [allVehicles]);

  const handleReorder = async (reg: string, direction: "up" | "down") => {
    const res = await reorderQueue(reg, direction);
    if (res.success) await refresh();
    return res;
  };

  if (loading && !context) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-emerald-400" />
      </div>
    );
  }

  if (error && !context) {
    return (
      <div className="bg-rose-500/10 border border-rose-500/25 text-rose-400 rounded-xl px-4 py-3 text-xs flex items-start gap-2">
        <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
        <div>
          <div className="font-bold">Could not load terminal</div>
          <div className="mt-0.5">{error}</div>
        </div>
      </div>
    );
  }

  if (!context) return null;

  return (
    <div className="space-y-5">
      {toast && (
        <div className="bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 rounded-xl px-4 py-3 text-xs font-bold flex items-center justify-between">
          <span>{toast}</span>
          <button onClick={() => setToast(null)} className="text-emerald-400">
            ✕
          </button>
        </div>
      )}

      <MarshalHeader context={context} onRefresh={refresh} loading={loading} />

      {summary && <SummaryCards summary={summary} />}

      <div className="flex items-center gap-1 bg-[#0F0F10] border border-white/[0.06] p-1 rounded-2xl overflow-x-auto scrollbar-none">
        {TABS.map((t) => {
          const Icon = t.icon;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 whitespace-nowrap cursor-pointer transition-all ${
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

      {tab === "queue" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div className="lg:col-span-2 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-black uppercase tracking-wider text-white">
                Live Queue
              </h2>
              <button
                onClick={() => setShowAddVehicle(true)}
                className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-black rounded-xl text-xs font-bold flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Vehicle
              </button>
            </div>
            <QueueList
              vehicles={vehicles}
              onDispatch={dispatch}
              onReorder={handleReorder}
              showToast={showToast}
              onSelectVehicle={setDetailReg}
            />
          </div>
          <div className="lg:col-span-1">
            <RecentActivityFeed activity={activity} />
          </div>
        </div>
      )}

      {tab === "roster" && <RosterView />}
      {tab === "yoy" && <YoYComparisonView roster={roster} />}
      {tab === "comms" && <DriverCommsPanel drivers={drivers} />}
      {tab === "settings" && <SettingsPanel />}

      {showAddVehicle && (
        <AddVehicleModal
          vehicles={allVehicles}
          onClose={() => setShowAddVehicle(false)}
          onAdd={async (reg) => {
            const res = await addToQueue(reg);
            if (res.success) {
              showToast(`${reg}: added to queue at #${res.position}`);
              await refresh();
            }
            return res;
          }}
        />
      )}

      {detailReg && (
        <VehicleDetailsModal
          registrationNumber={detailReg}
          onClose={() => setDetailReg(null)}
        />
      )}
    </div>
  );
}
