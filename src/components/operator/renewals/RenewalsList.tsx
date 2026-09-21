/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

"use client";

import { Loader2, Inbox } from "lucide-react";
import type { RenewalRow } from "@/lib/renewals/queries";
import RenewalStatusBadge from "./RenewalStatusBadge";

interface Props {
  renewals: RenewalRow[];
  loading: boolean;
}

export default function RenewalsList({ renewals, loading }: Props) {
  if (loading && renewals.length === 0) {
    return (
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl flex items-center justify-center py-16">
        <Loader2 className="w-5 h-5 animate-spin text-amber-600" />
      </div>
    );
  }

  if (renewals.length === 0) {
    return (
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-12 text-center">
        <Inbox className="w-8 h-8 mx-auto text-zinc-300 dark:text-zinc-700 mb-2" />
        <div className="text-sm font-bold text-zinc-700 dark:text-zinc-300">
          No renewal requests yet
        </div>
        <div className="text-xs text-zinc-500 mt-1">
          Click "Request Renewal" to submit one for a vehicle in your fleet.
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {renewals.map((r) => (
        <div
          key={r.id}
          className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 space-y-3"
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-mono font-black text-zinc-900 dark:text-white">
                  {r.vehicleReg}
                </span>
                {r.fleetId && (
                  <span className="text-[10px] font-mono text-amber-600 dark:text-amber-400">
                    {r.fleetId}
                  </span>
                )}
                <RenewalStatusBadge status={r.status} />
              </div>
              <div className="text-[11px] text-zinc-500 mt-1">
                Submitted {r.requestDate}
                {r.approvalDate && ` • Processed ${r.approvalDate}`}
              </div>
            </div>
            {r.renewalFeeAmountSzl !== null && (
              <div className="text-right shrink-0">
                <div className="text-[10px] uppercase font-bold text-zinc-400">
                  Fee
                </div>
                <div className="font-mono font-black text-zinc-900 dark:text-white text-sm">
                  E {r.renewalFeeAmountSzl.toFixed(2)}
                </div>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-[11px]">
            <div className="bg-zinc-50 dark:bg-zinc-950 p-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800">
              <div className="text-[10px] uppercase text-zinc-400 font-bold">
                Reason
              </div>
              <div className="text-zinc-700 dark:text-zinc-300 mt-0.5">
                {r.reasonForRenewal}
              </div>
            </div>
            <div className="bg-zinc-50 dark:bg-zinc-950 p-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800">
              <div className="text-[10px] uppercase text-zinc-400 font-bold">
                Permit Status
              </div>
              <div className="text-zinc-700 dark:text-zinc-300 mt-0.5 font-mono">
                {r.newPermitNumber ?? r.currentPermitNumber ?? "—"}
                {r.permitExpiryDate && ` (exp ${r.permitExpiryDate})`}
              </div>
            </div>
          </div>

          {r.renewalNotes && (
            <div className="text-[11px] text-zinc-500 italic border-t border-zinc-100 dark:border-zinc-800 pt-2">
              {r.renewalNotes}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
