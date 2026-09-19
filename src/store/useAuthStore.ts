/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Client-side auth store. Populated from /api/auth/me on boot.
 *
 * Important: background revalidation must NOT flip `loading` to true when we
 * already have a user — that unmounts protected layouts and destroys form state
 * every time the browser tab is focused (Supabase TOKEN_REFRESHED).
 */

"use client";

import { create } from "zustand";
import type { ResolvedUser } from "../lib/auth/roles";

interface AuthState {
  user: ResolvedUser | null;
  loading: boolean;
  hydrated: boolean;
  setUser: (user: ResolvedUser | null) => void;
  setLoading: (loading: boolean) => void;
  /**
   * Re-fetch session user from /api/auth/me.
   * @param opts.silent - if true (default when already hydrated), do not set loading=true
   */
  refresh: (opts?: { silent?: boolean }) => Promise<void>;
  clear: () => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  loading: false,
  hydrated: false,

  setUser: (user) => set({ user, hydrated: true, loading: false }),
  setLoading: (loading) => set({ loading }),

  refresh: async (opts) => {
    const { hydrated, user } = get();
    // Only show a blocking loader on the very first resolve, or when
    // the caller explicitly asks for a non-silent refresh with no user yet.
    const silent =
      opts?.silent ?? (hydrated && user !== null);

    if (!silent) {
      set({ loading: true });
    }

    try {
      const res = await fetch("/api/auth/me", { cache: "no-store" });
      if (!res.ok) {
        set({ user: null, loading: false, hydrated: true });
        return;
      }
      const data = await res.json();
      set({ user: data.user ?? null, loading: false, hydrated: true });
    } catch {
      // On network blips during background refresh, keep existing user
      if (silent && get().user) {
        set({ loading: false, hydrated: true });
        return;
      }
      set({ user: null, loading: false, hydrated: true });
    }
  },

  clear: () => set({ user: null, loading: false, hydrated: true }),
}));
