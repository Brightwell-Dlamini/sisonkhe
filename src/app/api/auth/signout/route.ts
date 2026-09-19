/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST() {
  try {
    const supabase = await createSupabaseServerClient();
    await supabase.auth.signOut();
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[api/auth/signout] error:", err);
    return NextResponse.json({ success: false }, { status: 500 });
  }
}
