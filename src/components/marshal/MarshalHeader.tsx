/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

"use client";

import { RefreshCw, MapPin } from "lucide-react";
import type { MarshalContext } from "@/lib/marshal/queries";

interface Props {
  context: MarshalContext;
  onRefresh: () => void;
  loading: boolean;
}

export default function MarshalHeader({ context, onRefresh, loading }: Props) {
  return (
    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[10px] font-black uppercase tracking-widest text-emerald-600 dark:text-emerald-400">
              Marshal on Duty
            </span>
          </div>
          <h1 className="text-lg sm:text-xl font-black text-zinc-900 dark:text-white">
            {context.fullName}
          </h1>
          <div className="flex items-center gap-1.5 text-xs text-zinc-500 mt-1">
            <MapPin className="w-3.5 h-3.5" />
            <span>
              {context.region} Region
              {context.assignedRouteId ? (
                <>
                  {" "}
                  • Route <strong className="font-mono">{context.assignedRouteId}</strong>
                </>
              ) : null}
            </span>
          </div>
        </div>

        <button
          onClick={onRefresh}
          disabled={loading}
          className="p-2 rounded-xl bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 disabled:opacity-50"
          title="Refresh"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>
    </div>
  );
}
