"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Loader2,
  AlertCircle,
  ListOrdered,
  Calendar,
  MessageSquare,
  Settings,
  Plus,
} from "lucide-react";
import { useMarshalTerminal } from "@/hooks/useMarshalTerminal";
import { useMarshalVehicles } from "@/hooks/useMarshalVehicles";
import MarshalHeader from "./MarshalHeader";
import SummaryCards from "./SummaryCards";
import QueueList from "./QueueList";
import RecentActivityFeed from "./RecentActivityFeed";
import AddVehicleModal from "./AddVehicleModal";
import VehicleDetailsModal from "./VehicleDetailsModal";
import QueueSuggestionsPanel from "./QueueSuggestionsPanel";

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

  const { vehicles: allVehicles, addToQueue, reorderQueue } =
    useMarshalVehicles();

  const [showAddVehicle, setShowAddVehicle] = useState(false);
  const [detailReg, setDetailReg] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3500);
  };

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

  const routeId =
    (context as { routeId?: string; assignedRouteId?: string }).routeId ??
    (context as { assignedRouteId?: string }).assignedRouteId ??
    null;

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
        <span className="px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 whitespace-nowrap bg-white/[0.08] text-white">
          <ListOrdered className="w-3.5 h-3.5" />
          Live Queue
        </span>
        <Link
          href="/marshal/queue"
          className="px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 whitespace-nowrap text-zinc-500 hover:text-zinc-300"
        >
          <Calendar className="w-3.5 h-3.5" />
          30-Day Roster
        </Link>
        <Link
          href="/marshal/comms"
          className="px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 whitespace-nowrap text-zinc-500 hover:text-zinc-300"
        >
          <MessageSquare className="w-3.5 h-3.5" />
          Driver Comms
        </Link>
        <Link
          href="/marshal/settings"
          className="px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 whitespace-nowrap text-zinc-500 hover:text-zinc-300"
        >
          <Settings className="w-3.5 h-3.5" />
          Settings
        </Link>
      </div>

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
        <div className="lg:col-span-1 space-y-4">
          <QueueSuggestionsPanel routeId={routeId} />
          <RecentActivityFeed activity={activity} />
        </div>
      </div>

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
