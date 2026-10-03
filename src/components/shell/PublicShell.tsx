"use client";

import Link from "next/link";
import { Radio, Shield, LogIn } from "lucide-react";
import { usePathname } from "next/navigation";

interface Props {
  children: React.ReactNode;
  hideChrome?: boolean;
}

export default function PublicShell({ children, hideChrome }: Props) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-[#050505] text-white">
      {!hideChrome && (
        <header className="border-b border-white/[0.06] bg-[#0A0A0A]/95 backdrop-blur-lg sticky top-0 z-30">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
            <Link href="/kiosk" className="flex items-center gap-2">
              <span className="text-lg">🇸🇿</span>
              <span className="font-black tracking-tight">Sisonkhe</span>
            </Link>

            <nav className="flex items-center gap-1">
              <Link
                href="/kiosk"
                className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors ${
                  pathname.startsWith("/kiosk")
                    ? "bg-white/[0.06] text-white"
                    : "text-zinc-400 hover:text-white"
                }`}
              >
                <Radio className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Departures</span>
              </Link>

              <Link
                href="/verify"
                className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors ${
                  pathname.startsWith("/verify")
                    ? "bg-white/[0.06] text-white"
                    : "text-zinc-400 hover:text-white"
                }`}
              >
                <Shield className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Verify</span>
              </Link>

              <div className="w-px h-5 bg-white/[0.08] mx-1" />

              <Link
                href="/login"
                className="px-3 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider bg-emerald-500 hover:bg-emerald-400 text-black flex items-center gap-1.5 transition-colors"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>Sign In</span>
              </Link>
            </nav>
          </div>
        </header>
      )}

      {children}
    </div>
  );
}
