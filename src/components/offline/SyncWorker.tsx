/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Headless component that:
 *   - Registers the service worker
 *   - Starts the heartbeat
 *   - Starts the sync daemon
 *   - Triggers replay on network restore
 *   - Replays on boot if online
 *
 * Mount once, at the top of the app.
 */

"use client";

import { useEffect } from "react";
import { startHeartbeat, subscribeNetwork } from "@/lib/offline/network";
import { startSyncDaemon, replayOutbox } from "@/lib/offline/sync";

export default function SyncWorker() {
  useEffect(() => {
    // 1. Register service worker
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw.js", { scope: "/" })
        .then((reg) => {
          console.info("[sync] Service worker registered:", reg.scope);
        })
        .catch((err) => {
          console.warn("[sync] Service worker registration failed:", err);
        });
    }

    // 2. Start heartbeat
    startHeartbeat(30000);

    // 3. Start sync daemon
    startSyncDaemon(15000);

    // 4. Trigger replay on network restore
    const unsub = subscribeNetwork((online) => {
      if (online) {
        void replayOutbox();
      }
    });

    // 5. Also replay on boot if online
    if (typeof navigator !== "undefined" && navigator.onLine) {
      void replayOutbox();
    }

    return () => {
      unsub();
    };
  }, []);

  return null;
}
