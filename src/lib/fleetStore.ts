/**
 * In-memory fleet state store for the Sisonkhe API.
 * Note: On Vercel serverless this is per-instance. For true multi-instance
 * production persistence, migrate to Vercel KV, Postgres, or similar.
 */

let fleetState: Record<string, any> = {
  lastUpdated: Date.now(),
};

export function getFleetState() {
  return fleetState;
}

export function updateFleetState(updates: Record<string, any>) {
  fleetState = {
    ...fleetState,
    ...updates,
    lastUpdated: Date.now(),
  };
  return fleetState;
}

export function getLastUpdated() {
  return fleetState.lastUpdated || 0;
}
