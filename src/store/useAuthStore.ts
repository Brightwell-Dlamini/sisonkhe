/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Client-side auth store. Populated from /api/auth/me on boot.
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
  refresh: () => Promise<void>;
  clear: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  loading: false,
  hydrated: false,

  setUser: (user) => set({ user, hydrated: true }),
  setLoading: (loading) => set({ loading }),

  refresh: async () => {
    set({ loading: true });
    try {
      const res = await fetch("/api/auth/me", { cache: "no-store" });
      if (!res.ok) {
        set({ user: null, loading: false, hydrated: true });
        return;
      }
      const data = await res.json();
      set({ user: data.user ?? null, loading: false, hydrated: true });
    } catch {
      set({ user: null, loading: false, hydrated: true });
    }
  },

  clear: () => set({ user: null, loading: false, hydrated: true }),
}));
