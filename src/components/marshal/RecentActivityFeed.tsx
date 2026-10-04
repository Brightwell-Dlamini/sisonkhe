/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

"use client";

import { CheckCircle2, Clock } from "lucide-react";
import type { MarshalActivityItem } from "@/lib/marshal/queries";

interface Props {
  activity: MarshalActivityItem[];
}

export default function RecentActivityFeed({ activity }: Props) {
  return (
    <div className="bg-[#0F0F10] border border-white/[0.06] rounded-2xl p-5">
      <div className="flex items-center gap-2 pb-3 border-b border-white/[0.06]">
        <Clock className="w-4 h-4 text-zinc-400" />
        <h3 className="text-xs font-black uppercase tracking-wider text-white">
          Recent Activity
        </h3>
      </div>

      {activity.length === 0 ? (
        <div className="py-8 text-center text-xs text-zinc-500">
          No dispatches yet today.
        </div>
      ) : (
        <div className="divide-y divide-white/[0.06]">
          {activity.map((item) => (
            <div key={item.id} className="py-2.5 flex items-start gap-2.5">
              <div className="w-6 h-6 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-xs font-bold text-white">{item.vehicleReg}</div>
                <div className="text-[10px] text-zinc-500">
                  {item.triggerSource} · E{item.amountSzl.toFixed(2)}
                </div>
              </div>
              <div className="text-[10px] text-zinc-500 font-mono shrink-0">
                {new Date(item.timestamp).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
