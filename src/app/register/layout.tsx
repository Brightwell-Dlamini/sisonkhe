/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Institutional registration shell — wider canvas matching marshal registration.
 */

import Link from "next/link";

export default function RegisterLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-slate-100 text-slate-900">
      <header className="border-b border-slate-200 bg-white/90 backdrop-blur-sm sticky top-0 z-30">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-3">
          <Link href="/" className="flex items-center gap-2.5 group">
            <span className="text-xl">🇸🇿</span>
            <div>
              <div className="text-sm font-black uppercase tracking-tight text-slate-900 group-hover:text-slate-700">
                Sisonkhe
              </div>
              <div className="flex items-center gap-1.5">
                <div className="flex h-1 rounded-sm overflow-hidden">
                  <div className="w-3 bg-rose-600" />
                  <div className="w-3 bg-amber-400" />
                  <div className="w-3 bg-sky-400" />
                </div>
                <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">
                  In Transit
                </span>
              </div>
            </div>
          </Link>
          <nav className="flex items-center gap-2 text-[11px] font-bold">
            <Link
              href="/register/driver"
              className="px-2.5 py-1.5 rounded-lg text-slate-600 hover:bg-slate-100 hover:text-slate-900"
            >
              Driver
            </Link>
            <Link
              href="/register/vehicle"
              className="px-2.5 py-1.5 rounded-lg text-slate-600 hover:bg-slate-100 hover:text-slate-900"
            >
              Vehicle
            </Link>
            <Link
              href="/login"
              className="px-3 py-1.5 rounded-lg bg-slate-900 text-white hover:bg-slate-800"
            >
              Sign in
            </Link>
          </nav>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-3 sm:px-6 py-6 sm:py-10">{children}</main>

      <footer className="border-t border-slate-200 py-6 text-center text-[10px] text-slate-500 uppercase tracking-wider">
        © 2026 National Road Transportation Council · Kingdom of Eswatini
      </footer>
    </div>
  );
}
