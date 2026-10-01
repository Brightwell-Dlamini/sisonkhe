/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Compact header pill showing network + queue status.
 */

"use client";

import { Wifi, WifiOff, RefreshCw } from "lucide-react";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import { useOutbox } from "@/hooks/useOutbox";

export default function SyncStatusPill() {
  const online = useOnlineStatus();
  const { pending } = useOutbox();

  if (!online) {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-800 text-[10px] font-black uppercase tracking-wider">
        <WifiOff className="w-3 h-3" />
        Offline
        {pending > 0 && <span>({pending})</span>}
      </span>
    );
  }

  if (pending > 0) {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-300 dark:border-blue-800 text-[10px] font-black uppercase tracking-wider">
        <RefreshCw className="w-3 h-3 animate-spin" />
        Syncing ({pending})
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 text-[10px] font-black uppercase tracking-wider">
      <Wifi className="w-3 h-3" />
      Synced
    </span>
  );
}
