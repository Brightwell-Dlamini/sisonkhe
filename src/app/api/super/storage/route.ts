/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { requireServerRole } from "@/lib/auth/session";
import { getStorageEstimate } from "@/lib/super/storage";
import { ok, withApiHandler } from "@/lib/api/response";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export const GET = withApiHandler(async () => {
  await requireServerRole(["super-admin"]);
  return ok(await getStorageEstimate());
});
