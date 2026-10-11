"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Loader2,
  AlertCircle,
  Plus,
  MoreHorizontal,
  MessageSquare,
  Calendar,
  Settings,
} from "lucide-react";
import { useMarshalTerminal } from "@/hooks/useMarshalTerminal";
import { useMarshalVehicles } from "@/hooks/useMarshalVehicles";
import { useAuth } from "@/hooks/useAuth";
import MarshalHeader from "./MarshalHeader";
import SummaryCards from "./SummaryCards";
import QueueList from "./QueueList";
import AddVehicleModal from "./AddVehicleModal";
import VehicleDetailsModal from "./VehicleDetailsModal";
import FirstRunWizard from "@/components/common/FirstRunWizard";

export default function MarshalDashboard() {
  const {
    context,
    vehicles,
    summary,
    loading,
    error,
    refresh,
    dispatch,
  } = useMarshalTerminal();

  const { vehicles: allVehicles, addToQueue, reorderQueue } =
    useMarshalVehicles();
  const { user } = useAuth();

  const [showAddVehicle, setShowAddVehicle] = useState(false);
  const [detailReg, setDetailReg] = useState<string | null>(null);
  const [showMore, setShowMore] = useState(false);
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
      <div className="bg-rose-500/10 border border-rose-500/25 text-rose-400 rounded-xl px-4 py-3 text-sm flex items-start gap-2">
        <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
        <div>
          <div className="font-semibold">Could not load terminal</div>
          <div className="mt-0.5 text-rose-300/90">{error}</div>
        </div>
      </div>
    );
  }

  if (!context) return null;

  return (
    <div className="space-y-4">
      <FirstRunWizard
        role="marshal"
        userId={user?.id}
        displayName={context.fullName}
      />

      {toast && (
        <div className="bg-emerald-500/10 border border-emerald-500/25 text-emerald-300 rounded-xl px-4 py-3 text-sm font-medium flex items-center justify-between">
          <span>{toast}</span>
          <button
            type="button"
            onClick={() => setToast(null)}
            className="text-emerald-400 min-h-9 min-w-9"
          >
            ✕
          </button>
        </div>
      )}

      <MarshalHeader context={context} onRefresh={refresh} loading={loading} />

      {summary && <SummaryCards summary={summary} />}

      <div className="flex items-center justify-between gap-2">
        <h2 className="text-title">Live queue</h2>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowMore((v) => !v)}
            className="min-h-11 px-3.5 bg-white/[0.06] text-zinc-200 rounded-xl text-sm font-semibold flex items-center gap-1.5 touch-manipulation"
          >
            <MoreHorizontal className="w-4 h-4" />
            More
          </button>
          <button
            type="button"
            onClick={() => setShowAddVehicle(true)}
            className="min-h-11 px-3.5 bg-emerald-500 hover:bg-emerald-400 text-black rounded-xl text-sm font-bold flex items-center gap-1.5 touch-manipulation"
          >
            <Plus className="w-4 h-4" />
            Add vehicle
          </button>
        </div>
      </div>

      {showMore && (
        <div className="grid grid-cols-3 gap-2">
          <Link
            href="/marshal/comms"
            className="rounded-xl border border-white/[0.06] bg-white/[0.03] p-3.5 text-center text-sm font-semibold text-zinc-200 hover:border-emerald-500/40 min-h-11 flex flex-col items-center justify-center gap-1"
          >
            <MessageSquare className="w-4 h-4 text-emerald-400" />
            Comms
          </Link>
          <Link
            href="/marshal/queue"
            className="rounded-xl border border-white/[0.06] bg-white/[0.03] p-3.5 text-center text-sm font-semibold text-zinc-200 hover:border-emerald-500/40 min-h-11 flex flex-col items-center justify-center gap-1"
          >
            <Calendar className="w-4 h-4 text-emerald-400" />
            30-day
          </Link>
          <Link
            href="/marshal/settings"
            className="rounded-xl border border-white/[0.06] bg-white/[0.03] p-3.5 text-center text-sm font-semibold text-zinc-200 hover:border-emerald-500/40 min-h-11 flex flex-col items-center justify-center gap-1"
          >
            <Settings className="w-4 h-4 text-emerald-400" />
            Settings
          </Link>
        </div>
      )}

      <QueueList
        vehicles={vehicles}
        onDispatch={dispatch}
        onReorder={handleReorder}
        showToast={showToast}
        onSelectVehicle={setDetailReg}
        onAddVehicle={() => setShowAddVehicle(true)}
      />

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
