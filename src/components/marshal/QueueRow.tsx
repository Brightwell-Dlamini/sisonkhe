/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Rank Coach UI — one primary action, blockers visible before you click.
 */

"use client";

import { useMemo, useState } from "react";
import {
  Bus,
  User,
  MapPin,
  Loader2,
  CheckCircle2,
  Play,
  AlertTriangle,
  Wrench,
  RotateCcw,
  ChevronUp,
  ChevronDown,
  ShieldAlert,
  Sparkles,
} from "lucide-react";
import type { MarshalVehicle } from "@/lib/marshal/queries";
import type { DispatchAction } from "@/lib/marshal/dispatch";
import { rankCoach } from "@/lib/domain/rankCoach";
import { useLocale } from "@/hooks/useLocale";
import type { MessageKey } from "@/lib/i18n/messages";
import { StatusDot, statusToneFromLabel } from "@/components/ui";
import DelayReasonModal from "./DelayReasonModal";
import BreakdownModal from "./BreakdownModal";

interface Props {
  vehicle: MarshalVehicle;
  onDispatch: (
    reg: string,
    action: DispatchAction,
    reason?: string
  ) => Promise<{ success: boolean; error?: string; rankFeeWritten?: boolean }>;
  onReorder?: (
    reg: string,
    direction: "up" | "down"
  ) => Promise<{ success: boolean; error?: string }>;
  showToast: (msg: string) => void;
  onSelectVehicle?: (reg: string) => void;
}

const ACTION_ICON: Partial<Record<DispatchAction, React.ElementType>> = {
  load: Play,
  full_cabin: CheckCircle2,
  depart: Play,
  delay: AlertTriangle,
  breakdown: Wrench,
  reset_to_waiting: RotateCcw,
};

const ACTION_LABEL_KEY: Partial<Record<DispatchAction, MessageKey>> = {
  load: "marshal.load",
  full_cabin: "marshal.full_cabin",
  depart: "marshal.depart",
  delay: "marshal.delay",
  breakdown: "marshal.breakdown",
  reset_to_waiting: "marshal.cancel_load",
};

