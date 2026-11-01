/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Retired. Table size and buckets live in Supabase / Hostinger.
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
        "In-app storage estimates are retired. Use the Supabase dashboard.",
    },
    { status: 410 }
  );
});
