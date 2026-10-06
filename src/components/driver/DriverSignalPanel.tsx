"use client";

import { useState } from "react";
import {
  Clock,
  Users,
  CheckCircle2,
  Rocket,
  AlertTriangle,
  Wrench,
  Home,
  Loader2,
  CloudOff,
} from "lucide-react";
import type { DriverSignalKind } from "@/hooks/useDriverSignal";

interface Props {
  onEmit: (kind: DriverSignalKind, note?: string) => Promise<{
    ok: boolean;
    queued?: boolean;
    error?: string;
  }>;
  online: boolean;
  pendingCount: number;
  currentVehicleStatus: string;
}

interface SignalDef {
  kind: DriverSignalKind;
  label: string;
  icon: React.ElementType;
  tone: "neutral" | "progress" | "request" | "alert";
}

const SIGNALS: SignalDef[] = [
  { kind: "ready",          label: "Ready",         icon: Clock,        tone: "neutral"  },
  { kind: "loading",        label: "Boarding",      icon: Users,        tone: "progress" },
  { kind: "cabin_full",     label: "Cabin Full",    icon: CheckCircle2, tone: "request"  },
  { kind: "request_depart", label: "Request Depart", icon: Rocket,      tone: "request"  },
  { kind: "delayed",        label: "Delayed",       icon: AlertTriangle,tone: "alert"    },
  { kind: "breakdown",      label: "Breakdown",     icon: Wrench,       tone: "alert"    },
  { kind: "back_at_rank",   label: "Back at Rank",  icon: Home,         tone: "neutral"  },
];

const TONE: Record<SignalDef["tone"], string> = {
  neutral:  "border-white/[0.06] hover:border-zinc-500",
  progress: "border-white/[0.06] hover:border-emerald-500/60",
  request:  "border-white/[0.06] hover:border-blue-500/60",
  alert:    "border-white/[0.06] hover:border-rose-500/60",
};

export default function DriverSignalPanel({
  onEmit,
  online,
  pendingCount,
  currentVehicleStatus,
}: Props) {
  const [busy, setBusy] = useState<DriverSignalKind | null>(null);
  const [toast, setToast] = useState<{ text: string; tone: "ok" | "warn" | "err" } | null>(null);

  const flash = (text: string, tone: "ok" | "warn" | "err") => {
    setToast({ text, tone });
    window.setTimeout(() => setToast(null), 3200);
  };

  const handle = async (def: SignalDef) => {
    setBusy(def.kind);
    const res = await onEmit(def.kind);
    setBusy(null);

    if (!res.ok) {
      flash(res.error ?? "Signal failed", "err");
      return;
    }
    if (res.queued) {
      flash(`Queued — will send when back online`, "warn");
      return;
    }
    flash(`${def.label} sent to marshal`, "ok");
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="text-[11px] font-black uppercase tracking-widest text-zinc-500">
          Signal the Marshal
        </div>
        <div className="flex items-center gap-2">
          {!online && (
            <span className="flex items-center gap-1 text-[10px] font-bold text-amber-400">
              <CloudOff className="w-3 h-3" /> Offline
            </span>
          )}
          {pendingCount > 0 && (
            <span className="text-[10px] font-mono text-amber-400">
              {pendingCount} queued
            </span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {SIGNALS.map((s) => {
          const Icon = s.icon;
          const isBusy = busy === s.kind;
          return (
            <button
              key={s.kind}
              onClick={() => handle(s)}
              disabled={busy !== null}
              className={`py-2.5 px-3 rounded-xl text-[11px] font-black uppercase tracking-wider border bg-[#0F0F10] text-zinc-300 flex flex-col items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50 ${TONE[s.tone]}`}
            >
              {isBusy ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Icon className="w-4 h-4" />
              )}
              {s.label}
            </button>
          );
        })}
      </div>

      {toast && (
        <div
          className={`text-[11px] text-center font-bold ${
            toast.tone === "ok"
              ? "text-emerald-400"
              : toast.tone === "warn"
              ? "text-amber-400"
              : "text-rose-400"
          }`}
        >
          {toast.text}
        </div>
      )}

      <div className="text-[10px] text-zinc-500 text-center">
        Current rank status: <span className="font-mono text-zinc-400">{currentVehicleStatus}</span> ·
        Marshal has final authority on dispatch.
      </div>
    </div>
  );
}
