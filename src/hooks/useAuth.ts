/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

"use client";

import { useEffect } from "react";
import { useAuthStore } from "../store/useAuthStore";
import { getSupabaseBrowser } from "../lib/supabase/client";

/**
 * Hook that returns the current authenticated user (or null) and
 * automatically refreshes on auth state changes.
 */
export function useAuth() {
  const { user, loading, hydrated, refresh } = useAuthStore();

  // Initial fetch
  useEffect(() => {
    if (!hydrated) {
      void refresh();
    }
  }, [hydrated, refresh]);

  // Listen to Supabase auth state changes
  useEffect(() => {
    const supabase = getSupabaseBrowser();
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT") {
        useAuthStore.getState().clear();
      } else if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED") {
        void refresh();
      }
    });
    return () => subscription.unsubscribe();
  }, [refresh]);

  return {
    user,
    loading: loading || !hydrated,
    isAuthenticated: !!user,
    role: user?.role ?? null,
  };
}
