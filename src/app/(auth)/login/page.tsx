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
      <div className="surface-raised p-6 sm:p-8 ui-enter">
        <div className="mb-6">
          <h2 className="text-display flex items-center gap-2 text-xl">
            <KeyRound className="w-5 h-5 text-amber-400" />
            Set a new password
          </h2>
          <p className="text-body mt-2">
            Your account was issued a temporary password. Choose a permanent one
            before continuing.
          </p>
        </div>

        {error && (
          <div className="mb-4 bg-rose-950/40 border border-rose-800 text-rose-200 rounded-xl p-3.5 flex items-start gap-2 text-sm">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={onChangePassword} className="space-y-4">
          <div>
            <label className="block text-meta mb-1.5">New password</label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              minLength={8}
              className="w-full min-h-12 bg-white/[0.03] border border-white/[0.08] rounded-xl px-3.5 text-[15px] text-white focus:outline-none focus:border-emerald-500/50"
            />
          </div>
          <div>
            <label className="block text-meta mb-1.5">Confirm new password</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              minLength={8}
              className="w-full min-h-12 bg-white/[0.03] border border-white/[0.08] rounded-xl px-3.5 text-[15px] text-white focus:outline-none focus:border-emerald-500/50"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full min-h-12 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-black font-bold text-sm rounded-xl flex items-center justify-center gap-2 touch-manipulation"
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
    <div className="surface-raised p-6 sm:p-8 ui-enter">
      <div className="mb-6">
        <h2 className="text-display text-xl">Sign in</h2>
        <p className="text-body mt-2">
          Username, phone number, or National ID
        </p>
      </div>

      {error && (
        <div className="mb-4 bg-rose-950/40 border border-rose-800 text-rose-200 rounded-xl p-3.5 flex items-start gap-2 text-sm">
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <label className="block text-meta mb-1.5">
            Username / Phone / National ID
          </label>
          <input
            type="text"
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            autoComplete="username"
            required
            className="w-full min-h-12 bg-white/[0.03] border border-white/[0.08] rounded-xl px-3.5 text-[15px] text-white focus:outline-none focus:border-emerald-500/50"
          />
        </div>

        <div>
          <label className="block text-meta mb-1.5">Password</label>
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required
              className="w-full min-h-12 bg-white/[0.03] border border-white/[0.08] rounded-xl px-3.5 pr-12 text-[15px] text-white focus:outline-none focus:border-emerald-500/50"
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="absolute right-2 top-1/2 -translate-y-1/2 min-h-11 min-w-11 inline-flex items-center justify-center text-zinc-400 hover:text-zinc-200"
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
          className="w-full min-h-12 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-black font-bold text-sm rounded-xl flex items-center justify-center gap-2 touch-manipulation"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Signing in…
            </>
          ) : (
            <>
              <LogIn className="w-4 h-4" />
              Sign in
            </>
          )}
        </button>
      </form>

      <div className="mt-6 rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4">
        <div className="mb-3 text-meta">Quick roles</div>
        <div className="grid grid-cols-2 gap-2">
          {[
            ["Marshal", "Queue and dispatch"],
            ["Driver", "Roster and status"],
            ["Operator", "Fleet and renewals"],
            ["Inspector", "Checks and tickets"],
          ].map(([name, detail]) => (
            <div
              key={name}
              className="rounded-xl border border-white/[0.05] bg-white/[0.02] px-3 py-2.5"
            >
              <div className="text-sm font-semibold text-emerald-400">{name}</div>
              <div className="mt-0.5 text-meta leading-relaxed">{detail}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-5 space-y-3">
        <Link
          href="/kiosk"
          className="flex items-center justify-center gap-2 w-full min-h-11 rounded-xl border border-white/[0.08] bg-white/[0.03] text-sm font-semibold text-zinc-200 hover:border-emerald-500/40 hover:text-emerald-300 transition-colors"
        >
          <Monitor className="w-4 h-4" />
          View public kiosk
        </Link>

        <p className="text-center text-[13px] text-zinc-500 space-y-1.5">
          <span className="block">
            Registered but no password yet?{" "}
            <Link href="/claim" className="font-semibold text-emerald-400 hover:underline">
              Claim your account
            </Link>
          </span>
          <span className="block">
            New profile only?{" "}
            <Link href="/register/driver" className="font-semibold text-emerald-400 hover:underline">
              Driver registration
            </Link>
            {" · "}
            <Link href="/register/vehicle" className="font-semibold text-emerald-400 hover:underline">
              Vehicle record
            </Link>
          </span>
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="text-center text-sm text-zinc-500 py-12">Loading…</div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
