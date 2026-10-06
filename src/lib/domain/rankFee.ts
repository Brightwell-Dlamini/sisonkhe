/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Single source of truth for rank fee amounts.
 */

import type { SupabaseClient } from "@supabase/supabase-js";

export type RankFeeConfig = {
  rankFee: number;
  splitOperational: number;
  splitNRTC: number;
  splitMaintenance: number;
};

const DEFAULTS: RankFeeConfig = {
  rankFee: 25,
  splitOperational: 20,
  splitNRTC: 3.5,
  splitMaintenance: 1.5,
};

export async function getRankFeeConfig(
  admin: SupabaseClient
): Promise<RankFeeConfig> {
  try {
    const { data } = await admin
      .from("system_config")
      .select("value_json")
      .eq("key", "rank_fee")
      .maybeSingle();

    if (data?.value_json && typeof data.value_json === "object") {
      const v = data.value_json as Record<string, number>;
      return {
        rankFee: Number(v.rankFee ?? DEFAULTS.rankFee),
        splitOperational: Number(v.splitOperational ?? DEFAULTS.splitOperational),
        splitNRTC: Number(v.splitNRTC ?? DEFAULTS.splitNRTC),
        splitMaintenance: Number(
          v.splitMaintenance ?? DEFAULTS.splitMaintenance
        ),
      };
    }
  } catch {
    /* use defaults */
  }
  return { ...DEFAULTS };
}

export async function setRankFeeConfig(
  admin: SupabaseClient,
  config: RankFeeConfig
): Promise<void> {
  const payload = {
    key: "rank_fee",
    value_json: config,
    updated_at: new Date().toISOString(),
  };
  const { data } = await admin
    .from("system_config")
    .select("key")
    .eq("key", "rank_fee")
    .maybeSingle();
  if (data) {
    await admin.from("system_config").update(payload).eq("key", "rank_fee");
  } else {
    await admin.from("system_config").insert(payload);
  }
}
