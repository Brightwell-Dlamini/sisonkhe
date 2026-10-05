/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Visible indicator when the device is offline.
 */

"use client";

import { WifiOff } from "lucide-react";
import { useOfflineStatus } from "./OfflineProvider";

export function OfflineBanner() {
  const { isOnline } = useOfflineStatus();

  if (isOnline) return null;

  return (
    <div
      role="status"
      className="fixed top-0 inset-x-0 z-[100] bg-amber-600 text-white text-center text-xs font-bold uppercase tracking-wider py-1.5 px-3 flex items-center justify-center gap-2 shadow-md"
    >
      <WifiOff className="w-3.5 h-3.5" />
      <span>You are offline — changes will sync when connection returns</span>
    </div>
  );
}
