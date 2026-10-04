"use client";

import { Flame, Search, X } from "lucide-react";
import type { KioskSnapshot, PublicRoute, PublicVehicle } from "@/lib/public/kiosk";

interface Props {
  snapshot: KioskSnapshot;
  selectedDestination: string | null;
  onSelectDestination: (destination: string | null) => void;
  activeCorridorCount: number;
  search: string;
  onSearchChange: (value: string) => void;
}

export default function HeadingTodayHub({
  snapshot,
  selectedDestination,
  onSelectDestination,
  activeCorridorCount,
  search,
  onSearchChange,
}: Props) {
  const popular = buildPopularDestinations(snapshot.routes);
  const announcement = cleanAnnouncement(
    snapshot.regionConfig?.announcement?.trim() ||
      defaultAnnouncement(snapshot)
  );
  const rankStatus = deriveRankStatus(snapshot.vehicles);

  return (
    <section className="relative overflow-hidden rounded-2xl border border-emerald-500/20 bg-gradient-to-b from-emerald-950/40 via-[#0a1210] to-[#0A0A0A] p-5 sm:p-7">
      <div className="pointer-events-none absolute -top-24 left-1/2 h-48 w-[80%] -translate-x-1/2 rounded-full bg-emerald-500/10 blur-3xl" />

      <div className="relative">
        <div className="flex items-center gap-2 mb-3">
          <span className="inline-flex items-center gap-1.5 font-mono text-[10px] font-black uppercase tracking-[0.2em] text-emerald-400/90">
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400" />
            </span>
            Real-time commuter transit hub
          </span>
        </div>

        <h1 className="font-space text-2xl sm:text-[2.35rem] font-bold tracking-[-0.03em] text-white uppercase leading-[1.08]">
          Where are you heading today?
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-zinc-400">
          Check live kombi departures, track the rank queue, and see your exact
          loading bay in seconds.
        </p>

        {/* Full-width search inside the section */}
        <div className="relative mt-5">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 pointer-events-none" />
          <input
            type="text"
            placeholder="Search destination, route, or vehicle plate…"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full bg-black/40 border border-white/[0.1] rounded-xl pl-10 pr-10 py-3.5 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/20 transition-all font-mono"
          />
          {search && (
            <button
              type="button"
              onClick={() => onSearchChange("")}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white"
              aria-label="Clear search"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1 font-mono text-[10px] font-black uppercase tracking-[0.15em] text-amber-400/90 shrink-0">
            <Flame className="w-3 h-3" />
            Popular:
          </span>

          <Chip
            active={selectedDestination === null && !search}
            onClick={() => {
              onSelectDestination(null);
              onSearchChange("");
            }}
            fire
          >
            All Routes
          </Chip>

          {popular.map((dest) => (
            <Chip
              key={dest}
              active={selectedDestination === dest}
              onClick={() => {
                const next = selectedDestination === dest ? null : dest;
                onSelectDestination(next);
                if (next) onSearchChange("");
              }}
            >
              {dest}
            </Chip>
          ))}
        </div>

        <div className="mt-5 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 rounded-xl border border-emerald-500/15 bg-black/30 px-3.5 py-2.5">
          <div className="flex items-center gap-2 shrink-0">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
            <span className="font-mono text-[11px] font-bold text-emerald-300">
              Rank Status: {rankStatus}
            </span>
          </div>
          <span className="hidden sm:inline text-zinc-700">·</span>
          <p className="text-[12px] text-zinc-400 leading-snug min-w-0">
            <span className="font-mono text-[10px] font-black uppercase tracking-wider text-zinc-500 mr-1.5">
              Announcement:
            </span>
            {announcement}
          </p>
          {activeCorridorCount > 0 && (
            <>
              <span className="hidden sm:inline text-zinc-700">·</span>
              <span className="font-mono text-[10px] text-emerald-500/80 shrink-0 whitespace-nowrap">
                {activeCorridorCount} corridor
                {activeCorridorCount === 1 ? "" : "s"} active
              </span>
            </>
          )}
        </div>
      </div>
    </section>
  );
}

function Chip({
  children,
  active,
  onClick,
  fire,
}: {
  children: React.ReactNode;
  active: boolean;
  onClick: () => void;
  fire?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-3 py-1.5 rounded-full text-[12px] font-semibold transition-all border ${
        active
          ? fire
            ? "bg-emerald-500 text-black border-emerald-400 shadow-[0_0_20px_-4px_rgba(16,185,129,0.5)]"
            : "bg-white text-black border-white"
          : "bg-white/[0.04] text-zinc-300 border-white/[0.08] hover:bg-white/[0.08] hover:text-white"
      }`}
    >
      {fire && active ? (
        <span className="inline-flex items-center gap-1">
          <Flame className="w-3 h-3" />
          {children}
        </span>
      ) : (
        children
      )}
    </button>
  );
}

/** Strip leading "Announcement:" if the DB string already includes it. */
function cleanAnnouncement(raw: string): string {
  return raw.replace(/^\s*announcement\s*:\s*/i, "").trim();
}

function buildPopularDestinations(routes: PublicRoute[]): string[] {
  const popular = routes
    .filter((r) => r.isPopular)
    .map((r) => r.destination);
  const uniquePopular = [...new Set(popular)];
  if (uniquePopular.length >= 3) return uniquePopular.slice(0, 8);

  const counts = new Map<string, number>();
  for (const r of routes) {
    counts.set(r.destination, (counts.get(r.destination) ?? 0) + 1);
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([d]) => d)
    .slice(0, 8);
}

function deriveRankStatus(vehicles: PublicVehicle[]): string {
  if (vehicles.length === 0) return "Standby";
  if (vehicles.some((v) => v.status === "Delayed")) return "Delays reported";
  return "Normal Service";
}

function defaultAnnouncement(snapshot: KioskSnapshot): string {
  const loading = snapshot.vehicles.find((v) => v.status === "Loading");
  if (loading?.routeDestination) {
    return `${snapshot.regionConfig?.terminalName ?? snapshot.region} — vehicle ${loading.registrationNumber} now loading for ${loading.routeDestination}${loading.loadingBay ? ` on ${loading.loadingBay}` : ""}. Safe travel!`;
  }
  return `Welcome to ${snapshot.regionConfig?.terminalName ?? snapshot.region}. Select a destination above to filter live departures.`;
}
