/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Driver Coach UI — one primary signal, hide senseless options.
 */

"use client";

import { useMemo, useState } from "react";
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
  Sparkles,
} from "lucide-react";
import type { DriverSignalKind } from "@/hooks/useDriverSignal";
import { driverCoach, signalLabel } from "@/lib/domain/driverCoach";

interface Props {
  onEmit: (
    kind: DriverSignalKind,
    note?: string
  ) => Promise<{ ok: boolean; queued?: boolean; error?: string }>;
  online: boolean;
  pendingCount: number;
  currentVehicleStatus: string;
  currentQueuePosition?: number;
  routeOrigin?: string | null;
  routeDestination?: string | null;
  hasVehicle?: boolean;
}

const ICONS: Record<DriverSignalKind, React.ElementType> = {
  ready: Clock,
  loading: Users,
  cabin_full: CheckCircle2,
  request_depart: Rocket,
  delayed: AlertTriangle,
  breakdown: Wrench,
  back_at_rank: Home,
};

const SECONDARY_TONE: Partial<Record<DriverSignalKind, string>> = {
  delayed: "border-amber-800/50 text-amber-300 hover:bg-amber-950/40",
  breakdown: "border-rose-800/50 text-rose-300 hover:bg-rose-950/40",
  request_depart: "border-blue-800/50 text-blue-300 hover:bg-blue-950/40",
  loading: "border-emerald-800/50 text-emerald-300 hover:bg-emerald-950/40",
  ready: "border-white/[0.08] text-zinc-300 hover:bg-white/[0.04]",
  cabin_full: "border-emerald-800/50 text-emerald-300 hover:bg-emerald-950/40",
  back_at_rank: "border-white/[0.08] text-zinc-300 hover:bg-white/[0.04]",
};

export default function DriverSignalPanel({
  onEmit,
  online,
  pendingCount,
  currentVehicleStatus,
  currentQueuePosition = 0,
  routeOrigin,
  routeDestination,
  hasVehicle = true,
}: Props) {
  const [busy, setBusy] = useState<DriverSignalKind | null>(null);
  const [toast, setToast] = useState<{
    text: string;
    tone: "ok" | "warn" | "err";
  } | null>(null);

  const coach = useMemo(
    () =>
      driverCoach({
        status: currentVehicleStatus,
        currentQueuePosition,
        hasVehicle,
        routeOrigin,
        routeDestination,
      }),
    [
      currentVehicleStatus,
      currentQueuePosition,
      hasVehicle,
      routeOrigin,
      routeDestination,
    ]
  );

  const flash = (text: string, tone: "ok" | "warn" | "err") => {
    setToast({ text, tone });
    window.setTimeout(() => setToast(null), 3200);
  };

  const handle = async (kind: DriverSignalKind) => {
    setBusy(kind);
    const res = await onEmit(kind);
    setBusy(null);

    if (!res.ok) {
      flash(res.error ?? "Signal failed", "err");
      return;
    }
    if (res.queued) {
      flash("Queued — sends when you are back online", "warn");
      return;
    }
    flash(`${signalLabel(kind)} sent to marshal`, "ok");
  };

  if (!coach.canSignal) {
    return (
      <div className="text-[11px] text-zinc-500 text-center py-2">
        {coach.coachLine}
      </div>
    );
  }

  const PrimaryIcon = coach.primary ? ICONS[coach.primary] : Sparkles;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="text-[11px] font-black uppercase tracking-widest text-zinc-500">
          Signal the marshal
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

      {/* Coach strip */}
      <div
        className={`flex items-start gap-1.5 text-[11px] rounded-lg px-2.5 py-2 ${
          coach.isLead
            ? "bg-emerald-950/35 text-emerald-200 border border-emerald-800/35"
            : "bg-white/[0.03] text-zinc-400 border border-white/[0.05]"
        }`}
      >
        <Sparkles className="w-3.5 h-3.5 shrink-0 mt-0.5 text-emerald-400" />
        <span className="leading-snug">{coach.coachLine}</span>
      </div>

      {/* Primary CTA */}
      {coach.primary && (
        <button
          type="button"
          onClick={() => void handle(coach.primary!)}
          disabled={busy !== null}
          className="w-full py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-black uppercase tracking-wide flex items-center justify-center gap-2 shadow-lg shadow-emerald-900/30"
        >
          {busy === coach.primary ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <PrimaryIcon className="w-4 h-4" />
          )}
          <span>{coach.primaryLabel}</span>
          {coach.primaryHint && (
            <span className="opacity-80 text-[10px] font-normal normal-case hidden sm:inline">
              · {coach.primaryHint}
            </span>
          )}
        </button>
      )}

      {/* Secondary — only context-valid */}
      {coach.secondary.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {coach.secondary.map((kind) => {
            const Icon = ICONS[kind];
            const isBusy = busy === kind;
            return (
              <button
                key={kind}
                type="button"
                onClick={() => void handle(kind)}
                disabled={busy !== null}
                className={`py-2.5 px-3 rounded-xl text-[11px] font-bold border bg-[#0F0F10] flex flex-col items-center gap-1.5 transition-all disabled:opacity-50 ${
                  SECONDARY_TONE[kind] ?? "border-white/[0.08] text-zinc-300"
                }`}
              >
                {isBusy ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Icon className="w-4 h-4" />
                )}
                {signalLabel(kind)}
              </button>
            );
          })}
        </div>
      )}

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
        Rank status:{" "}
        <span className="font-mono text-zinc-400">{currentVehicleStatus}</span>
        {currentQueuePosition > 0 && (
          <>
            {" "}
            · queue #{currentQueuePosition}
          </>
        )}{" "}
        · Marshal decides final dispatch
      </div>
    </div>
  );
}
