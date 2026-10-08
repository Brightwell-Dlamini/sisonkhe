/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Claim account for marshal OR driver (portal-collected identity).
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
  Monitor,
  LogIn,
} from "lucide-react";
import { RoleGuidance } from "@/components/common/RoleGuidance";
import { homeRouteForRole, toNavRole } from "@/lib/navigation/resolve";

type Step = "verify" | "credentials" | "success";
type ClaimRole = "marshal" | "driver";

interface ClaimResponse {
  success?: boolean;
  signedIn?: boolean;
  verified?: boolean;
  user?: { role?: string } | null;
  error?: string;
  fullName?: string;
  message?: string;
}

const REDIRECT_DELAY_MS = 1500;

export default function ClaimPage() {
  const router = useRouter();
  const [role, setRole] = useState<ClaimRole>("marshal");
  const [step, setStep] = useState<Step>("verify");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const [idNumber, setIdNumber] = useState("");
  const [phone, setPhone] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [fullName, setFullName] = useState("");

  const claimPath =
    role === "driver" ? "/api/auth/claim/driver" : "/api/auth/claim";

  function switchRole(next: ClaimRole) {
    setRole(next);
    setStep("verify");
    setError("");
    setFullName("");
  }

  async function onVerify(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const body =
        role === "driver"
          ? { nationalId: idNumber, phone }
          : { idNumber, phone };

      const res = await fetch(claimPath, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = (await res.json()) as ClaimResponse;

      if (!res.ok) {
        setError(data.error ?? "Verification failed");
        setLoading(false);
        return;
      }

      setFullName(data.fullName ?? "");
      setStep("credentials");
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

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
      const body =
        role === "driver"
          ? { nationalId: idNumber, phone, username, password }
          : { idNumber, phone, username, password };

      const res = await fetch(claimPath, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = (await res.json()) as ClaimResponse;

      if (!res.ok) {
        setError(data.error ?? "Account creation failed");
        setLoading(false);
        return;
      }

      setStep("success");

      const navRole = data.user?.role
        ? toNavRole(data.user.role)
        : role === "driver"
          ? "driver"
          : "marshal";
      const destination = homeRouteForRole(navRole ?? role);

      window.setTimeout(() => {
        router.replace(destination);
        router.refresh();
      }, REDIRECT_DELAY_MS);
    } catch {
      setError("Network error. Please try again.");
      setLoading(false);
    }
  }

  return (
    <div className="bg-[#0F0F10] border border-white/[0.06] rounded-2xl shadow-xl p-6 sm:p-8">
      <div className="flex gap-2 mb-5">
        {(["marshal", "driver"] as ClaimRole[]).map((r) => (
          <button
            key={r}
            type="button"
            onClick={() => switchRole(r)}
            disabled={step !== "verify"}
            className={`flex-1 py-2 rounded-xl text-[11px] font-black uppercase tracking-wider border transition ${
              role === r
                ? "bg-emerald-600 border-emerald-500 text-white"
                : "bg-white/[0.03] border-white/[0.06] text-zinc-400"
            }`}
          >
            {r}
          </button>
        ))}
      </div>

      <div className="flex items-center gap-2 mb-6">
        {(["verify", "credentials", "success"] as Step[]).map((s, idx) => {
          const stepIndex = ["verify", "credentials", "success"].indexOf(step);
          const isActive = idx <= stepIndex;
          return (
            <div
              key={s}
              className={`flex-1 h-1.5 rounded-full transition-colors ${
                isActive ? "bg-emerald-500" : "bg-zinc-700"
              }`}
            />
          );
        })}
      </div>

      <RoleGuidance
        title="Useful links"
        className="mb-6 border-white/[0.08] bg-[#111214] text-white"
        items={[
          {
            label: "Public kiosk",
            detail: "Browse live route and transport information while you wait for account access.",
            href: "/kiosk",
            icon: Monitor,
          },
          {
            label: "Sign in",
            detail: "Use your issued username and password to access your dashboard once the claim is complete.",
            href: "/login",
            icon: LogIn,
          },
        ]}
      />

      <div className="mb-6">
        <h2 className="text-lg font-black text-white uppercase tracking-wide flex items-center gap-2">
          {step === "verify" && (
            <>
              <ShieldCheck className="w-5 h-5 text-emerald-500" />
              Claim {role} account
            </>
          )}
          {step === "credentials" && (
            <>
              <User className="w-5 h-5 text-emerald-500" />
              Set credentials
            </>
          )}
          {step === "success" && (
            <>
              <CheckCircle2 className="w-5 h-5 text-emerald-500" />
              Welcome!
            </>
          )}
        </h2>
        <p className="text-xs text-zinc-400 mt-1">
          {step === "verify" &&
            "Enter the National ID and phone from your registration profile."}
          {step === "credentials" &&
            "Choose a username and password for sign-in."}
          {step === "success" && "Your account is ready. Signing you in…"}
        </p>
      </div>

      {error && (
        <div className="mb-4 bg-red-950/40 border border-red-800 text-red-300 rounded-xl p-3 flex items-start gap-2 text-xs">
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {step === "verify" && (
        <form onSubmit={onVerify} className="space-y-4">
          <div>
            <label className="block text-[11px] font-bold uppercase text-zinc-500 mb-1.5">
              National ID Number
            </label>
            <input
              type="text"
              inputMode="numeric"
              value={idNumber}
              onChange={(e) => setIdNumber(e.target.value)}
              required
              placeholder="13 digits"
              className="w-full bg-white/[0.03] border border-white/[0.06] rounded-xl px-3.5 py-2.5 text-sm font-mono text-white focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold uppercase text-zinc-500 mb-1.5">
              Registered Phone Number
            </label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              required
              placeholder="e.g. 78653001"
              className="w-full bg-white/[0.03] border border-white/[0.06] rounded-xl px-3.5 py-2.5 text-sm font-mono text-white focus:outline-none focus:border-emerald-500"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-black text-xs uppercase tracking-wider rounded-xl flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Verifying…
              </>
            ) : (
              <>
                Verify Identity
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>
      )}

      {step === "credentials" && (
        <form onSubmit={onCreate} className="space-y-4">
          <div className="bg-emerald-950/40 border border-emerald-800 rounded-xl p-3 text-xs">
            <div className="font-bold text-emerald-200">Welcome, {fullName}</div>
            <div className="text-emerald-300 text-[11px] mt-0.5">
              Identity verified. Set login credentials.
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-bold uppercase text-zinc-500 mb-1.5">
              Username
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value.toLowerCase())}
              required
              pattern="[a-z0-9._]{3,32}"
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
                required
                minLength={8}
                className="w-full bg-white/[0.03] border border-white/[0.06] rounded-xl px-3.5 py-2.5 pr-10 text-sm text-white focus:outline-none focus:border-emerald-500"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-bold uppercase text-zinc-500 mb-1.5">
              Confirm Password
            </label>
            <input
              type={showPassword ? "text" : "password"}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              minLength={8}
              className="w-full bg-white/[0.03] border border-white/[0.06] rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setStep("verify")}
              className="px-4 py-3 bg-white/[0.06] text-zinc-300 rounded-xl text-xs font-bold flex items-center gap-1.5"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Back
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-black text-xs uppercase tracking-wider rounded-xl flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Creating…
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  Create Account
                </>
              )}
            </button>
          </div>
        </form>
      )}

      {step === "success" && (
        <div className="text-center py-6">
          <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto mb-4" />
          <h3 className="text-base font-black text-white uppercase">Account Ready</h3>
          <p className="text-xs text-zinc-400 mt-2">Signing you in…</p>
        </div>
      )}

      {step === "verify" && (
        <div className="mt-6 pt-4 border-t border-white/[0.06] text-center text-xs text-zinc-400">
          Already claimed?{" "}
          <Link href="/login" className="font-bold text-emerald-400 hover:underline">
            Sign in
          </Link>
        </div>
      )}
    </div>
  );
}
