/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import "server-only";
import { createSupabaseAdminClient } from "../supabase/server";

export async function getConfig(): Promise<Record<string, unknown>> {
  const admin = createSupabaseAdminClient();
  const { data } = await admin.from("system_config").select("key, value");
  const out: Record<string, unknown> = {};
  for (const row of data ?? []) out[row.key as string] = row.value;
  return out;
}

export async function setConfigKey(
  key: string,
  value: unknown
): Promise<{ success: boolean; error?: string }> {
  const admin = createSupabaseAdminClient();
  const { error } = await admin
    .from("system_config")
    .upsert({ key, value, updated_at: new Date().toISOString() });
  return { success: !error, error: error?.message };
}
