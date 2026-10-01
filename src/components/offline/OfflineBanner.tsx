/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Banner shown at the top of the app when offline or when there are queued
 * mutations. Disappears when online and queue is empty.
 */

"use client";

import { useState } from "react";
import { WifiOff, RefreshCw, AlertTriangle } from "lucide-react";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import { useOutbox } from "@/hooks/useOutbox";
import { syncNow } from "@/lib/offline/sync";
import { clearPermanentlyFailed } from "@/lib/offline/outbox";

export default function OfflineBanner() {
  const online = useOnlineStatus();
  const { pending, failed } = useOutbox();
  const [syncing, setSyncing] = useState(false);

  const handleSync = async () => {
    setSyncing(true);
    try {
      await syncNow();
    } finally {
      setSyncing(false);
    }
  };

  const handleClear = async () => {
    if (!confirm("Clear failed actions? This cannot be undone.")) return;
    await clearPermanentlyFailed();
  };

  // Nothing to show
  if (online && pending === 0 && failed === 0) return null;

  // Offline with queued mutations
  if (!online && pending > 0) {
    return (
      <div className="bg-amber-500 text-black px-4 py-2 flex items-center justify-between text-xs font-bold">
        <div className="flex items-center gap-2">
          <WifiOff className="w-3.5 h-3.5" />
          <span>
            Offline — {pending} {pending === 1 ? "action" : "actions"} queued for
            sync
          </span>
        </div>
      </div>
    );
  }

  // Offline, nothing queued
  if (!online) {
    return (
      <div className="bg-zinc-800 text-white px-4 py-2 flex items-center justify-between text-xs font-bold">
        <div className="flex items-center gap-2">
          <WifiOff className="w-3.5 h-3.5" />
          <span>You are offline. Some features may be unavailable.</span>
        </div>
      </div>
    );
  }

  // Online but permanent failures exist
  if (failed > 0) {
    return (
      <div className="bg-red-500 text-white px-4 py-2 flex items-center justify-between text-xs font-bold">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-3.5 h-3.5" />
          <span>
            {failed} {failed === 1 ? "action" : "actions"} failed to sync after
            repeated retries
          </span>
        </div>
        <button
          onClick={handleClear}
          className="px-2.5 py-1 rounded-lg bg-white/20 hover:bg-white/30 text-[10px] uppercase tracking-wider cursor-pointer"
        >
          Clear
        </button>
      </div>
    );
  }

  // Online with pending queue — show sync indicator
  return (
    <div className="bg-blue-500 text-white px-4 py-2 flex items-center justify-between text-xs font-bold">
      <div className="flex items-center gap-2">
        <RefreshCw className={`w-3.5 h-3.5 ${syncing ? "animate-spin" : ""}`} />
        <span>
          Syncing {pending} {pending === 1 ? "action" : "actions"}…
        </span>
      </div>
      <button
        onClick={handleSync}
        disabled={syncing}
        className="px-2.5 py-1 rounded-lg bg-white/20 hover:bg-white/30 text-[10px] uppercase tracking-wider disabled:opacity-50 cursor-pointer"
      >
        {syncing ? "Syncing" : "Sync now"}
      </button>
    </div>
  );
}
