import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json({
    status: "ok",
    service: "Sisonkhe In Transit",
    version: "1.0.0",
    timestamp: new Date().toISOString(),
    lastUpdated: Date.now(),
    environment: process.env.VERCEL_ENV || process.env.NODE_ENV || "development",
  });
}