export default function QueueRow({
  vehicle,
  onDispatch,
  onReorder,
  showToast,
  onSelectVehicle,
}: Props) {
  const { t } = useLocale();
  const [pending, setPending] = useState<DispatchAction | "up" | "down" | null>(
    null
  );
  const [showDelay, setShowDelay] = useState(false);
  const [showBreakdown, setShowBreakdown] = useState(false);

  const coach = useMemo(() => rankCoach(vehicle), [vehicle]);
  const isQueued = vehicle.currentQueuePosition > 0;
  const isLead = coach.isLead;
  const isDeparted = vehicle.status === "Departed";

  const labelFor = (action: DispatchAction, fallback?: string) => {
    const key = ACTION_LABEL_KEY[action];
    return key ? t(key) : fallback ?? action;
  };

  const handle = async (action: DispatchAction) => {
    setPending(action);
    const res = await onDispatch(vehicle.registrationNumber, action);
    setPending(null);

    if (!res.success) {
      showToast(res.error ?? "Action failed");
      return;
    }

    if (res.rankFeeWritten) {
      showToast(
        `${vehicle.registrationNumber}: ${t("marshal.depart")} · rank fee recorded.`
      );
    } else if (action === "load") {
      showToast(`${vehicle.registrationNumber}: ${t("marshal.load")}.`);
    } else {
      showToast(`${vehicle.registrationNumber}: updated.`);
    }
  };

  const handleReorder = async (direction: "up" | "down") => {
    if (!onReorder) return;
    setPending(direction);
    const res = await onReorder(vehicle.registrationNumber, direction);
    setPending(null);
    if (res.success) {
      showToast(
        `${vehicle.registrationNumber}: moved ${direction === "up" ? "up" : "down"}.`
      );
    } else {
      showToast(res.error ?? "Reorder failed");
    }
  };

  const handleDelayConfirm = async (reason: string) => {
    setShowDelay(false);
    setPending("delay");
    const res = await onDispatch(vehicle.registrationNumber, "delay", reason);
    setPending(null);
    if (res.success)
      showToast(`${vehicle.registrationNumber}: ${t("marshal.delay")}.`);
    else showToast(res.error ?? "Failed");
  };

  const handleBreakdownConfirm = async (reason: string) => {
    setShowBreakdown(false);
    setPending("breakdown");
    const res = await onDispatch(
      vehicle.registrationNumber,
      "breakdown",
      reason
    );
    setPending(null);
    if (res.success)
      showToast(`${vehicle.registrationNumber}: ${t("marshal.breakdown")}.`);
    else showToast(res.error ?? "Failed");
  };

  const PrimaryIcon =
    (coach.primary && ACTION_ICON[coach.primary]) || Play;

  const primaryLabel = coach.primary
    ? labelFor(coach.primary, coach.primaryLabel)
    : coach.primaryLabel;

  return (
    <>
      <div
        className={`surface-raised p-4 transition-colors ${
          isLead
            ? "border-emerald-500/60 ring-2 ring-emerald-500/20"
            : coach.blocked
              ? "border-amber-500/40"
              : ""
        }`}
      >
        <div className="flex items-start gap-3">
          <div className="flex flex-col items-center gap-0.5 shrink-0">
            <div
              className={`w-12 h-12 rounded-xl flex items-center justify-center font-mono text-base font-bold ${
                isLead
                  ? "bg-emerald-600 text-white"
                  : isQueued
                    ? "bg-white/[0.06] text-zinc-200"
                    : "bg-[#0F0F10] text-zinc-500 border border-dashed border-white/[0.08]"
              }`}
            >
              {isQueued ? `#${vehicle.currentQueuePosition}` : "—"}
            </div>
            {isQueued && onReorder && (
              <div className="flex flex-col gap-0.5 mt-1">
                <button
                  type="button"
                  disabled={isLead || pending === "up"}
                  onClick={() => handleReorder("up")}
                  className="min-h-10 min-w-10 p-2 rounded-lg text-zinc-500 hover:text-white disabled:opacity-30 touch-manipulation"
                  title="Move up"
                >
                  {pending === "up" ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <ChevronUp className="w-4 h-4" />
                  )}
                </button>
                <button
                  type="button"
                  disabled={pending === "down"}
                  onClick={() => handleReorder("down")}
                  className="min-h-10 min-w-10 p-2 rounded-lg text-zinc-500 hover:text-white disabled:opacity-30 touch-manipulation"
                  title="Move down"
                >
                  {pending === "down" ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <ChevronDown className="w-4 h-4" />
                  )}
                </button>
              </div>
            )}
          </div>

          <div
            className="flex-1 min-w-0 cursor-pointer group"
            onClick={() => onSelectVehicle?.(vehicle.registrationNumber)}
          >
            <div className="flex items-center gap-2.5 flex-wrap">
              <span className="font-mono text-base sm:text-lg font-bold text-white group-hover:text-emerald-400 transition-colors tracking-tight">
                {vehicle.registrationNumber}
              </span>
              {vehicle.vic && (
                <span className="text-sm font-mono text-emerald-400/90">
                  {vehicle.vic}
                </span>
              )}
              <StatusDot
                tone={statusToneFromLabel(vehicle.status)}
                label={vehicle.status}
              />
              {isLead && (
                <StatusDot tone="ok" label={t("marshal.lead")} />
              )}
              {coach.blocked && (
                <span className="inline-flex items-center gap-1 text-[12px] font-medium text-amber-200">
                  <ShieldAlert className="w-3.5 h-3.5" />
                  {t("marshal.blocked")}
                </span>
              )}
            </div>

            <div className="flex items-center gap-3 mt-1.5 text-meta flex-wrap">
              <span className="flex items-center gap-1">
                <Bus className="w-3.5 h-3.5" />
                {vehicle.make} {vehicle.model} · {vehicle.seatingCapacity} seats
              </span>
              {vehicle.routeOrigin && vehicle.routeDestination && (
                <span className="flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5" />
                  {vehicle.routeOrigin} to {vehicle.routeDestination}
                </span>
              )}
              {vehicle.driverName ? (
                <span className="flex items-center gap-1">
                  <User className="w-3.5 h-3.5" />
                  {vehicle.driverName}
                </span>
              ) : (
                <span className="flex items-center gap-1 text-amber-400">
                  <User className="w-3.5 h-3.5" />
                  {t("marshal.no_driver")}
                </span>
              )}
            </div>

            <div
              className={`mt-2.5 flex items-start gap-1.5 text-[13px] rounded-xl px-3 py-2 ${
                coach.blocked
                  ? "bg-amber-950/40 text-amber-100 border border-amber-800/40"
                  : isLead
                    ? "bg-emerald-950/30 text-emerald-100 border border-emerald-800/30"
                    : "bg-white/[0.03] text-zinc-400 border border-white/[0.04]"
              }`}
            >
              {coach.blocked ? (
                <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
              ) : (
                <Sparkles className="w-4 h-4 shrink-0 mt-0.5 text-emerald-400" />
              )}
              <span className="leading-snug">{coach.coachLine}</span>
            </div>
          </div>
        </div>

        <div className="mt-3.5 pt-3 border-t border-white/[0.06] flex items-center gap-2 flex-wrap">
          {coach.primary && (
            <button
              type="button"
              onClick={() => {
                if (coach.primary === "delay") setShowDelay(true);
                else if (coach.primary === "breakdown") setShowBreakdown(true);
                else if (coach.primary) void handle(coach.primary);
              }}
              disabled={coach.blocked || pending === coach.primary}
              title={
                coach.blocked
                  ? coach.blockReasons[0]
                  : coach.primaryHint ?? undefined
              }
              className={`min-h-12 px-5 py-3 rounded-xl text-sm font-bold flex items-center gap-2 disabled:opacity-40 touch-manipulation ${
                coach.blocked
                  ? "bg-zinc-800 text-zinc-400 border border-zinc-700"
                  : "bg-emerald-600 hover:bg-emerald-500 text-white border border-emerald-500"
              }`}
            >
              {pending === coach.primary ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <PrimaryIcon className="w-4 h-4" />
              )}
              {primaryLabel}
            </button>
          )}

          {coach.secondary.includes("depart") && vehicle.status === "Loading" && (
            <ActionButton
              onClick={() => handle("depart")}
              pending={pending === "depart"}
              icon={Play}
              label={t("marshal.depart")}
              color="blue"
              disabled={coach.blocked}
            />
          )}

          {coach.secondary.includes("delay") && !isDeparted && (
            <ActionButton
              onClick={() => setShowDelay(true)}
              pending={pending === "delay"}
              icon={AlertTriangle}
              label={t("marshal.delay")}
              color="amber"
            />
          )}

          {coach.secondary.includes("breakdown") && !isDeparted && (
            <ActionButton
              onClick={() => setShowBreakdown(true)}
              pending={pending === "breakdown"}
              icon={Wrench}
              label={t("marshal.breakdown")}
              color="red"
            />
          )}

          {coach.secondary.includes("reset_to_waiting") &&
            vehicle.status === "Loading" && (
              <ActionButton
                onClick={() => handle("reset_to_waiting")}
                pending={pending === "reset_to_waiting"}
                icon={RotateCcw}
                label={t("marshal.cancel_load")}
                color="zinc"
              />
            )}
        </div>
      </div>

      {showDelay && (
        <DelayReasonModal
          registrationNumber={vehicle.registrationNumber}
          onCancel={() => setShowDelay(false)}
          onConfirm={handleDelayConfirm}
        />
      )}

      {showBreakdown && (
        <BreakdownModal
          registrationNumber={vehicle.registrationNumber}
          onCancel={() => setShowBreakdown(false)}
          onConfirm={handleBreakdownConfirm}
        />
      )}
    </>
  );
}

function ActionButton({
  onClick,
  pending,
  icon: Icon,
  label,
  color,
  disabled,
}: {
  onClick: () => void;
  pending: boolean;
  icon: React.ElementType;
  label: string;
  color: "emerald" | "blue" | "amber" | "red" | "zinc";
  disabled?: boolean;
}) {
  const styles: Record<string, string> = {
    emerald: "bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-600",
    blue: "bg-sky-600 hover:bg-sky-700 text-white border-sky-600",
    amber:
      "bg-amber-950/40 hover:bg-amber-950/60 text-amber-200 border-amber-800",
    red: "bg-red-950/40 hover:bg-red-950/60 text-red-200 border-red-800",
    zinc: "bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border-zinc-700",
  };

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={pending || disabled}
      className={`min-h-12 px-4 py-3 rounded-xl border text-sm font-semibold flex items-center gap-2 disabled:opacity-50 touch-manipulation ${styles[color]}`}
    >
      {pending ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : (
        <Icon className="w-4 h-4" />
      )}
      <span>{label}</span>
    </button>
  );
}
