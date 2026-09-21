/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Loader2, ArrowLeft, Building2, Award } from "lucide-react";
import { useRequireAuth } from "@/hooks/useRequireAuth";

const NAV_ITEMS = [
  { href: "/operator/renewals", label: "Permit Renewals", icon: Award },
];

export default function OperatorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading } = useRequireAuth(["operator"]);
  const pathname = usePathname();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-50 dark:bg-[#050505]">
        <Loader2 className="w-6 h-6 animate-spin text-amber-600" />
      </div>
    );
  }

  if (!user || user.role !== "operator") return null;

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-[#050505]">
      <div className="border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="flex items-center gap-1.5 text-xs font-bold text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Home
            </Link>
            <div className="h-4 w-px bg-zinc-200 dark:bg-zinc-800" />
            <div className="flex items-center gap-2">
              <Building2 className="w-4 h-4 text-amber-600" />
              <span className="text-xs font-black uppercase tracking-wider text-zinc-900 dark:text-white">
                Operator Portal
              </span>
            </div>
          </div>
          <Link
            href="/account"
            className="text-[11px] font-bold text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
          >
            {user.fullName} →
          </Link>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 grid grid-cols-1 md:grid-cols-[220px_1fr] gap-6">
        <aside className="space-y-1">
          {NAV_ITEMS.map((item) => {
            const isActive = pathname.startsWith(item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold transition-colors ${
                  isActive
                    ? "bg-amber-500 text-black"
                    : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                }`}
              >
                <Icon className="w-4 h-4" />
                {item.label}
              </Link>
            );
          })}
        </aside>

        <main>{children}</main>
      </div>
    </div>
  );
}
