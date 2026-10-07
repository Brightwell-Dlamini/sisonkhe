/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { getServerSession } from "@/lib/auth/session";
import { ok, withApiHandler } from "@/lib/api/response";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export const GET = withApiHandler(async () => {
  const user = await getServerSession();
  return ok({ user });
});
