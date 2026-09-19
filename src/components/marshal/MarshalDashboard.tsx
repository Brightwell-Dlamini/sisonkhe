/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

"use client";

import { useState } from "react";
import { Loader2, AlertCircle, RefreshCw } from "lucide-react";
import { useMarshalTerminal } from "@/hooks/useMarshalTerminal";
import MarshalHeader from "./MarshalHeader";
import SummaryCards from "./SummaryCards";
import QueueList from "./QueueList";
import RecentActivityFeed from "./RecentActivityFeed";

export default function MarshalDashboard() {
  const {
    context,
    vehicles,
    summary,
    activity,
    loading,
    error,
    refresh,
    dispatch,
  } = useMarshalTerminal();

  const [toast, setToast] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3500);
  };

  if (loading && !context) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-emerald-600" />
      </div>
    );
  }

  if (error && !context) {
    return (
      <div className="bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 rounded-xl px-4 py-3 text-xs flex items-start gap-2">
        <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
        <div>
          <div className="font-bold">Could not load terminal</div>
          <div className="mt-0.5">{error}</div>
        </div>
      </div>
    );
  }

  if (!context) return null;

  return (
    <div className="space-y-5">
      {toast && (
        <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 rounded-xl px-4 py-3 text-xs font-bold flex items-center justify-between">
          <span>{toast}</span>
          <button
            onClick={() => setToast(null)}
            className="text-emerald-600 hover:text-emerald-700"
          >
            ✕
          </button>
        </div>
      )}

      <MarshalHeader context={context} onRefresh={refresh} loading={loading} />

      {summary && <SummaryCards summary={summary} />}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-black uppercase tracking-wider text-zinc-900 dark:text-white">
              Live Queue
            </h2>
            <span className="text-[11px] text-zinc-500 font-mono">
              {vehicles.length} vehicles visible
            </span>
          </div>

          <QueueList
            vehicles={vehicles}
            onDispatch={dispatch}
            showToast={showToast}
          />
        </div>

        <div className="lg:col-span-1">
          <RecentActivityFeed activity={activity} />
        </div>
      </div>
    </div>
  );
}
