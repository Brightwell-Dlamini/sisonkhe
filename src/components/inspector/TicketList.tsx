/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

"use client";

import { Loader2, Inbox } from "lucide-react";
import type { InspectorTicket } from "@/lib/inspector/queries";

interface Props {
  tickets: InspectorTicket[];
  loading: boolean;
}

const STATUS_COLORS: Record<string, string> = {
  Issued: "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300",
  Paid: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300",
  Synchronized:
    "bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300",
  Challenged:
    "bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-300",
};

export default function TicketList({ tickets, loading }: Props) {
  if (loading && tickets.length === 0) {
    return (
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl flex items-center justify-center py-16">
        <Loader2 className="w-5 h-5 animate-spin text-red-600" />
      </div>
    );
  }

  if (tickets.length === 0) {
    return (
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl text-center py-16 px-4">
        <Inbox className="w-8 h-8 mx-auto text-zinc-300 dark:text-zinc-700 mb-2" />
        <div className="text-sm font-bold text-zinc-700 dark:text-zinc-300">
          No tickets issued yet
        </div>
        <div className="text-xs text-zinc-500 mt-1">
          Tickets you issue will appear here.
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl overflow-hidden">
      <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
        {tickets.map((t) => (
          <div key={t.id} className="p-4 space-y-2">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-mono font-black text-sm text-zinc-900 dark:text-white">
                    {t.ticketNumber}
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${STATUS_COLORS[t.status] ?? ""}`}
                  >
                    {t.status}
                  </span>
                </div>
                <div className="text-xs text-zinc-500 font-mono mt-0.5">
                  {new Date(t.timestamp).toLocaleString("en-GB")}
                </div>
              </div>
              <div className="text-right shrink-0">
                <div className="text-lg font-black font-mono text-zinc-900 dark:text-white">
                  E {t.amountSzl.toFixed(2)}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              <div className="bg-zinc-50 dark:bg-zinc-950 p-2.5 rounded-lg">
                <div className="text-[9px] uppercase font-bold text-zinc-400">
                  Vehicle
                </div>
                <div className="font-mono font-bold text-zinc-900 dark:text-white">
                  {t.vehicleReg}
                </div>
              </div>
              <div className="bg-zinc-50 dark:bg-zinc-950 p-2.5 rounded-lg">
                <div className="text-[9px] uppercase font-bold text-zinc-400">
                  Offence
                </div>
                <div className="font-bold text-zinc-900 dark:text-white">
                  {t.offenseType}
                </div>
              </div>
            </div>

            {t.location && (
              <div className="text-[11px] text-zinc-500">
                <strong>Location:</strong> {t.location}
              </div>
            )}
            {t.notes && (
              <div className="text-[11px] text-zinc-500 italic">
                {t.notes}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
