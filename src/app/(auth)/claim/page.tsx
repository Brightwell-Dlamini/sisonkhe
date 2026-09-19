/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Marshal account claim flow.
 * Three steps:
 *   1. Verify identity (national ID + phone)
 *   2. Set username + password
 *   3. Success
 */

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ShieldCheck,
  ArrowRight,
  Eye,
  EyeOff,
  Loader2,
  AlertCircle,
  CheckCircle2,
  ArrowLeft,
  User,
} from "lucide-react";

type Step = "verify" | "credentials" | "success";

export default function ClaimPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("verify");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Form fields
  const [idNumber, setIdNumber] = useState("");
  const [phone, setPhone] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [fullName, setFullName] = useState("");

  // --- Step 1: Verify identity -------------------------------------------
  async function onVerify(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/claim", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idNumber, phone }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Verification failed");
        setLoading(false);
        return;
      }

      setFullName(data.fullName);
      setStep("credentials");
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  // --- Step 2: Create account --------------------------------------------
  async function onCreate(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/claim", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idNumber, phone, username, password }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Account creation failed");
        setLoading(false);
        return;
      }

      setStep("success");

      // Auto-redirect after 2.5s
      setTimeout(() => {
        router.push("/");
        router.refresh();
      }, 2500);
    } catch {
      setError("Network error. Please try again.");
      setLoading(false);
    }
  }

  return (
    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-xl p-6 sm:p-8">
      {/* Progress indicator */}
      <div className="flex items-center gap-2 mb-6">
        {(["verify", "credentials", "success"] as Step[]).map((s, idx) => {
          const stepIndex = ["verify", "credentials", "success"].indexOf(step);
          const isActive = idx <= stepIndex;
          return (
            <div
              key={s}
              className={`flex-1 h-1.5 rounded-full transition-colors ${
                isActive ? "bg-emerald-500" : "bg-zinc-200 dark:bg-zinc-800"
              }`}
            />
          );
        })}
      </div>

      {/* Header */}
      <div className="mb-6">
        <h2 className="text-lg font-black text-zinc-900 dark:text-white uppercase tracking-wide flex items-center gap-2">
          {step === "verify" && (
            <>
              <ShieldCheck className="w-5 h-5 text-emerald-500" />
              Claim Your Account
            </>
          )}
          {step === "credentials" && (
            <>
              <User className="w-5 h-5 text-emerald-500" />
              Set Your Credentials
            </>
          )}
          {step === "success" && (
            <>
              <CheckCircle2 className="w-5 h-5 text-emerald-500" />
              Welcome!
            </>
          )}
        </h2>
        <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
          {step === "verify" &&
            "Enter the National ID and phone number you registered with."}
          {step === "credentials" &&
            "Choose a username and password. You'll use these to sign in."}
          {step === "success" && "Your account is ready. Signing you in…"}
        </p>
      </div>

      {error && (
        <div className="mb-4 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 rounded-xl p-3 flex items-start gap-2 text-xs">
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {/* Step 1: Verify */}
      {step === "verify" && (
        <form onSubmit={onVerify} className="space-y-4">
          <div>
            <label className="block text-[11px] font-bold uppercase text-zinc-500 dark:text-zinc-400 mb-1.5">
              National ID Number
            </label>
            <input
              type="text"
              inputMode="numeric"
              value={idNumber}
              onChange={(e) => setIdNumber(e.target.value)}
              required
              placeholder="13 digits, e.g. 7609236100542"
              className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3.5 py-2.5 text-sm font-mono text-zinc-900 dark:text-white focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold uppercase text-zinc-500 dark:text-zinc-400 mb-1.5">
              Registered Phone Number
            </label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              required
              placeholder="e.g. 78653001"
              className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3.5 py-2.5 text-sm font-mono text-zinc-900 dark:text-white focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-black text-xs uppercase tracking-wider rounded-xl shadow-md flex items-center justify-center gap-2 transition-all"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Verifying…</span>
              </>
            ) : (
              <>
                <span>Verify Identity</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>
      )}

      {/* Step 2: Credentials */}
      {step === "credentials" && (
        <form onSubmit={onCreate} className="space-y-4">
          <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl p-3 text-xs">
            <div className="font-bold text-emerald-900 dark:text-emerald-200">
              Welcome, {fullName}
            </div>
            <div className="text-emerald-700 dark:text-emerald-300 text-[11px] mt-0.5">
              Identity verified. Now set your login credentials.
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-bold uppercase text-zinc-500 dark:text-zinc-400 mb-1.5">
              Username
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value.toLowerCase())}
              required
              placeholder="e.g. bongani.hlophe"
              pattern="[a-z0-9._]{3,32}"
              title="3-32 characters, lowercase letters, numbers, dots or underscores"
              className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3.5 py-2.5 text-sm font-medium text-zinc-900 dark:text-white focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
            />
            <p className="text-[10px] text-zinc-400 mt-1">
              You'll use this to sign in. Lowercase letters, numbers, dots, underscores.
            </p>
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
                required
                minLength={8}
                placeholder="At least 8 characters"
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

          <div>
            <label className="block text-[11px] font-bold uppercase text-zinc-500 dark:text-zinc-400 mb-1.5">
              Confirm Password
            </label>
            <input
              type={showPassword ? "text" : "password"}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              minLength={8}
              placeholder="Re-enter your password"
              className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3.5 py-2.5 text-sm font-medium text-zinc-900 dark:text-white focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
            />
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setStep("verify")}
              className="px-4 py-3 bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 rounded-xl text-xs font-bold flex items-center gap-1.5"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Back
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-black text-xs uppercase tracking-wider rounded-xl shadow-md flex items-center justify-center gap-2 transition-all"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Creating account…</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Create Account</span>
                </>
              )}
            </button>
          </div>
        </form>
      )}

      {/* Step 3: Success */}
      {step === "success" && (
        <div className="text-center py-6">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-950/60 mb-4">
            <CheckCircle2 className="w-8 h-8 text-emerald-600 dark:text-emerald-400" />
          </div>
          <h3 className="text-base font-black text-zinc-900 dark:text-white uppercase">
            Account Ready
          </h3>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-2">
            You are being signed in to Sisonkhe In Transit.
          </p>
        </div>
      )}

      {/* Footer link */}
      {step === "verify" && (
        <div className="mt-6 pt-4 border-t border-zinc-100 dark:border-zinc-800 text-center">
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Already claimed your account?{" "}
            <Link
              href="/login"
              className="font-bold text-emerald-600 dark:text-emerald-400 hover:underline"
            >
              Sign in
            </Link>
          </p>
        </div>
      )}
    </div>
  );
}
