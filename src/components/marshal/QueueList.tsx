/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

"use client";

import { useMemo, useState } from "react";
import { Search, Inbox } from "lucide-react";
import type { MarshalVehicle } from "@/lib/marshal/queries";
import type { DispatchAction } from "@/lib/marshal/dispatch";
import QueueRow from "./QueueRow";

interface Props {
  vehicles: MarshalVehicle[];
  onDispatch: (
    reg: string,
    action: DispatchAction,
    reason?: string
  ) => Promise<{ success: boolean; error?: string; rankFeeWritten?: boolean }>;
  showToast: (msg: string) => void;
}

export default function QueueList({ vehicles, onDispatch, showToast }: Props) {
  const [search, setSearch] = useState("");

  const sorted = useMemo(() => {
    // Queued first (position 1, 2, 3...), then unqueued (position 0), then non-Waiting
    return [...vehicles].sort((a, b) => {
      const aPos = a.currentQueuePosition;
      const bPos = b.currentQueuePosition;

      // Both queued: sort by position
      if (aPos > 0 && bPos > 0) return aPos - bPos;
      // Queued beats unqueued
      if (aPos > 0 && bPos === 0) return -1;
      if (bPos > 0 && aPos === 0) return 1;
      // Both unqueued: alphabetical
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
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
        <input
          type="text"
          placeholder="Search by plate, VIC, route, or driver…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl pl-10 pr-4 py-2.5 text-xs text-zinc-900 dark:text-white focus:outline-none focus:border-emerald-500"
        />
      </div>

      {filtered.length === 0 ? (
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-10 text-center">
          <Inbox className="w-8 h-8 mx-auto text-zinc-300 dark:text-zinc-700 mb-2" />
          <div className="text-sm font-bold text-zinc-700 dark:text-zinc-300">
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
              showToast={showToast}
            />
          ))}
        </div>
      )}
    </div>
  );
}
