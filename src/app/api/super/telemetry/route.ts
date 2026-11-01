/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Retired. Hosting metrics live in Vercel / Hostinger dashboards.
 */

import { requireServerRole } from "@/lib/auth/session";
import { withApiHandler } from "@/lib/api/response";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export const GET = withApiHandler(async () => {
  await requireServerRole(["super-admin"]);
  return NextResponse.json(
    {
      retired: true,
      message:
        "In-app telemetry is retired. Use the Vercel dashboard for runtime metrics.",
    },
    { status: 410 }
  );
});
