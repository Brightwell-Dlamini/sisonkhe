/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  LogIn,
  Eye,
  EyeOff,
  Loader2,
  AlertCircle,
  Monitor,
  KeyRound,
} from "lucide-react";
import {
  signInWithPassword,
  changePassword,
  homePathForRole,
} from "@/lib/auth/client";
import { useAuthStore } from "@/store/useAuthStore";
import type { ResolvedUser } from "@/lib/auth/roles";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const rawRedirect = searchParams.get("redirect");
  const redirectParam =
    rawRedirect && rawRedirect.startsWith("/") && !rawRedirect.startsWith("//")
      ? rawRedirect
      : null;

  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [forceChange, setForceChange] = useState(false);
  const [pendingUser, setPendingUser] = useState<ResolvedUser | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  async function finishLogin(user: ResolvedUser | undefined) {
    if (user) {
      useAuthStore.getState().setUser(user);
    } else {
      await useAuthStore.getState().refresh();
    }

    const destination =
      redirectParam && redirectParam !== "/"
        ? redirectParam
        : homePathForRole(user?.role);

    router.push(destination);
    router.refresh();
  }

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

    if (result.mustChangePassword) {
      setPendingUser(result.user ?? null);
      setForceChange(true);
      setLoading(false);
      return;
    }

    await finishLogin(result.user);
  }

  async function onChangePassword(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (newPassword.length < 8) {
      setError("New password must be at least 8 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    if (newPassword === password) {
      setError("Choose a password different from the temporary one.");
      return;
    }

    setLoading(true);
    const result = await changePassword(password, newPassword);
    if (!result.success) {
      setError(result.error ?? "Could not update password");
      setLoading(false);
      return;
    }

    await finishLogin(pendingUser ?? undefined);
  }

  if (forceChange) {
    return (
      <div className="bg-[#0F0F10] border border-white/[0.06] rounded-2xl shadow-xl p-6 sm:p-8">
        <div className="mb-6">
          <h2 className="text-lg font-black text-white uppercase tracking-wide flex items-center gap-2">
            <KeyRound className="w-5 h-5 text-amber-400" />
            Set a new password
          </h2>
          <p className="text-xs text-zinc-400 mt-1">
            Your account was issued a temporary password. Choose a permanent one
            before continuing.
          </p>
        </div>

        {error && (
          <div className="mb-4 bg-red-950/40 border border-red-800 text-red-300 rounded-xl p-3 flex items-start gap-2 text-xs">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={onChangePassword} className="space-y-4">
          <div>
            <label className="block text-[11px] font-bold uppercase text-zinc-500 mb-1.5">
              New password
            </label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              minLength={8}
              className="w-full bg-white/[0.03] border border-white/[0.06] rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500"
            />
          </div>
          <div>
            <label className="block text-[11px] font-bold uppercase text-zinc-500 mb-1.5">
              Confirm new password
            </label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              minLength={8}
              className="w-full bg-white/[0.03] border border-white/[0.06] rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-black text-xs uppercase tracking-wider rounded-xl flex items-center justify-center gap-2"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <KeyRound className="w-4 h-4" />
            )}
            Save and continue
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="bg-[#0F0F10] border border-white/[0.06] rounded-2xl shadow-xl p-6 sm:p-8">
      <div className="mb-6">
        <h2 className="text-lg font-black text-white uppercase tracking-wide">
          Sign In
        </h2>
        <p className="text-xs text-zinc-400 mt-1">
          Enter your username, phone number, or National ID
        </p>
      </div>

      {error && (
        <div className="mb-4 bg-red-950/40 border border-red-800 text-red-300 rounded-xl p-3 flex items-start gap-2 text-xs">
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <label className="block text-[11px] font-bold uppercase text-zinc-500 mb-1.5">
            Username / Phone / National ID
          </label>
          <input
            type="text"
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            autoComplete="username"
            required
            className="w-full bg-white/[0.03] border border-white/[0.06] rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500"
          />
        </div>

        <div>
          <label className="block text-[11px] font-bold uppercase text-zinc-500 mb-1.5">
            Password
          </label>
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required
              className="w-full bg-white/[0.03] border border-white/[0.06] rounded-xl px-3.5 py-2.5 pr-10 text-sm text-white focus:outline-none focus:border-emerald-500"
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-200"
              aria-label={showPassword ? "Hide password" : "Show password"}
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
          className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-black text-xs uppercase tracking-wider rounded-xl flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Signing in…
            </>
          ) : (
            <>
              <LogIn className="w-4 h-4" />
              Sign In
            </>
          )}
        </button>
      </form>

      <div className="mt-6 rounded-2xl border border-white/[0.06] bg-[#0F0F10] p-4">
        <div className="mb-3 text-[10px] font-black uppercase tracking-[0.24em] text-zinc-500">
          Quick roles
        </div>
        <div className="grid grid-cols-2 gap-2">
          {[
            ["Marshal", "Queue and dispatch"],
            ["Driver", "Roster and status"],
            ["Operator", "Fleet and renewals"],
            ["Inspector", "Checks and tickets"],
          ].map(([name, detail]) => (
            <div
              key={name}
              className="rounded-xl border border-white/[0.05] bg-white/[0.02] px-2.5 py-2.5"
            >
              <div className="text-[10px] font-black uppercase tracking-[0.18em] text-emerald-400">
                {name}
              </div>
              <div className="mt-1 text-[10px] leading-relaxed text-zinc-500">
                {detail}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-5 space-y-3">
        <Link
          href="/kiosk"
          className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl border border-white/[0.06] bg-white/[0.03] text-xs font-bold text-zinc-200 hover:border-emerald-500/50 hover:text-emerald-400 transition-colors"
        >
          <Monitor className="w-3.5 h-3.5" />
          View public kiosk
        </Link>

        <p className="text-center text-[11px] text-zinc-500 space-y-1">
          <span className="block">
            Registered but no password yet?{" "}
            <Link href="/claim" className="font-bold text-emerald-600 hover:underline">
              Claim your account
            </Link>
            {" "}
            (marshal or driver)
          </span>
          <span className="block">
            New profile only?{" "}
            <Link href="/register/driver" className="font-bold text-emerald-600 hover:underline">
              Driver registration
            </Link>
            {" · "}
            <Link href="/register/vehicle" className="font-bold text-emerald-600 hover:underline">
              Vehicle record
            </Link>
            {" "}
            (data only — no login, no linking)
          </span>
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
