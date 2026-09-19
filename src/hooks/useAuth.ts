/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

"use client";

import { useEffect, useRef } from "react";
import { useAuthStore } from "../store/useAuthStore";
import { getSupabaseBrowser } from "../lib/supabase/client";

/**
 * Current authenticated user. Hydrates once on mount.
 *
 * Does NOT re-fetch role on TOKEN_REFRESHED — that fires whenever the tab is
 * focused and was wiping forms via loading spinners in useRequireAuth layouts.
 */
export function useAuth() {
  const { user, loading, hydrated, refresh } = useAuthStore();
  const lastUserIdRef = useRef<string | null>(null);

  // Initial fetch only
  useEffect(() => {
    if (!hydrated) {
      void refresh({ silent: false });
    }
  }, [hydrated, refresh]);

  // Supabase auth events
  useEffect(() => {
    const supabase = getSupabaseBrowser();
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_OUT") {
        lastUserIdRef.current = null;
        useAuthStore.getState().clear();
        return;
      }

      // Token rotation / tab focus — session still valid, role unchanged.
      // Do not hit /api/auth/me or toggle loading.
      if (event === "TOKEN_REFRESHED") {
        return;
      }

      // INITIAL_SESSION / SIGNED_IN — only re-resolve role if user id changed
      // or we have no user yet.
      if (event === "SIGNED_IN" || event === "INITIAL_SESSION") {
        const nextId = session?.user?.id ?? null;
        if (nextId && nextId === lastUserIdRef.current && useAuthStore.getState().user) {
          return;
        }
        lastUserIdRef.current = nextId;
        void useAuthStore.getState().refresh({
          silent: useAuthStore.getState().hydrated,
        });
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  return {
    user,
    // Only block UI before first hydration — never on background checks
    loading: !hydrated || (loading && !user),
    isAuthenticated: !!user,
    role: user?.role ?? null,
  };
}
