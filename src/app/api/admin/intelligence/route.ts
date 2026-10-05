/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * GET /api/admin/intelligence — live decision snapshot for Command Centre.
 */

import { NextResponse } from "next/server";
import { requireServerRole } from "@/lib/auth/session";
import { buildIntelligenceSnapshot } from "@/lib/intelligence/snapshot";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  try {
    // AuthRole: super-admin | admin | fleet-manager | inspector | marshal | driver | operator
    // Rank admin in the product is the "admin" staff role (not a separate AuthRole).
    const user = await requireServerRole([
      "super-admin",
      "admin",
      "fleet-manager",
    ]);
    const snapshot = await buildIntelligenceSnapshot(user);
    return NextResponse.json(snapshot, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Error";
    const status =
      msg === "UNAUTHENTICATED" ? 401 : msg === "FORBIDDEN" ? 403 : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}
