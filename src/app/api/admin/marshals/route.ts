/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * GET  — list marshals (region scoped)
 * POST — optional identity-row only (no auth). Prefer field portal for demographics.
 *        Issue login via POST /api/admin/marshals/[id]/issue-login
 */

import { NextRequest, NextResponse } from "next/server";
import { requireServerRole } from "@/lib/auth/session";
import { regionScopeOrThrow } from "@/lib/auth/permissions";
import type { AuthRole } from "@/lib/auth/roles";
import { listMarshals, createMarshal } from "@/lib/admin/marshals";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const ALLOWED: AuthRole[] = ["super-admin", "admin", "fleet-manager"];

export async function GET() {
  try {
    const user = await requireServerRole(ALLOWED);
    const regionScope = regionScopeOrThrow(user);
    const marshals = await listMarshals(regionScope);
    return NextResponse.json({ marshals, count: marshals.length, regionScope });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Error";
    return NextResponse.json(
      { error: msg, marshals: [] },
      {
        status:
          msg === "UNAUTHENTICATED"
            ? 401
            : msg === "FORBIDDEN" || msg === "REGION_REQUIRED"
              ? 403
              : 500,
      }
    );
  }
}

/** Identity row only — does not create a login. Use issue-login for access. */
export async function POST(request: NextRequest) {
  try {
    const user = await requireServerRole(ALLOWED);
    const regionScope = regionScopeOrThrow(user);
    const body = await request.json();
    if (regionScope && body.region && body.region !== regionScope) {
      return NextResponse.json(
        { error: `You can only create marshals in region ${regionScope}.` },
        { status: 403 }
      );
    }
    if (regionScope && !body.region) body.region = regionScope;
    const result = await createMarshal(body);
    if (!result.success)
      return NextResponse.json({ error: result.error }, { status: 400 });
    return NextResponse.json({
      marshal: result.marshal,
      note: "Identity saved without login. Call issue-login to create credentials.",
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
