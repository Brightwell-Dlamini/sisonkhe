/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import "server-only";
import { createSupabaseAdminClient } from "../supabase/server";

export interface RegionConfigRow {
  region: string;
  terminalName: string;
  emergencyNumber: string | null;
  announcement: string | null;
}

export async function listRegionConfigs(): Promise<RegionConfigRow[]> {
  const admin = createSupabaseAdminClient();
  const { data } = await admin
    .from("regions")
    .select("code, terminal_name, emergency_number, announcement")
    .order("code");

  return (data ?? []).map((r) => ({
    region: r.code as string,
    terminalName: r.terminal_name as string,
    emergencyNumber: (r.emergency_number as string | null) ?? null,
    announcement: (r.announcement as string | null) ?? null,
  }));
}

export async function updateRegionConfig(
  region: string,
  input: {
    terminalName?: string;
    emergencyNumber?: string | null;
    announcement?: string | null;
  }
): Promise<{ success: boolean; error?: string }> {
  const admin = createSupabaseAdminClient();
  const patch: Record<string, unknown> = {};
  if (input.terminalName !== undefined) patch.terminal_name = input.terminalName;
  if (input.emergencyNumber !== undefined) patch.emergency_number = input.emergencyNumber;
  if (input.announcement !== undefined) patch.announcement = input.announcement;
  patch.updated_at = new Date().toISOString();

  const { error } = await admin.from("regions").update(patch).eq("code", region);
  if (error) return { success: false, error: error.message };
  return { success: true };
}
