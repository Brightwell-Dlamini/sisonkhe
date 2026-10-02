/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Shared header auth controls: Account link + Log out when signed in,
 * Log in when signed out (e.g. public kiosk).
 */

"use client";

import { useState } from "react";
import Link from "next/link";
import { LogIn, LogOut, Loader2, User } from "lucide-react";
import { signOut } from "@/lib/auth/client";
import { useAuth } from "@/hooks/useAuth";

interface Props {
  /** When provided (authenticated layouts), skip useAuth and show this name. */
  fullName?: string;
  /** Compact icon-only logout on very small screens */
  className?: string;
}

export default function NavAuthActions({ fullName, className = "" }: Props) {
  const auth = useAuth();
  const [signingOut, setSigningOut] = useState(false);

  const name = fullName ?? auth.user?.fullName ?? null;
  const isAuthenticated = fullName ? true : auth.isAuthenticated;

  const handleSignOut = async () => {
    setSigningOut(true);
    try {
      await signOut();
      window.location.href = "/login";
    } catch {
      setSigningOut(false);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <Link
          href="/login"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-black uppercase tracking-wider shadow-sm"
        >
          <LogIn className="w-3.5 h-3.5" />
          Log in
        </Link>
      </div>
    );
  }

  return (
    <div className={`flex items-center gap-2 sm:gap-3 ${className}`}>
      <Link
        href="/account"
        className="inline-flex items-center gap-1.5 text-[11px] font-bold text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 max-w-[10rem] sm:max-w-[14rem] truncate"
        title={name ?? "Account"}
      >
        <User className="w-3.5 h-3.5 shrink-0" />
        <span className="truncate">{name ?? "Account"}</span>
      </Link>
      <button
        type="button"
        onClick={handleSignOut}
        disabled={signingOut}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-100 dark:bg-zinc-800 hover:bg-red-50 dark:hover:bg-red-950/40 text-zinc-700 dark:text-zinc-300 hover:text-red-700 dark:hover:text-red-300 border border-zinc-200 dark:border-zinc-700 hover:border-red-200 dark:hover:border-red-900 text-[11px] font-black uppercase tracking-wider disabled:opacity-50"
      >
        {signingOut ? (
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
        ) : (
          <LogOut className="w-3.5 h-3.5" />
        )}
        <span className="hidden xs:inline sm:inline">
          {signingOut ? "Signing out…" : "Log out"}
        </span>
      </button>
    </div>
  );
}
