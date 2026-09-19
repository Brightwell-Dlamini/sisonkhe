/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Supabase browser client.
 *
 * Uses the ANON KEY. Subject to Row Level Security.
 * Safe to import in client components and hooks.
 */

"use client";

import { createBrowserClient } from "@supabase/ssr";

let cached: ReturnType<typeof createBrowserClient> | null = null;

export function getSupabaseBrowser() {
  if (cached) return cached;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY. " +
        "Set them in .env.local or Vercel environment variables."
    );
  }

  cached = createBrowserClient(url, key);
  return cached;
}
