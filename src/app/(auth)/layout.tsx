/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-[#050505] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center gap-3 mb-3">
            <span className="text-3xl">🇸🇿</span>
            <div className="text-left">
              <h1 className="text-2xl font-black font-space tracking-tight text-zinc-900 dark:text-white uppercase">
                Sisonkhe
              </h1>
              <div className="flex items-center gap-1.5">
                <div className="flex h-1.5 rounded-xs overflow-hidden">
                  <div className="w-4 bg-[#e11d48]" />
                  <div className="w-4 bg-[#eab308]" />
                  <div className="w-4 bg-[#38bdf8]" />
                </div>
                <span className="text-[10px] font-bold text-zinc-500 italic">
                  In Transit
                </span>
              </div>
            </div>
          </div>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            National Taxi Rank Management • Kingdom of Eswatini
          </p>
        </div>
        {children}
        <p className="text-center text-[10px] text-zinc-400 mt-8">
          © 2026 National Road Transportation Council
        </p>
      </div>
    </div>
  );
}
