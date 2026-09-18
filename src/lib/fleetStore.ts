/**
 * Fleet state store for Sisonkhe API.
 *
 * Current implementation: in-memory (works for single-instance / preview).
 * Designed so the storage backend can be swapped to Vercel KV, Upstash Redis,
 * or Postgres without changing the route handlers.
 *
 * Production path:
 * 1. Add @vercel/kv (or @upstash/redis)
 * 2. Implement the StorageAdapter interface below with KV get/set
 * 3. Set KV_REST_API_URL + KV_REST_API_TOKEN in Vercel env
 */

const MAX_STATE_BYTES = 4 * 1024 * 1024; // 4 MB safety limit
const ALLOWED_TOP_LEVEL_KEYS = new Set([
  "lastUpdated",
  "routes",
  "drivers",
  "vehicles",
  "trips",
  "notifications",
  "incidents",
  "payments",
  "regionConfigs",
  "trafficTickets",
  "marshals",
  "marshalTransactions",
  "rankFee",
  "splitOperational",
  "splitNRTC",
  "splitMaintenance",
  "adverts",
  "operatorCards",
  "vehicleCards",
]);

export type FleetState = Record<string, unknown> & {
  lastUpdated: number;
};

interface StorageAdapter {
  get(): Promise<FleetState>;
  set(state: FleetState): Promise<void>;
}

/** In-memory adapter — default until a durable store is wired */
class MemoryAdapter implements StorageAdapter {
  private state: FleetState = { lastUpdated: Date.now() };

  async get(): Promise<FleetState> {
    return this.state;
  }

  async set(state: FleetState): Promise<void> {
    this.state = state;
  }
}

const adapter: StorageAdapter = new MemoryAdapter();

function sanitizeUpdates(updates: Record<string, unknown>): Record<string, unknown> {
  const clean: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(updates)) {
    if (ALLOWED_TOP_LEVEL_KEYS.has(key) || key.startsWith("custom_")) {
      clean[key] = value;
    }
  }
  return clean;
}

function assertSize(state: FleetState): void {
  const size = Buffer.byteLength(JSON.stringify(state), "utf8");
  if (size > MAX_STATE_BYTES) {
    throw new Error(`Fleet state exceeds maximum size (${MAX_STATE_BYTES} bytes)`);
  }
}

export async function getFleetState(): Promise<FleetState> {
  return adapter.get();
}

export async function updateFleetState(
  updates: Record<string, unknown>
): Promise<FleetState> {
  if (!updates || typeof updates !== "object" || Array.isArray(updates)) {
    throw new Error("Updates must be a plain object");
  }

  const current = await adapter.get();
  const sanitized = sanitizeUpdates(updates);
  const next: FleetState = {
    ...current,
    ...sanitized,
    lastUpdated: Date.now(),
  };

  assertSize(next);
  await adapter.set(next);
  return next;
}

export async function getLastUpdated(): Promise<number> {
  const state = await adapter.get();
  return typeof state.lastUpdated === "number" ? state.lastUpdated : 0;
}
