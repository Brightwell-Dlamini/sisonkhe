/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Optional context wrapper. SyncWorker already runs at root layout;
 * this provider exposes online status for nested trees that need it.
 */

"use client";

import {
  createContext,
  useContext,
  type ReactNode,
} from "react";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";

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
  const isOnline = useOnlineStatus();

  return (
    <OfflineContext.Provider value={{ isOnline }}>
      {children}
    </OfflineContext.Provider>
  );
}
