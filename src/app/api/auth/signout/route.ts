/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { ok, withApiHandler } from "@/lib/api/response";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export const POST = withApiHandler(async () => {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  return ok({ success: true });
});
