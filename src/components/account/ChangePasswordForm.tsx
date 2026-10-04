/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

"use client";

import { useState } from "react";
import { KeyRound, Eye, EyeOff } from "lucide-react";
import { Button, Input, useToast } from "@/components/ui";

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
    <div className="bg-[#0F0F10] border border-white/[0.06] rounded-2xl p-5">
      <div className="flex items-center gap-2.5 mb-4 pb-4 border-b border-white/[0.06]">
        <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
          <KeyRound className="w-4 h-4 text-emerald-400" />
        </div>
        <div>
          <h2 className="text-sm font-black uppercase tracking-wide text-white">Change Password</h2>
          <p className="text-[11px] text-zinc-500">Update your sign-in credentials.</p>
        </div>
      </div>
      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <label className="block text-[11px] font-bold uppercase text-zinc-500 mb-1">Current Password</label>
          <div className="relative">
            <Input type={showCurrent ? "text" : "password"} value={current} onChange={(e) => setCurrent(e.target.value)} required autoComplete="current-password" />
            <button type="button" onClick={() => setShowCurrent((v) => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white">
              {showCurrent ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>
        <div>
          <label className="block text-[11px] font-bold uppercase text-zinc-500 mb-1">New Password</label>
          <div className="relative">
            <Input type={showNew ? "text" : "password"} value={next} onChange={(e) => setNext(e.target.value)} required minLength={8} autoComplete="new-password" />
            <button type="button" onClick={() => setShowNew((v) => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white">
              {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>
        <div>
          <label className="block text-[11px] font-bold uppercase text-zinc-500 mb-1">Confirm New Password</label>
          <Input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required minLength={8} autoComplete="new-password" />
        </div>
        <div className="pt-2">
          <Button type="submit" loading={loading} leadingIcon={KeyRound} fullWidth>Update Password</Button>
        </div>
      </form>
    </div>
  );
}
