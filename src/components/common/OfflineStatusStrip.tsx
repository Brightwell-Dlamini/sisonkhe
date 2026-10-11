/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Always-visible online / outbox status for rank roles.
 */

"use client";

import { useEffect, useState } from "react";
import { Wifi, WifiOff, CloudOff, AlertTriangle } from "lucide-react";
import { useOutbox } from "@/hooks/useOutbox";

export default function OfflineStatusStrip() {
  const { pending, failed, loading } = useOutbox();
  const [online, setOnline] = useState(true);

  useEffect(() => {
    const sync = () => setOnline(typeof navigator !== "undefined" ? navigator.onLine : true);
    sync();
    window.addEventListener("online", sync);
    window.addEventListener("offline", sync);
    return () => {
      window.removeEventListener("online", sync);
      window.removeEventListener("offline", sync);
    };
  }, []);

  if (loading && online && pending === 0 && failed === 0) return null;

  const tone = !online
    ? "bg-amber-950/80 border-amber-700/50 text-amber-200"
    : failed > 0
      ? "bg-rose-950/80 border-rose-700/50 text-rose-200"
      : pending > 0
        ? "bg-sky-950/70 border-sky-700/40 text-sky-200"
        : "bg-emerald-950/50 border-emerald-800/30 text-emerald-300/90";

  return (
    <div
      className={`sticky top-0 z-40 border-b px-3 py-1.5 text-[11px] font-medium flex items-center gap-2 ${tone}`}
      role="status"
    >
      {!online ? (
        <>
          <WifiOff className="w-3.5 h-3.5 shrink-0" />
          <span>
            Offline
            {pending > 0
              ? ` · ${pending} action${pending === 1 ? "" : "s"} waiting to send`
              : " · changes will sync when connected"}
          </span>
        </>
      ) : failed > 0 ? (
        <>
          <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
          <span>
            {failed} action{failed === 1 ? "" : "s"} failed after reconnect — open activity to retry
          </span>
        </>
      ) : pending > 0 ? (
        <>
          <CloudOff className="w-3.5 h-3.5 shrink-0" />
          <span>
            Online · {pending} still sending…
          </span>
        </>
      ) : (
        <>
          <Wifi className="w-3.5 h-3.5 shrink-0 opacity-70" />
          <span>Online · synced</span>
        </>
      )}
    </div>
  );
}
