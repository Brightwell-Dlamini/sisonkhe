/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Sequential document numbers — prefer DB atomic next_system_sequence RPC.
 */

import type { SupabaseClient } from "@supabase/supabase-js";

function year(): number {
  return new Date().getFullYear();
}

function pad(n: number, width: number): string {
  return String(n).padStart(width, "0");
}

/**
 * Next sequence value. Prefer Postgres next_system_sequence (atomic).
 * Fallback is still racy — deploy 20261013_system_sequences.sql.
 */
export async function nextSequence(
  admin: SupabaseClient,
  name: string
): Promise<number> {
  const { data, error } = await admin.rpc("next_system_sequence", {
    p_name: name,
  });
  if (!error && data != null) {
    return Number(data);
  }

  // Racy fallback only if RPC missing
  try {
    const { data: row } = await admin
      .from("system_sequences")
      .select("value")
      .eq("name", name)
      .maybeSingle();

    const next = Number(row?.value ?? 0) + 1;
    if (row) {
      const { data: updated } = await admin
        .from("system_sequences")
        .update({ value: next, updated_at: new Date().toISOString() })
        .eq("name", name)
        .eq("value", Number(row.value))
        .select("value")
        .maybeSingle();
      if (updated?.value != null) return Number(updated.value);
      // conflict — retry once via insert path
    }
    await admin.from("system_sequences").upsert({
      name,
      value: next,
      updated_at: new Date().toISOString(),
    });
    return next;
  } catch {
    return Date.now() % 10_000_000;
  }
}

export async function nextTicketNumber(admin: SupabaseClient): Promise<string> {
  const n = await nextSequence(admin, `ticket_${year()}`);
  return `REPS-${year()}-${pad(n, 6)}`;
}

export async function nextReceiptNumber(
  admin: SupabaseClient,
  prefix: string
): Promise<string> {
  const n = await nextSequence(admin, `receipt_${prefix}_${year()}`);
  return `${prefix}-${year()}-${pad(n, 6)}`;
}

export async function nextMarshalTxId(
  admin: SupabaseClient,
  vehicleReg: string
): Promise<string> {
  const n = await nextSequence(admin, "marshal_tx");
  const safe = vehicleReg.replace(/\s+/g, "").slice(0, 12);
  return `mtx_${year()}_${pad(n, 8)}_${safe}`;
}

export async function nextVirtualCardNumber(
  admin: SupabaseClient
): Promise<string> {
  const n = await nextSequence(admin, "vcard_pan");
  const p2 = pad((n % 9000) + 1000, 4);
  const p3 = pad((Math.floor(n / 9000) % 9000) + 1000, 4);
  const p4 = pad((Math.floor(n / 81_000_000) % 9000) + 1000, 4);
  return `5342 ${p2} ${p3} ${p4}`;
}
