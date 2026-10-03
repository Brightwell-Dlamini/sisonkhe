/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";
import BrandMark from "@/components/common/BrandMark";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-[#050505] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex justify-center mb-3">
            <BrandMark href="/kiosk" size="lg" showSubtitle />
          </div>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            National Taxi Rank Management \u2022 Kingdom of Eswatini
          </p>
        </div>
        {children}
        <p className="text-center text-[10px] text-zinc-400 mt-8">
          \u00a9 2026 National Road Transportation Council
        </p>
      </div>
    </div>
  );
}
