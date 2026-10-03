/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Server-side estimate of storage. Reads DB row counts + estimated sizes.
 */

import "server-only";
import { createSupabaseAdminClient } from "../supabase/server";

export interface StorageEstimate {
  totalRows: number;
  tables: Array<{ name: string; rows: number }>;
}

export async function getStorageEstimate(): Promise<StorageEstimate> {
  const admin = createSupabaseAdminClient();
  const tables = [
    "vehicles",
    "drivers",
    "fleet_operators",
    "marshals",
    "staff",
    "trips",
    "rank_fee_payments",
    "marshal_transactions",
    "virtual_card_transactions",
    "operator_card_transactions",
    "sync_events",
    "notifications",
    "incidents",
    "traffic_tickets",
    "permit_renewal_requests",
    "permit_audit_logs",
    "adverts",
    "payment_intents",
    "system_errors",
    "system_snapshots",
  ];

  const out: Array<{ name: string; rows: number }> = [];
  let total = 0;

  for (const t of tables) {
    const { count } = await admin
      .from(t)
      .select("*", { count: "exact", head: true });
    out.push({ name: t, rows: count ?? 0 });
    total += count ?? 0;
  }

  return { totalRows: total, tables: out };
}
