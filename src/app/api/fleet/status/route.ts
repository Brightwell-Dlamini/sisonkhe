import { NextResponse } from "next/server";
import { getLastUpdated } from "@/lib/fleetStore";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({
    lastUpdated: getLastUpdated(),
  });
}
