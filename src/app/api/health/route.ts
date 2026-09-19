import { NextResponse } from "next/server";
import { getStoreBackendName } from "@/lib/fleetStore";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  let store = "unknown";
  try {
    store = getStoreBackendName();
  } catch {
    store = "error";
  }

  return NextResponse.json({
    status: "ok",
    service: "Sisonkhe In Transit",
    version: "1.0.1",
    timestamp: new Date().toISOString(),
    lastUpdated: Date.now(),
    environment: process.env.VERCEL_ENV || process.env.NODE_ENV || "development",
    store,
  });
}
