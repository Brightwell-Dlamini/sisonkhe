import { NextRequest, NextResponse } from "next/server";
import { getFleetState, updateFleetState } from "@/lib/fleetStore";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(getFleetState());
}

export async function POST(request: NextRequest) {
  try {
    const updates = await request.json();
    const newState = updateFleetState(updates || {});
    return NextResponse.json({
      success: true,
      lastUpdated: newState.lastUpdated,
    });
  } catch (error) {
    console.error("Fleet sync POST error:", error);
    return NextResponse.json(
      { success: false, error: "Invalid request body" },
      { status: 400 }
    );
  }
}
