"use client";

import { useMemo, useState } from "react";
import { Search, X } from "lucide-react";
import type {
  KioskSnapshot,
  PublicVehicle,
  PublicRoute,
} from "@/lib/public/kiosk";
import DepartureCard from "./DepartureCard";
import EmptyRegion from "./EmptyRegion";

interface Props {
  snapshot: KioskSnapshot;
  onSpeak?: (text: string) => void;
  voiceEnabled?: boolean;
}

export default function KioskModeTransit({
  snapshot,
  onSpeak,
  voiceEnabled,
}: Props) {
  const [search, setSearch] = useState("");

  // Group vehicles by route
  const grouped = useMemo(() => {
    const map = new Map<string, PublicVehicle[]>();
    for (const v of snapshot.vehicles) {
      if (!v.routeId) continue;
      const list = map.get(v.routeId) ?? [];
      list.push(v);
      map.set(v.routeId, list);
    }
    for (const list of map.values()) {
      list.sort((a, b) => {
        const aPos = a.currentQueuePosition > 0 ? a.currentQueuePosition : 999;
        const bPos = b.currentQueuePosition > 0 ? b.currentQueuePosition : 999;
        return aPos - bPos;
      });
    }
    return map;
  }, [snapshot.vehicles]);

  // Filter routes by search
  const filtered = useMemo(() => {
    if (!search.trim()) return snapshot.routes;
    const q = search.toLowerCase();
    return snapshot.routes.filter((r) => {
      if (
        r.origin.toLowerCase().includes(q) ||
        r.destination.toLowerCase().includes(q) ||
        r.region.toLowerCase().includes(q)
      )
        return true;
      const vs = grouped.get(r.id) ?? [];
      return vs.some(
        (v) =>
          v.registrationNumber.toLowerCase().includes(q) ||
          (v.vic ?? "").toLowerCase().includes(q)
      );
    });
  }, [snapshot.routes, grouped, search]);

  // Sort routes so active ones (with vehicles) come first, then boarding first
  const sortedRoutes = useMemo(() => {
    return [...filtered].sort((a, b) => {
      const aV = grouped.get(a.id)?.[0];
      const bV = grouped.get(b.id)?.[0];
      const aBoarding = aV?.status === "Loading";
      const bBoarding = bV?.status === "Loading";
      if (aBoarding && !bBoarding) return -1;
      if (!aBoarding && bBoarding) return 1;
      const aHas = aV ? 1 : 0;
      const bHas = bV ? 1 : 0;
      return bHas - aHas;
    });
  }, [filtered, grouped]);

  const handleSpeak = (route: PublicRoute, v?: PublicVehicle) => {
    if (!onSpeak) return;
    const text = v
      ? `Attention commuters. Vehicle ${v.registrationNumber}, bound for ${route.destination}. Bay ${v.loadingBay ?? "unknown"}. Status: ${v.status}.`
      : `Route from ${route.origin} to ${route.destination}.`;
    onSpeak(text);
  };

  return (
    <div className="space-y-4">
      {/* Search bar */}
      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 pointer-events-none" />
        <input
          type="text"
          placeholder="Search destination, route, or vehicle plate…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full bg-zinc-900/60 border border-white/[0.06] rounded-xl pl-10 pr-10 py-3 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-emerald-500/40 transition-all font-mono"
        />
        {search && (
          <button
            onClick={() => setSearch("")}
            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {sortedRoutes.length === 0 ? (
        <EmptyRegion region={snapshot.region} />
      ) : (
        <div className="space-y-3">
          {sortedRoutes.map((route) => {
            const vehicles = grouped.get(route.id) ?? [];
            return (
              <DepartureCard
                key={route.id}
                route={route}
                vehicles={vehicles}
                onSpeak={() => handleSpeak(route, vehicles[0])}
                voiceEnabled={voiceEnabled}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
