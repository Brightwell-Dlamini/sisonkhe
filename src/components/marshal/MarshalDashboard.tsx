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
        userId={user?.authUserId}
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
        <h2 className="text-sm font-bold text-white uppercase tracking-wide">
          Live queue
        </h2>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowAddVehicle(true)}
            className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 px-3 py-2 text-xs font-bold min-h-10"
          >
            <Plus className="w-4 h-4" />
            Add
          </button>
          <button
            type="button"
            onClick={() => setShowMore((v) => !v)}
            className="inline-flex items-center justify-center rounded-xl border border-white/[0.08] text-zinc-400 w-10 h-10"
            aria-label="More"
          >
            <MoreHorizontal className="w-4 h-4" />
          </button>
        </div>
      </div>

      {showMore && (
        <div className="rounded-xl border border-white/[0.06] bg-[#0F0F10] p-3 flex flex-wrap gap-2">
          <Link
            href="/marshal/comms"
            className="inline-flex items-center gap-1.5 text-xs text-zinc-300 px-3 py-2 rounded-lg bg-white/[0.04] min-h-10"
          >
            <MessageSquare className="w-3.5 h-3.5" /> Comms
          </Link>
          <Link
            href="/marshal/queue"
            className="inline-flex items-center gap-1.5 text-xs text-zinc-300 px-3 py-2 rounded-lg bg-white/[0.04] min-h-10"
          >
            <Calendar className="w-3.5 h-3.5" /> Full queue
          </Link>
          <Link
            href="/marshal/settings"
            className="inline-flex items-center gap-1.5 text-xs text-zinc-300 px-3 py-2 rounded-lg bg-white/[0.04] min-h-10"
          >
            <Settings className="w-3.5 h-3.5" /> Settings
          </Link>
        </div>
      )}

      <QueueList
        vehicles={vehicles}
        onDispatch={async (reg, status) => {
          const res = await dispatch(reg, status);
          if (res.success) showToast(`${reg} → ${status}`);
          else showToast(res.error || "Dispatch failed");
          return res;
        }}
        onReorder={handleReorder}
        onOpenDetails={(reg) => setDetailReg(reg)}
      />

      {showAddVehicle && (
        <AddVehicleModal
          open={showAddVehicle}
          onClose={() => setShowAddVehicle(false)}
          candidates={allVehicles}
          onAdd={async (reg) => {
            const res = await addToQueue(reg);
            if (res.success) {
              setShowAddVehicle(false);
              await refresh();
              showToast(`${reg} added to queue`);
            }
            return res;
          }}
        />
      )}

      {detailReg && (
        <VehicleDetailsModal
          registrationNumber={detailReg}
          open={!!detailReg}
          onClose={() => setDetailReg(null)}
          vehicles={vehicles}
        />
      )}
    </div>
  );
}
