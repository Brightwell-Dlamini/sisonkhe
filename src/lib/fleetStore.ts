/**
 * Fleet state store for Sisonkhe API.
 *
 * Selects storage backend automatically:
 * - Vercel KV when KV_REST_API_URL + KV_REST_API_TOKEN are set
 * - In-memory fallback otherwise (per serverless instance)
 *
 * To enable durable multi-instance sync:
 * 1. Vercel Dashboard → Storage → Create KV Database → Connect to this project
 * 2. Redeploy (env vars are injected automatically)
 */

const MAX_STATE_BYTES = 4 * 1024 * 1024; // 4 MB safety limit
const KV_KEY = "sisonkhe:fleet_state";

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
  name: string;
}

class MemoryAdapter implements StorageAdapter {
  name = "memory";
  private state: FleetState = { lastUpdated: Date.now() };

  async get(): Promise<FleetState> {
    return this.state;
  }

  async set(state: FleetState): Promise<void> {
    this.state = state;
  }
}

class KvAdapter implements StorageAdapter {
  name = "vercel-kv";

  async get(): Promise<FleetState> {
    const { kv } = await import("@vercel/kv");
    const data = await kv.get<FleetState>(KV_KEY);
    if (data && typeof data === "object") {
      return data;
    }
    return { lastUpdated: Date.now() };
  }

  async set(state: FleetState): Promise<void> {
    const { kv } = await import("@vercel/kv");
    await kv.set(KV_KEY, state);
  }
}

function createAdapter(): StorageAdapter {
  const hasKv =
    Boolean(process.env.KV_REST_API_URL) &&
    Boolean(process.env.KV_REST_API_TOKEN);
  if (hasKv) {
    return new KvAdapter();
  }
  return new MemoryAdapter();
}

// Lazy singleton — avoids importing @vercel/kv when unused
let adapter: StorageAdapter | null = null;

function getAdapter(): StorageAdapter {
  if (!adapter) {
    adapter = createAdapter();
    if (process.env.FLEET_API_DEBUG === "true") {
      console.log(`[fleetStore] using adapter: ${adapter.name}`);
    }
  }
  return adapter;
}

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
  return getAdapter().get();
}

export async function updateFleetState(
  updates: Record<string, unknown>
): Promise<FleetState> {
  if (!updates || typeof updates !== "object" || Array.isArray(updates)) {
    throw new Error("Updates must be a plain object");
  }

  const store = getAdapter();
  const current = await store.get();
  const sanitized = sanitizeUpdates(updates);
  const next: FleetState = {
    ...current,
    ...sanitized,
    lastUpdated: Date.now(),
  };

  assertSize(next);
  await store.set(next);
  return next;
}

export async function getLastUpdated(): Promise<number> {
  const state = await getAdapter().get();
  return typeof state.lastUpdated === "number" ? state.lastUpdated : 0;
}

export function getStoreBackendName(): string {
  return getAdapter().name;
}
