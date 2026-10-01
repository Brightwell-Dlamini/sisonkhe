/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Root page. Routes the user to the right surface.
 *
 * The role-based redirect happens client-side in App.tsx because we need
 * the auth session, which is only available in the browser.
 */

"use client";

import dynamic from "next/dynamic";

const App = dynamic(() => import("../App"), {
  ssr: false,
  loading: () => (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 dark:bg-[#050505]">
      <div className="text-center">
        <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mb-2">
          🇸🇿 Sisonkhe In Transit
        </div>
        <div className="text-xs text-zinc-500">Loading…</div>
      </div>
    </div>
  ),
});

export default function HomePage() {
  return <App />;
}
