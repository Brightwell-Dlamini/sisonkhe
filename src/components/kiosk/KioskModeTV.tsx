/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Fullscreen TV broadcast table with auto-rotation.
 */

"use client";

import { useState, useEffect } from "react";
import { Tv, Maximize2, Minimize2 } from "lucide-react";
import type { KioskSnapshot } from "@/lib/public/kiosk";

interface Props {
  snapshot: KioskSnapshot;
}

const PAGE_SIZE = 8;
const ROTATE_MS = 10000;

export default function KioskModeTV({ snapshot }: Props) {
  const [pageIndex, setPageIndex] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const totalPages = Math.max(1, Math.ceil(snapshot.vehicles.length / PAGE_SIZE));
  const paged = snapshot.vehicles.slice(
    pageIndex * PAGE_SIZE,
    (pageIndex + 1) * PAGE_SIZE
  );

  // Reset page if data shrinks
  useEffect(() => {
    if (pageIndex >= totalPages) setPageIndex(0);
  }, [totalPages, pageIndex]);

  // Auto-rotate
  useEffect(() => {
    if (totalPages <= 1) return;
    const timer = setInterval(() => {
      setPageIndex((prev) => (prev + 1) % totalPages);
    }, ROTATE_MS);
    return () => clearInterval(timer);
  }, [totalPages]);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  return (
    <div
      className={`bg-[#0A0A0A] text-white border-2 border-zinc-800 rounded-3xl p-6 shadow-2xl ${
        isFullscreen ? "fixed inset-0 z-50 rounded-none" : ""
      }`}
    >
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-zinc-800 mb-6">
        <div className="flex items-center gap-3">
          <div className="px-2.5 py-1 rounded-lg bg-amber-500 text-black font-black text-[10px] tracking-widest font-mono">
            LIVE TV BOARD
          </div>
          <h2 className="text-lg font-black font-space uppercase text-white">
            {snapshot.regionConfig?.terminalName ?? `${snapshot.region} Terminal`}
          </h2>
        </div>
        <div className="flex items-center gap-3">
          {totalPages > 1 && (
            <span className="px-3 py-1 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 font-mono text-xs font-bold">
              PAGE {pageIndex + 1} / {totalPages}
            </span>
          )}
          <button
            onClick={toggleFullscreen}
            className="p-2 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-800"
          >
            {isFullscreen ? (
              <Minimize2 className="w-4 h-4" />
            ) : (
              <Maximize2 className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>

      {/* Table */}
      {snapshot.vehicles.length === 0 ? (
        <div className="py-20 text-center text-zinc-500 text-sm">
          No vehicles scheduled in this region.
        </div>
      ) : (
        <div className="min-w-[650px]">
          <div className="grid grid-cols-12 text-[11px] uppercase font-mono text-zinc-400 font-bold pb-3 border-b border-zinc-800 tracking-wider">
            <div className="col-span-2">STATUS</div>
            <div className="col-span-4">DESTINATION</div>
            <div className="col-span-2">VEHICLE</div>
            <div className="col-span-2 text-center">BAY</div>
            <div className="col-span-2 text-right">QUEUE</div>
          </div>

          <div className="divide-y divide-zinc-800">
            {paged.map((v) => (
              <div
                key={v.registrationNumber}
                className="grid grid-cols-12 py-3.5 items-center hover:bg-white/5 border-b border-zinc-850"
              >
                <div className="col-span-2">
                  <span
                    className={`inline-block px-2.5 py-0.5 rounded text-[10px] font-black uppercase tracking-wider ${
                      v.status === "Loading"
                        ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500 animate-pulse"
                        : v.status === "Waiting" && v.currentQueuePosition === 1
                        ? "bg-blue-500/20 text-blue-400 border border-blue-500"
                        : v.status === "Delayed"
                        ? "bg-amber-500/20 text-amber-400 border border-amber-500"
                        : "bg-zinc-800 text-zinc-400"
                    }`}
                  >
                    {v.status === "Loading" ? "BOARDING" : v.status.toUpperCase()}
                  </span>
                </div>
                <div className="col-span-4 text-white font-black uppercase font-space truncate">
                  {v.routeOrigin && v.routeDestination
                    ? `${v.routeOrigin} → ${v.routeDestination}`
                    : "—"}
                </div>
                <div className="col-span-2 text-zinc-300 font-bold font-mono">
                  {v.registrationNumber}
                </div>
                <div className="col-span-2 text-center">
                  <span className="px-2.5 py-1 rounded-lg bg-zinc-800 border border-zinc-700 font-bold text-xs text-white">
                    {v.loadingBay ?? "—"}
                  </span>
                </div>
                <div className="col-span-2 text-right font-mono font-bold text-emerald-400">
                  {v.currentQueuePosition > 0 ? `#${v.currentQueuePosition}` : "—"}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
