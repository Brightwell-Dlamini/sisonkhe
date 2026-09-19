/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth/session";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  try {
    const user = await getServerSession();
    return NextResponse.json({ user });
  } catch (err) {
    console.error("[api/auth/me] error:", err);
    return NextResponse.json({ user: null }, { status: 500 });
  }
}
