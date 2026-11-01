/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Retired. Assistant surface is not part of the production control set.
 */

import { requireServerRole } from "@/lib/auth/session";
import { withApiHandler } from "@/lib/api/response";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export const POST = withApiHandler(async () => {
  await requireServerRole(["super-admin"]);
  return NextResponse.json(
    {
      retired: true,
      message: "Assistant API is retired.",
    },
    { status: 410 }
  );
});
