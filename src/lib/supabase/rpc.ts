/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Loose Supabase admin helpers for portal RPCs and columns that are not yet
 * present in generated Database types. Prefer regenerating types, then remove
 * these casts.
 */

import type { createSupabaseAdminClient } from "./server";

type Admin = ReturnType<typeof createSupabaseAdminClient>;

export type RpcResult = {
  data: unknown;
  error: { message: string; code?: string } | null;
};

export type LooseAdmin = {
  rpc: (fn: string, args?: Record<string, unknown>) => Promise<RpcResult>;
  from: (table: string) => {
    update: (values: Record<string, unknown>) => {
      eq: (col: string, val: string) => {
        is: (
          col: string,
          val: null
        ) => {
          select: (cols: string) => Promise<{
            data: { id: string }[] | null;
            error: { message: string } | null;
          }>;
        };
        select: (cols: string) => Promise<{
          data: { id: string }[] | null;
          error: { message: string } | null;
        }>;
      };
    };
  };
};

export function looseAdmin(admin: Admin): LooseAdmin {
  return admin as unknown as LooseAdmin;
}

/** First row from an RPC that returns a table or a single object. */
export function rpcRow<T extends Record<string, unknown>>(data: unknown): T | null {
  if (data == null) return null;
  if (Array.isArray(data)) {
    const first = data[0];
    if (first && typeof first === "object") return first as T;
    return null;
  }
  if (typeof data === "object") return data as T;
  return null;
}
