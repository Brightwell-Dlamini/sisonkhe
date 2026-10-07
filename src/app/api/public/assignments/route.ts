/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Public self-service linking is DISABLED.
 */

import { AppError } from "@/lib/api/errors";
import { withApiHandler } from "@/lib/api/response";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export const POST = withApiHandler(async () => {
  throw new AppError(
    "FORBIDDEN",
    "Driver–vehicle linking is not available on public portals. An authorised staff member must assign drivers in the admin console.",
    { details: { code: "STAFF_ONLY_ASSIGNMENT" } }
  );
});

export const GET = withApiHandler(async () => {
  throw new AppError("FORBIDDEN", "Not available", {
    details: { code: "STAFF_ONLY_ASSIGNMENT" },
  });
});
