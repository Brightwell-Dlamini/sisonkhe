/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Boots the offline outbox worker and exposes online/offline status.
 * Mount once near the root of authenticated layouts.
 */

"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { startOutboxWorker } from "@/lib/offline/outbox";

interface OfflineContextValue {
  isOnline: boolean;
}

const OfflineContext = createContext<OfflineContextValue>({
  isOnline: true,
});

export function useOfflineStatus() {
  return useContext(OfflineContext);
}

export function OfflineProvider({ children }: { children: ReactNode }) {
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== "undefined" ? navigator.onLine : true
  );

  useEffect(() => {
    const onOnline = () => setIsOnline(true);
    const onOffline = () => setIsOnline(false);

    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);

    const stopWorker = startOutboxWorker(15_000);

    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
      stopWorker();
    };
  }, []);

  return (
    <OfflineContext.Provider value={{ isOnline }}>
      {children}
    </OfflineContext.Provider>
  );
}
