"use client";

import { useMemo, useState } from "react";
import { Radio } from "lucide-react";
import type {
  KioskSnapshot,
  PublicVehicle,
  PublicRoute,
} from "@/lib/public/kiosk";
import DepartureCard from "./DepartureCard";
import EmptyRegion from "./EmptyRegion";
import HeadingTodayHub from "./HeadingTodayHub";
import NextBoardingCard from "./NextBoardingCard";

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
  const [destinationFilter, setDestinationFilter] = useState<string | null>(
    null
  );

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

  const filtered = useMemo(() => {
    let routes = snapshot.routes;

    if (destinationFilter) {
      const d = destinationFilter.toLowerCase();
      routes = routes.filter((r) => r.destination.toLowerCase() === d);
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      routes = routes.filter((r) => {
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
    }

    return routes;
  }, [snapshot.routes, grouped, search, destinationFilter]);

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

  const nextBoarding = useMemo(() => {
    for (const route of snapshot.routes) {
      const vehicles = grouped.get(route.id) ?? [];
      const lead = vehicles.find((v) => v.status === "Loading");
      if (lead) return { route, vehicle: lead };
    }
    for (const route of snapshot.routes) {
      const vehicles = grouped.get(route.id) ?? [];
      if (vehicles[0]) return { route, vehicle: vehicles[0] };
    }
    return null;
  }, [snapshot.routes, grouped]);

  const activeCorridorCount = useMemo(() => {
    return snapshot.routes.filter((r) => (grouped.get(r.id) ?? []).length > 0)
      .length;
  }, [snapshot.routes, grouped]);

  const handleSpeak = (route: PublicRoute, v?: PublicVehicle) => {
    if (!onSpeak) return;
    const text = v
      ? `Attention commuters. Vehicle ${v.registrationNumber}, bound for ${route.destination}. Bay ${v.loadingBay ?? "unknown"}. Status: ${v.status}.`
      : `Route from ${route.origin} to ${route.destination}.`;
    onSpeak(text);
  };

  return (
    <div className="space-y-5">
      <HeadingTodayHub
        snapshot={snapshot}
        selectedDestination={destinationFilter}
        onSelectDestination={setDestinationFilter}
        activeCorridorCount={activeCorridorCount}
        search={search}
        onSearchChange={setSearch}
      />

      {nextBoarding &&
        (!destinationFilter ||
          nextBoarding.route.destination.toLowerCase() ===
            destinationFilter.toLowerCase()) &&
        (!search.trim() ||
          nextBoarding.route.destination
            .toLowerCase()
            .includes(search.toLowerCase()) ||
          nextBoarding.route.origin
            .toLowerCase()
            .includes(search.toLowerCase()) ||
          nextBoarding.vehicle.registrationNumber
            .toLowerCase()
            .includes(search.toLowerCase())) && (
          <NextBoardingCard
            route={nextBoarding.route}
            vehicle={nextBoarding.vehicle}
          />
        )}

      <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.15em] text-zinc-500">
        <Radio className="w-3 h-3 text-emerald-500" />
        <span>
          Live transit departures
          {activeCorridorCount > 0
            ? ` · ${activeCorridorCount} corridor${activeCorridorCount === 1 ? "" : "s"}`
            : ""}
          {destinationFilter ? ` · to ${destinationFilter}` : ""}
        </span>
        {destinationFilter && (
          <button
            type="button"
            onClick={() => setDestinationFilter(null)}
            className="ml-1 text-emerald-400 hover:text-emerald-300 normal-case tracking-normal"
          >
            Clear
          </button>
        )}
      </div>

      {sortedRoutes.length === 0 ? (
        <EmptyRegion region={snapshot.region} />
      ) : (
        <div className="space-y-3">
          {sortedRoutes.map((route, i) => {
            const vehicles = grouped.get(route.id) ?? [];
            return (
              <DepartureCard
                key={route.id}
                route={route}
                vehicles={vehicles}
                onSpeak={() => handleSpeak(route, vehicles[0])}
                voiceEnabled={voiceEnabled}
                prominent={vehicles[0]?.status === "Loading"}
                index={i}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
