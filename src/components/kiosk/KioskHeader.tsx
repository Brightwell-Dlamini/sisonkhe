"use client";

import {
  Radio,
  Calculator,
  ShieldAlert,
  RefreshCw,
  Volume2,
  VolumeX,
  Maximize2,
} from "lucide-react";
import BrandMark from "@/components/common/BrandMark";
import type { KioskSnapshot } from "@/lib/public/kiosk";
import LiveClock from "./LiveClock";

interface Props {
  snapshot: KioskSnapshot;
  onRegionChange: (region: string) => void;
  onRefresh: () => void;
  onOpenFareCalculator: () => void;
  onOpenLostProperty: () => void;
  onToggleFullscreen?: () => void;
  voiceEnabled: boolean;
  voiceSupported: boolean;
  onToggleVoice: () => void;
}

export default function KioskHeader({
  snapshot,
  onRegionChange,
  onRefresh,
  onOpenFareCalculator,
  onOpenLostProperty,
  onToggleFullscreen,
  voiceEnabled,
  voiceSupported,
  onToggleVoice,
}: Props) {
  const config = snapshot.regionConfig;

  return (
    <header className="kiosk-glass sticky top-0 z-30 rounded-2xl border border-white/[0.06]">
      <div className="px-4 sm:px-5 py-3 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <BrandMark size="sm" showText={false} className="shrink-0 shadow-[0_0_24px_-4px_rgba(16,185,129,0.35)]" />
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-mono text-[10px] font-black uppercase tracking-[0.2em] text-emerald-400">
                Sisonkhe In Transit
              </span>
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/30">
                <span className="w-1 h-1 rounded-full bg-emerald-400 kiosk-dot" />
                <span className="font-mono text-[9px] font-black uppercase tracking-widest text-emerald-400">
                  Live
                </span>
              </span>
            </div>
            <h1 className="kiosk-destination text-base sm:text-lg text-white truncate mt-0.5">
              {config?.terminalName ?? `${snapshot.region} Terminal`}
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-1 p-0.5 rounded-xl bg-zinc-900/60 border border-white/[0.05] overflow-x-auto scrollbar-none">
          {snapshot.regions.map((region) => {
            const active = snapshot.region === region;
            return (
              <button
                key={region}
                onClick={() => onRegionChange(region)}
                className={`px-3 py-1.5 rounded-lg font-mono text-[11px] font-black uppercase tracking-wider whitespace-nowrap cursor-pointer transition-all ${
                  active
                    ? "bg-emerald-500 text-black shadow-[0_0_20px_-6px_rgba(16,185,129,0.6)]"
                    : "text-zinc-500 hover:text-white"
                }`}
              >
                {region}
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <LiveClock variant="compact" />

          <div className="w-px h-8 bg-white/[0.06] mx-1 hidden sm:block" />

          {voiceSupported && (
            <IconAction
              icon={voiceEnabled ? Volume2 : VolumeX}
              label={voiceEnabled ? "Mute" : "Voice"}
              onClick={onToggleVoice}
              active={voiceEnabled}
            />
          )}

          <IconAction
            icon={Calculator}
            label="Fares"
            onClick={onOpenFareCalculator}
          />

          <IconAction
            icon={ShieldAlert}
            label="Lost"
            onClick={onOpenLostProperty}
            tone="danger"
          />

          {onToggleFullscreen && (
            <IconAction
              icon={Maximize2}
              label="Fullscreen"
              onClick={onToggleFullscreen}
            />
          )}

          <IconAction icon={RefreshCw} label="Refresh" onClick={onRefresh} />
        </div>
      </div>
    </header>
  );
}

function IconAction({
  icon: Icon,
  label,
  onClick,
  tone = "neutral",
  active = false,
}: {
  icon: React.ElementType;
  label: string;
  onClick: () => void;
  tone?: "neutral" | "danger";
  active?: boolean;
}) {
  const base =
    "p-2 rounded-lg border transition-all cursor-pointer flex items-center justify-center";
  const styles =
    tone === "danger"
      ? "bg-red-500/10 border-red-500/20 text-red-400 hover:bg-red-500/20"
      : active
      ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-400"
      : "bg-zinc-900/60 border-white/[0.06] text-zinc-400 hover:text-white hover:border-white/[0.15]";

  return (
    <button
      onClick={onClick}
      className={`${base} ${styles}`}
      title={label}
      aria-label={label}
    >
      <Icon className="w-4 h-4" />
    </button>
  );
}
