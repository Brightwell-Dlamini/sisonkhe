/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Supabase server client.
 *
 * Two flavors:
 *   - createSupabaseServerClient()  → user-scoped, respects RLS
 *   - createSupabaseAdminClient()   → service-role, bypasses RLS
 *
 * NEVER import createSupabaseAdminClient into a client component.
 */

import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

// ---------------------------------------------------------------------------
// User-scoped client (respects RLS)
// ---------------------------------------------------------------------------

export async function createSupabaseServerClient() {
  const cookieStore = await cookies();

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    throw new Error("Missing Supabase env vars.");
  }

  return createServerClient(url, key, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // Server Components can't set cookies. Route handlers / middleware can.
          // Silent failure is fine — the middleware will set them.
        }
      },
    },
  });
}

// ---------------------------------------------------------------------------
// Admin client (bypasses RLS — server-only)
// ---------------------------------------------------------------------------

let adminCached: ReturnType<typeof createClient> | null = null;

export function createSupabaseAdminClient() {
  if (adminCached) return adminCached;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRole) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY. " +
        "This client is server-only and requires the service role key."
    );
  }

  adminCached = createClient(url, serviceRole, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  return adminCached;
}
