/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Public page: admin-issued claim link → user sets password → signed in.
 */

"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  Loader2,
  AlertCircle,
  CheckCircle2,
  Eye,
  EyeOff,
  ShieldCheck,
} from "lucide-react";
import { homeRouteForRole, toNavRole } from "@/lib/navigation/resolve";

type Status = "loading" | "ready" | "error" | "success";

export default function InviteClaimPage() {
  const params = useParams();
  const router = useRouter();
  const token = String(params?.token ?? "");

  const [status, setStatus] = useState<Status>("loading");
  const [error, setError] = useState("");
  const [username, setUsername] = useState("");
  const [role, setRole] = useState("");
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [show, setShow] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!token) {
      setStatus("error");
      setError("Missing invite token.");
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/auth/invite/${encodeURIComponent(token)}`, {
          cache: "no-store",
        });
        const data = await res.json();
        if (cancelled) return;
        if (!res.ok) {
          setStatus("error");
          setError(data.error ?? "Invalid invite link");
          return;
        }
        setUsername(data.username ?? data.data?.username ?? "");
        setRole(data.role ?? data.data?.role ?? "");
        setExpiresAt(data.expiresAt ?? data.data?.expiresAt ?? null);
        setStatus("ready");
      } catch {
        if (!cancelled) {
          setStatus("error");
          setError("Network error. Try again.");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(`/api/auth/invite/${encodeURIComponent(token)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password, confirmPassword: confirm }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Could not set password");
        setSubmitting(false);
        return;
      }
      setStatus("success");
      const navRole = data.user?.role
        ? toNavRole(data.user.role)
        : toNavRole(role);
      const dest = homeRouteForRole(navRole ?? "driver");
      window.setTimeout(() => {
        router.replace(data.signedIn ? dest : "/login");
        router.refresh();
      }, 1200);
    } catch {
      setError("Network error. Try again.");
      setSubmitting(false);
    }
  }

  return (
    <div className="bg-[#0F0F10] border border-white/[0.06] rounded-2xl shadow-xl p-6 sm:p-8">
      <h2 className="text-lg font-black text-white uppercase tracking-wide flex items-center gap-2 mb-1">
        <ShieldCheck className="w-5 h-5 text-emerald-500" />
        Set your password
      </h2>
      <p className="text-xs text-zinc-400 mb-6">
        Your administrator invited you to Sisonkhe. Choose a password to finish
        setting up your account.
      </p>

      {status === "loading" && (
        <div className="flex flex-col items-center py-10 gap-3 text-zinc-400">
          <Loader2 className="w-6 h-6 animate-spin text-emerald-400" />
          <p className="text-xs">Checking invite…</p>
        </div>
      )}

      {status === "error" && (
        <div className="space-y-4">
          <div className="bg-red-950/40 border border-red-800 text-red-300 rounded-xl p-3 flex items-start gap-2 text-xs">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
          <Link
            href="/login"
            className="block text-center text-xs font-bold text-emerald-400 hover:underline"
          >
            Go to sign in
          </Link>
        </div>
      )}

      {status === "success" && (
        <div className="text-center py-8">
          <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto mb-3" />
          <p className="text-sm font-bold text-white">Password saved</p>
          <p className="text-xs text-zinc-400 mt-1">Signing you in…</p>
        </div>
      )}

      {status === "ready" && (
        <form onSubmit={onSubmit} className="space-y-4">
          {error && (
            <div className="bg-red-950/40 border border-red-800 text-red-300 rounded-xl p-3 flex items-start gap-2 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <div className="bg-emerald-950/30 border border-emerald-800/40 rounded-xl p-3 text-xs">
            <div className="text-[10px] uppercase font-bold text-emerald-400/80">
              Username
            </div>
            <div className="font-mono font-bold text-white mt-0.5">{username}</div>
            {expiresAt && (
              <div className="text-[10px] text-zinc-500 mt-1">
                Link expires {new Date(expiresAt).toLocaleString()}
              </div>
            )}
          </div>

          <div>
            <label className="block text-[11px] font-bold uppercase text-zinc-500 mb-1.5">
              New password
            </label>
            <div className="relative">
              <input
                type={show ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
                autoComplete="new-password"
                className="w-full bg-white/[0.03] border border-white/[0.06] rounded-xl px-3.5 py-2.5 pr-10 text-sm text-white focus:outline-none focus:border-emerald-500"
              />
              <button
                type="button"
                onClick={() => setShow((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400"
              >
                {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-bold uppercase text-zinc-500 mb-1.5">
              Confirm password
            </label>
            <input
              type={show ? "text" : "password"}
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              required
              minLength={8}
              autoComplete="new-password"
              className="w-full bg-white/[0.03] border border-white/[0.06] rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500"
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-black text-xs uppercase tracking-wider rounded-xl flex items-center justify-center gap-2"
          >
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Saving…
              </>
            ) : (
              "Save password & continue"
            )}
          </button>
        </form>
      )}
    </div>
  );
}
