/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

const SYNC_ENDPOINT = "/api/fleet/sync";
const STATUS_ENDPOINT = "/api/fleet/status";
const BROADCAST_CHANNEL = "kombiflow_fleet_sync_channel";

let channel: BroadcastChannel | null = null;
try {
  if (typeof BroadcastChannel !== "undefined") {
    channel = new BroadcastChannel(BROADCAST_CHANNEL);
  }
} catch (e) {
  console.warn("BroadcastChannel not supported in this context", e);
}

/**
 * Fetch the complete synchronized fleet state from the server.
 */
export async function getServerState(): Promise<Record<string, any> | null> {
  try {
    const res = await fetch(SYNC_ENDPOINT);
    if (res.ok) {
      return await res.json();
    }
  } catch (e) {
    console.warn("Failed to fetch server state:", e);
  }
  return null;
}

/**
 * Get the server's last updated timestamp for fast polling.
 */
export async function getServerStatus(): Promise<number> {
  try {
    const res = await fetch(STATUS_ENDPOINT);
    if (res.ok) {
      const data = await res.json();
      return data.lastUpdated || 0;
    }
  } catch (e) {
    // Ignore offline errors
  }
  return 0;
}

/**
 * Push updated fleet data to the central server so all other devices see the changes instantly.
 */
export async function pushServerState(partialState: Record<string, any>): Promise<boolean> {
  try {
    const res = await fetch(SYNC_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(partialState)
    });

    if (res.ok) {
      if (channel) {
        channel.postMessage({ type: "SYNC_UPDATED", timestamp: Date.now() });
      }
      return true;
    }
  } catch (e) {
    console.warn("Failed to push state to server:", e);
  }
  return false;
}

/**
 * Subscribe to state update notifications (via BroadcastChannel, custom events, or storage events).
 */
export function subscribeToSync(onSyncNeeded: () => void): () => void {
  const handleEvent = () => onSyncNeeded();

  window.addEventListener("kombiflow_server_sync_updated", handleEvent);
  window.addEventListener("storage", handleEvent);

  if (channel) {
    channel.onmessage = (msg) => {
      if (msg.data?.type === "SYNC_UPDATED") {
        onSyncNeeded();
      }
    };
  }

  return () => {
    window.removeEventListener("kombiflow_server_sync_updated", handleEvent);
    window.removeEventListener("storage", handleEvent);
  };
}
