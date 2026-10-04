"use client";

import { useEffect, useState } from "react";
import {
  Calculator,
  ShieldAlert,
  RefreshCw,
  Volume2,
  VolumeX,
  Maximize2,
  Minimize2,
  MoreHorizontal,
} from "lucide-react";
import BrandMark from "@/components/common/BrandMark";
import type { KioskSnapshot } from "@/lib/public/kiosk";
import LiveClock from "./LiveClock";

const REGION_HINT: Record<string, string> = {
  Hhohho: "Mbabane",
  Manzini: "Manzini Hub",
  Lubombo: "Siteki",
  Shiselweni: "Nhlangano",
};

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
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [toolsOpen, setToolsOpen] = useState(false);

  useEffect(() => {
    const onFs = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", onFs);
    return () => document.removeEventListener("fullscreenchange", onFs);
  }, []);

  const compactTools = isFullscreen;

  return (
    <header className="kiosk-glass sticky top-0 z-30 rounded-2xl border border-white/[0.06]">
      <div className="px-4 sm:px-5 py-3 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <BrandMark
            size="sm"
            showText={false}
            className="shrink-0 shadow-[0_0_24px_-4px_rgba(16,185,129,0.35)]"
          />
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
            <h1 className="font-space text-base sm:text-lg font-bold text-white truncate mt-0.5">
              {config?.terminalName ?? `${snapshot.region} Terminal`}
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-1 p-0.5 rounded-xl bg-zinc-900/60 border border-white/[0.05] overflow-x-auto scrollbar-none">
          {snapshot.regions.map((region) => {
            const active = snapshot.region === region;
            const hint = REGION_HINT[region];
            return (
              <button
                key={region}
                onClick={() => onRegionChange(region)}
                className={`px-3 py-1.5 rounded-lg font-mono text-[11px] font-black uppercase tracking-wider whitespace-nowrap cursor-pointer transition-all ${
                  active
                    ? "bg-emerald-500 text-black shadow-[0_0_20px_-6px_rgba(16,185,129,0.6)]"
                    : "text-zinc-500 hover:text-white"
                }`}
                title={hint}
              >
                <span className="block leading-none">{region}</span>
                {active && hint && (
                  <span className="block mt-0.5 text-[8px] font-bold tracking-wide opacity-70 normal-case">
                    {hint}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-2 shrink-0 relative">
          <LiveClock variant="compact" />

          <div className="w-px h-8 bg-white/[0.06] mx-1 hidden sm:block" />

          {/* Always-visible: refresh + fullscreen */}
          <IconAction icon={RefreshCw} label="Refresh" onClick={onRefresh} />
          {onToggleFullscreen && (
            <IconAction
              icon={isFullscreen ? Minimize2 : Maximize2}
              label={isFullscreen ? "Exit fullscreen" : "Fullscreen"}
              onClick={onToggleFullscreen}
            />
          )}

          {/* Secondary tools — collapsed in fullscreen */}
          {compactTools ? (
            <>
              <IconAction
                icon={MoreHorizontal}
                label="Tools"
                onClick={() => setToolsOpen((o) => !o)}
                active={toolsOpen}
              />
              {toolsOpen && (
                <div className="absolute right-0 top-full mt-2 z-40 flex items-center gap-1.5 p-1.5 rounded-xl bg-zinc-950 border border-white/[0.1] shadow-xl">
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
                    onClick={() => {
                      setToolsOpen(false);
                      onOpenFareCalculator();
                    }}
                  />
                  <IconAction
                    icon={ShieldAlert}
                    label="Lost"
                    onClick={() => {
                      setToolsOpen(false);
                      onOpenLostProperty();
                    }}
                    tone="danger"
                  />
                </div>
              )}
            </>
          ) : (
            <>
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
            </>
          )}
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
      type="button"
    >
      <Icon className="w-4 h-4" />
    </button>
  );
}
