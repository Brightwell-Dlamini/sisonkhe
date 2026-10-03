import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { getServerSession } from "@/lib/auth/session";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const limit = Math.min(
      50,
      Math.max(1, Number(request.nextUrl.searchParams.get("limit")) || 10)
    );

    const admin = createSupabaseAdminClient();
    const { data } = await admin
      .from("notifications")
      .select("id, timestamp, message, type, status")
      .order("timestamp", { ascending: false })
      .limit(limit);

    return NextResponse.json({ notifications: data ?? [] });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
