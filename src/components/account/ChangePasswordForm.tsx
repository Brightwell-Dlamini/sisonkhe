/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

"use client";

import { useState } from "react";
import { KeyRound, Eye, EyeOff, Check, X } from "lucide-react";
import { Button, Input, useToast } from "@/components/ui";

function Rule({ ok, label }: { ok: boolean; label: string }) {
  return (
    <li
      className={`flex items-center gap-1.5 text-[11px] transition-colors ${
        ok ? "text-emerald-400" : "text-zinc-500"
      }`}
    >
      {ok ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
      {label}
    </li>
  );
}

export default function ChangePasswordForm() {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [loading, setLoading] = useState(false);
  const toast = useToast();

  const reset = () => {
    setCurrent("");
    setNext("");
    setConfirm("");
    setShowCurrent(false);
    setShowNew(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (next.length < 8) {
      toast.error("New password must be at least 8 characters");
      return;
    }
    if (next !== confirm) {
      toast.error("Passwords do not match");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/account/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword: current, newPassword: next }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Password change failed");
        return;
      }
      toast.success("Password updated");
      reset();
    } catch {
      toast.error("Network error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="group relative overflow-hidden rounded-3xl border border-white/[0.08] bg-[#0F0F10] p-6 transition-colors hover:border-white/[0.14]">
      <div
        aria-hidden
        className="pointer-events-none absolute -top-20 -left-20 h-48 w-48 rounded-full bg-emerald-500/10 blur-3xl opacity-0 transition-opacity duration-500 group-hover:opacity-100"
      />

      <div className="relative mb-5 flex items-center gap-3 border-b border-white/[0.06] pb-4">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-emerald-500/20 bg-emerald-500/10">
          <KeyRound className="h-4 w-4 text-emerald-400" />
        </div>
        <div>
          <h2 className="text-sm font-black uppercase tracking-wide text-white">
            Change Password
          </h2>
          <p className="text-[11px] text-zinc-500">
            Update your sign-in credentials.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="relative space-y-4">
        <div>
          <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-zinc-500">
            Current Password
          </label>
          <div className="relative">
            <Input
              type={showCurrent ? "text" : "password"}
              value={current}
              onChange={(e) => setCurrent(e.target.value)}
              required
              autoComplete="current-password"
              className="pr-10"
            />
            <button
              type="button"
              onClick={() => setShowCurrent((v) => !v)}
              aria-label={showCurrent ? "Hide password" : "Show password"}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 transition-colors hover:text-white"
            >
              {showCurrent ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>

        <div>
          <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-zinc-500">
            New Password
          </label>
          <div className="relative">
            <Input
              type={showNew ? "text" : "password"}
              value={next}
              onChange={(e) => setNext(e.target.value)}
              required
              minLength={8}
              autoComplete="new-password"
              className="pr-10"
            />
            <button
              type="button"
              onClick={() => setShowNew((v) => !v)}
              aria-label={showNew ? "Hide password" : "Show password"}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 transition-colors hover:text-white"
            >
              {showNew ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>

          {/* Live rule hints */}
          <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
            <Rule ok={next.length >= 8} label="8+ characters" />
            <Rule ok={next.length > 0 && next === confirm} label="Matches confirm" />
          </ul>
        </div>

        <div>
          <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-zinc-500">
            Confirm New Password
          </label>
          <Input
            type="password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            required
            minLength={8}
            autoComplete="new-password"
          />
        </div>

        <div className="pt-1">
          <Button
            type="submit"
            loading={loading}
            leadingIcon={KeyRound}
            fullWidth
          >
            Update Password
          </Button>
        </div>
      </form>
    </div>
  );
}
