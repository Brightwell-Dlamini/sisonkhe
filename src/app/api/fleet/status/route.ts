import { NextResponse } from "next/server";
import { getLastUpdated } from "@/lib/fleetStore";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

export async function GET() {
  try {
    const lastUpdated = await getLastUpdated();
    return NextResponse.json({ lastUpdated }, { headers: CORS_HEADERS });
  } catch (error) {
    console.error("[fleet/status] error:", error);
    return NextResponse.json(
      { lastUpdated: 0, error: "Failed to read status" },
      { status: 500, headers: CORS_HEADERS }
    );
  }
}
