/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

"use client";

import { Inbox } from "lucide-react";
import type { RenewalRow } from "@/lib/renewals/queries";
import RenewalStatusBadge from "@/components/operator/renewals/RenewalStatusBadge";

interface Props {
  renewals: RenewalRow[];
  isPending: boolean;
  onSelect: (r: RenewalRow) => void;
}

export default function PendingRenewalsTable({
  renewals,
  isPending,
  onSelect,
}: Props) {
  if (renewals.length === 0) {
    return (
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-12 text-center">
        <Inbox className="w-8 h-8 mx-auto text-zinc-300 dark:text-zinc-700 mb-2" />
        <div className="text-sm font-bold text-zinc-700 dark:text-zinc-300">
          No {isPending ? "pending" : ""} renewals
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-zinc-200 dark:border-zinc-800 text-left text-[10px] font-black uppercase tracking-wider text-zinc-400 bg-zinc-50/50 dark:bg-zinc-950/50">
              <th className="px-4 py-3">Request</th>
              <th className="px-4 py-3">Vehicle</th>
              <th className="px-4 py-3">Operator</th>
              <th className="px-4 py-3">Submitted</th>
              <th className="px-4 py-3">Fee Paid</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 w-24"></th>
            </tr>
          </thead>
          <tbody>
            {renewals.map((r) => (
              <tr
                key={r.id}
                className="border-b border-zinc-100 dark:border-zinc-850 hover:bg-zinc-50 dark:hover:bg-zinc-950/50"
              >
                <td className="px-4 py-3 font-mono text-[10px] text-zinc-500">
                  {r.id}
                </td>
                <td className="px-4 py-3 font-mono font-bold text-zinc-900 dark:text-white">
                  {r.vehicleReg}
                </td>
                <td className="px-4 py-3 text-zinc-700 dark:text-zinc-300">
                  {r.operator ?? "—"}
                </td>
                <td className="px-4 py-3 font-mono text-zinc-600 dark:text-zinc-400">
                  {r.requestDate}
                </td>
                <td className="px-4 py-3 text-right">
                  {r.renewalFeeAmountSzl !== null ? (
                    <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                      E {r.renewalFeeAmountSzl.toFixed(2)}
                    </span>
                  ) : (
                    <span className="text-zinc-400">—</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <RenewalStatusBadge status={r.status} />
                </td>
                <td className="px-4 py-3 text-right">
                  <button
                    onClick={() => onSelect(r)}
                    className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider cursor-pointer ${
                      isPending
                        ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                        : "bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300"
                    }`}
                  >
                    {isPending ? "Review" : "View"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
