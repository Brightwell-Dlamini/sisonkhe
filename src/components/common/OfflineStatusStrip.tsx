/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Online / outbox status for rank roles.
 * Hidden when online and fully synced (no noise on a healthy desk).
 */

"use client";

import { useEffect, useState } from "react";
import { WifiOff, CloudOff, AlertTriangle } from "lucide-react";
import { useOutbox } from "@/hooks/useOutbox";

export default function OfflineStatusStrip() {
  const { pending, failed, loading } = useOutbox();
  const [online, setOnline] = useState(true);

  useEffect(() => {
    const sync = () =>
      setOnline(typeof navigator !== "undefined" ? navigator.onLine : true);
    sync();
    window.addEventListener("online", sync);
    window.addEventListener("offline", sync);
    return () => {
      window.removeEventListener("online", sync);
      window.removeEventListener("offline", sync);
    };
  }, []);

  // Quiet when healthy
  if (online && pending === 0 && failed === 0) return null;
  if (loading && online && pending === 0 && failed === 0) return null;

  const tone = !online
    ? "bg-amber-950/90 border-amber-700/50 text-amber-100"
    : failed > 0
      ? "bg-rose-950/90 border-rose-700/50 text-rose-100"
      : "bg-sky-950/85 border-sky-700/40 text-sky-100";

  return (
    <div
      className={`sticky top-0 z-40 border-b px-3 py-2 text-[13px] font-medium flex items-center gap-2 ${tone}`}
      role="status"
    >
      {!online ? (
        <>
          <WifiOff className="w-4 h-4 shrink-0" />
          <span>
            Offline
            {pending > 0
              ? ` · ${pending} action${pending === 1 ? "" : "s"} waiting to send`
              : " · changes will sync when connected"}
          </span>
        </>
      ) : failed > 0 ? (
        <>
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>
            {failed} action{failed === 1 ? "" : "s"} failed after reconnect —
            open activity to retry
          </span>
        </>
      ) : (
        <>
          <CloudOff className="w-4 h-4 shrink-0" />
          <span>
            Online · {pending} still sending…
          </span>
        </>
      )}
    </div>
  );
}
