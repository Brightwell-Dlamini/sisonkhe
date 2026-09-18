import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";

const app = express();
const PORT = 3000;

app.use(express.json({ limit: "50mb" }));

const DATA_DIR = path.join(process.cwd(), "data");
const DATA_FILE = path.join(DATA_DIR, "fleet_state.json");

// In-memory global state store
let fleetState: Record<string, any> = {
  lastUpdated: Date.now()
};

// Load initial persisted state from disk if available
try {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (fs.existsSync(DATA_FILE)) {
    const raw = fs.readFileSync(DATA_FILE, "utf-8");
    fleetState = JSON.parse(raw);
    console.log("🇸🇿 Loaded persisted fleet state from disk.");
  }
} catch (e) {
  console.error("Error loading fleet_state.json:", e);
}

// Function to save state to disk asynchronously
function saveStateToDisk() {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(fleetState, null, 2), "utf-8");
  } catch (e) {
    console.error("Error writing fleet_state.json:", e);
  }
}

// Health check endpoint
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", lastUpdated: fleetState.lastUpdated || Date.now() });
});

// Quick status endpoint for polling
app.get("/api/fleet/status", (req, res) => {
  res.json({ lastUpdated: fleetState.lastUpdated || 0 });
});

// GET full synchronized fleet state
app.get("/api/fleet/sync", (req, res) => {
  res.json(fleetState);
});

// POST update to synchronized fleet state across all connected devices
app.post("/api/fleet/sync", (req, res) => {
  const updates = req.body || {};
  fleetState = {
    ...fleetState,
    ...updates,
    lastUpdated: Date.now()
  };
  saveStateToDisk();
  res.json({ success: true, lastUpdated: fleetState.lastUpdated });
});

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`🇸🇿 KombiFlow Express Server active on http://0.0.0.0:${PORT}`);
  });
}

startServer();
