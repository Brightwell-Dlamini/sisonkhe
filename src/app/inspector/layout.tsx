/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Loader2, ArrowLeft, ShieldAlert, QrCode, FileText } from "lucide-react";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import NavAuthActions from "@/components/common/NavAuthActions";
import OfflineBanner from "@/components/offline/OfflineBanner";

const NAV_ITEMS = [
  { href: "/inspector/scan", label: "Scan Vehicle", icon: QrCode },
  { href: "/inspector/tickets", label: "My Tickets", icon: FileText },
];

export default function InspectorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading } = useRequireAuth(["inspector"]);
  const pathname = usePathname();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-50 dark:bg-[#050505]">
        <Loader2 className="w-6 h-6 animate-spin text-red-600" />
      </div>
    );
  }

  if (!user || user.role !== "inspector") return null;

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-[#050505]">
      <OfflineBanner />
      <div className="border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 sticky top-0 z-20">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
          <Link
            href="/"
            className="flex items-center gap-1.5 text-xs font-bold text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Home
          </Link>
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-red-600" />
            <span className="text-xs font-black uppercase tracking-wider text-zinc-900 dark:text-white">
              Inspector
            </span>
          </div>
          <NavAuthActions fullName={user.fullName} />
        </div>

        <div className="max-w-3xl mx-auto px-4 sm:px-6 pb-2 flex gap-1">
          {NAV_ITEMS.map((item) => {
            const isActive = pathname.startsWith(item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors ${
                  isActive
                    ? "bg-red-600 text-white"
                    : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {item.label}
              </Link>
            );
          })}
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6">{children}</div>
    </div>
  );
}
