/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import "server-only";
import { createSupabaseAdminClient } from "../supabase/server";
import { randomBytes } from "crypto";

export interface RegionConfigRow {
  region: string;
  terminalName: string;
  emergencyNumber: string | null;
  announcement: string | null;
}

export interface TerminalRow {
  id: string;
  region: string;
  name: string;
  emergencyNumber: string | null;
  announcement: string | null;
  isActive: boolean;
}

/** Always available so marshal/admin dropdowns never render empty. */
const DEFAULT_REGION_TERMINALS: RegionConfigRow[] = [
  {
    region: "Hhohho",
    terminalName: "Mbabane Bus Rank",
    emergencyNumber: null,
    announcement: null,
  },
  {
    region: "Manzini",
    terminalName: "Manzini Bus Rank",
    emergencyNumber: null,
    announcement: null,
  },
  {
    region: "Lubombo",
    terminalName: "Siteki Bus Rank",
    emergencyNumber: null,
    announcement: null,
  },
  {
    region: "Shiselweni",
    terminalName: "Nhlangano Bus Rank",
    emergencyNumber: null,
    announcement: null,
  },
];

export async function listRegionConfigs(): Promise<RegionConfigRow[]> {
  const admin = createSupabaseAdminClient();
  try {
    const { data } = await admin
      .from("regions")
      .select("code, terminal_name, emergency_number, announcement")
      .order("code");

    if (data && data.length > 0) {
      return data.map((r) => ({
        region: r.code as string,
        terminalName:
          (r.terminal_name as string) || `${r.code as string} Terminal`,
        emergencyNumber: (r.emergency_number as string | null) ?? null,
        announcement: (r.announcement as string | null) ?? null,
      }));
    }
  } catch {
    /* fall through to defaults */
  }
  return DEFAULT_REGION_TERMINALS;
}

export async function listTerminals(): Promise<TerminalRow[]> {
  const admin = createSupabaseAdminClient();
  try {
    const { data, error } = await admin
      .from("terminals")
      .select("id, region_code, name, emergency_number, announcement, is_active")
      .order("name");
    if (error || !data) return [];
    return data.map((t) => ({
      id: t.id as string,
      region: t.region_code as string,
      name: t.name as string,
      emergencyNumber: (t.emergency_number as string | null) ?? null,
      announcement: (t.announcement as string | null) ?? null,
      isActive: (t.is_active as boolean) ?? true,
    }));
  } catch {
    return [];
  }
}

export async function createTerminal(input: {
  region: string;
  name: string;
  emergencyNumber?: string | null;
  announcement?: string | null;
}): Promise<{ success: boolean; terminal?: TerminalRow; error?: string }> {
  const admin = createSupabaseAdminClient();
  const id = `term_${randomBytes(6).toString("hex")}`;
  const { data, error } = await admin
    .from("terminals")
    .insert({
      id,
      region_code: input.region,
      name: input.name.trim(),
      emergency_number: input.emergencyNumber || null,
      announcement: input.announcement || null,
      is_active: true,
      updated_at: new Date().toISOString(),
    })
    .select("id, region_code, name, emergency_number, announcement, is_active")
    .single();

  if (error || !data) {
    return {
      success: false,
      error:
        error?.message ??
        "Could not create terminal. Ensure terminals table exists (20261006_terminals.sql).",
    };
  }

  return {
    success: true,
    terminal: {
      id: data.id as string,
      region: data.region_code as string,
      name: data.name as string,
      emergencyNumber: (data.emergency_number as string | null) ?? null,
      announcement: (data.announcement as string | null) ?? null,
      isActive: (data.is_active as boolean) ?? true,
    },
  };
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
  if (input.emergencyNumber !== undefined)
    patch.emergency_number = input.emergencyNumber;
  if (input.announcement !== undefined) patch.announcement = input.announcement;
  patch.updated_at = new Date().toISOString();

  const { error } = await admin.from("regions").update(patch).eq("code", region);
  if (error) return { success: false, error: error.message };
  return { success: true };
}
