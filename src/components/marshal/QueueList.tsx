/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

"use client";

import { useMemo, useState } from "react";
import { Search, Inbox } from "lucide-react";
import type { MarshalVehicle } from "@/lib/marshal/queries";
import type { DispatchAction } from "@/lib/marshal/dispatch";
import { rankCoach } from "@/lib/domain/rankCoach";
import QueueRow from "./QueueRow";

interface Props {
  vehicles: MarshalVehicle[];
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

export default function QueueList({
  vehicles,
  onDispatch,
  onReorder,
  showToast,
  onSelectVehicle,
}: Props) {
  const [search, setSearch] = useState("");

  const sorted = useMemo(() => {
    return [...vehicles].sort((a, b) => {
      const aCoach = rankCoach(a);
      const bCoach = rankCoach(b);

      const aPriority = aCoach.blocked ? 0 : a.status === "Delayed" ? 1 : 2;
      const bPriority = bCoach.blocked ? 0 : b.status === "Delayed" ? 1 : 2;

      if (aPriority !== bPriority) return aPriority - bPriority;

      const aPos = a.currentQueuePosition > 0 ? a.currentQueuePosition : 9999;
      const bPos = b.currentQueuePosition > 0 ? b.currentQueuePosition : 9999;

      if (aPos !== bPos) return aPos - bPos;
      return a.registrationNumber.localeCompare(b.registrationNumber);
    });
  }, [vehicles]);

  const filtered = useMemo(() => {
    if (!search.trim()) return sorted;
    const q = search.toLowerCase();
    return sorted.filter(
      (v) =>
        v.registrationNumber.toLowerCase().includes(q) ||
        (v.vic ?? "").toLowerCase().includes(q) ||
        (v.routeDestination ?? "").toLowerCase().includes(q) ||
        (v.routeOrigin ?? "").toLowerCase().includes(q) ||
        (v.driverName ?? "").toLowerCase().includes(q)
    );
  }, [sorted, search]);

  return (
    <div className="space-y-3">
      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
        <input
          type="text"
          placeholder="Search by plate, VIC, route, or driver…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full bg-white/[0.03] border border-white/[0.08] rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder:text-zinc-600 focus:outline-none focus:border-emerald-500/40"
        />
      </div>

      {filtered.length === 0 ? (
        <div className="bg-[#0F0F10] border border-white/[0.06] rounded-2xl p-10 text-center">
          <Inbox className="w-8 h-8 mx-auto text-zinc-600 mb-2" />
          <div className="text-sm font-bold text-zinc-300">
            {vehicles.length === 0
              ? "No vehicles assigned to your terminal"
              : "No matches"}
          </div>
          <div className="text-xs text-zinc-500 mt-1">
            {vehicles.length === 0
              ? "Contact your supervisor if this seems wrong."
              : "Try a different search."}
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((v) => (
            <QueueRow
              key={v.registrationNumber}
              vehicle={v}
              onDispatch={onDispatch}
              onReorder={onReorder}
              showToast={showToast}
              onSelectVehicle={onSelectVehicle}
            />
          ))}
        </div>
      )}
    </div>
  );
}
