/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { LogIn, Eye, EyeOff, Loader2, AlertCircle } from "lucide-react";
import { signInWithPassword } from "@/lib/auth/client";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get("redirect") ?? "/";

  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const result = await signInWithPassword(identifier, password);

    if (!result.success) {
      setError(result.error ?? "Sign in failed");
      setLoading(false);
      return;
    }

    router.push(redirect);
    router.refresh();
  }

  return (
    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-xl p-6 sm:p-8">
      <div className="mb-6">
        <h2 className="text-lg font-black text-zinc-900 dark:text-white uppercase tracking-wide">
          Sign In
        </h2>
        <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
          Enter your username, phone number, or National ID
        </p>
      </div>

      {error && (
        <div className="mb-4 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 rounded-xl p-3 flex items-start gap-2 text-xs">
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <label className="block text-[11px] font-bold uppercase text-zinc-500 dark:text-zinc-400 mb-1.5">
            Username / Phone / National ID
          </label>
          <input
            type="text"
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            autoComplete="username"
            autoCapitalize="off"
            required
            placeholder="e.g. 78653001 or 7609236100542"
            className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3.5 py-2.5 text-sm font-medium text-zinc-900 dark:text-white focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
          />
        </div>

        <div>
          <label className="block text-[11px] font-bold uppercase text-zinc-500 dark:text-zinc-400 mb-1.5">
            Password
          </label>
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required
              placeholder="••••••••"
              className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3.5 py-2.5 pr-10 text-sm font-medium text-zinc-900 dark:text-white focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
              tabIndex={-1}
            >
              {showPassword ? (
                <EyeOff className="w-4 h-4" />
              ) : (
                <Eye className="w-4 h-4" />
              )}
            </button>
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-black text-xs uppercase tracking-wider rounded-xl shadow-md flex items-center justify-center gap-2 transition-all"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Signing in…</span>
            </>
          ) : (
            <>
              <LogIn className="w-4 h-4" />
              <span>Sign In</span>
            </>
          )}
        </button>
      </form>

      <div className="mt-6 pt-4 border-t border-zinc-100 dark:border-zinc-800 text-center">
        <p className="text-xs text-zinc-500 dark:text-zinc-400">
          First time signing in?{" "}
          <Link
            href="/claim"
            className="font-bold text-emerald-600 dark:text-emerald-400 hover:underline"
          >
            Claim your account
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="text-center text-xs text-zinc-500">Loading…</div>}>
      <LoginForm />
    </Suspense>
  );
}
