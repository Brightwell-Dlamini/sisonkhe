/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Client-side bootstrap. Wraps the app to:
 *   1. Initialize the fleet store (IndexedDB hydration + persistence)
 *   2. Apply dark mode to <html>
 *   3. Show a loading state until hydration completes
 */

"use client";

import { useEffect } from "react";
import { useInitFleetStore } from "../store/bind";
import { useFleetStore } from "../store/useFleetStore";

export default function ClientBootstrap({
  children,
}: {
  children: React.ReactNode;
}) {
  const hydrated = useInitFleetStore();
  const isDarkMode = useFleetStore((s) => s.isDarkMode);

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add("dark");
      document.body.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
      document.body.classList.remove("dark");
    }
  }, [isDarkMode]);

  if (!hydrated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-[#050505]">
        <div className="text-center">
          <div className="mb-4 text-2xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400">
            🇸🇿 Sisonkhe In Transit
          </div>
          <div className="text-sm text-gray-500 dark:text-gray-400">
            Loading national fleet management system...
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
