/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Public self-service linking is DISABLED.
 * Driver ↔ vehicle assignment is staff-only (admin / fleet-manager / super-admin).
 */

import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST() {
  return NextResponse.json(
    {
      error:
        "Driver–vehicle linking is not available on public portals. An authorised staff member must assign drivers in the admin console.",
      code: "STAFF_ONLY_ASSIGNMENT",
    },
    { status: 403 }
  );
}

export async function GET() {
  return NextResponse.json(
    {
      error: "Not available",
      code: "STAFF_ONLY_ASSIGNMENT",
    },
    { status: 403 }
  );
}
