/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

"use client";

import { useState } from "react";
import { Loader2, X, AlertCircle, Eye, EyeOff } from "lucide-react";
import type { StaffRow } from "@/lib/staff/queries";
import type { CreateStaffRequest } from "@/hooks/useStaff";

interface Props {
  mode: "create" | "edit";
  staff?: StaffRow;
  onClose: () => void;
  onSubmit: (
    input: CreateStaffRequest
  ) => Promise<{ success: boolean; error?: string; issues?: Record<string, string[]> }>;
}

const ROLES = [
  { value: "super-admin", label: "Super Admin", scoped: false, desc: "Full system access across all regions" },
  { value: "admin", label: "Rank Administrator", scoped: true, desc: "Manages a specific region's terminals" },
  { value: "fleet-manager", label: "Fleet Manager", scoped: false, desc: "National scope — permits & compliance" },
  { value: "inspector", label: "Traffic Inspector", scoped: true, desc: "Enforcement within a specific region" },
];

const REGIONS = ["Hhohho", "Manzini", "Lubombo", "Shiselweni"];

function generatePassword(): string {
  const letters = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  const lower = "abcdefghijkmnpqrstuvwxyz";
  const digits = "23456789";
  const pick = (chars: string, n: number) =>
    Array.from({ length: n }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
  return `${pick(letters, 3)}${pick(digits, 4)}${pick(lower, 3)}${pick(digits, 4)}`;
}

export default function StaffFormModal({
  mode,
  staff,
  onClose,
  onSubmit,
}: Props) {
  const [fullName, setFullName] = useState(staff?.fullName ?? "");
  const [email, setEmail] = useState(staff?.email ?? "");
  const [phone, setPhone] = useState(staff?.phone ?? "");
  const [role, setRole] = useState(staff?.role ?? "admin");
  const [region, setRegion] = useState<string>(staff?.region ?? "");
  const [password, setPassword] = useState(mode === "create" ? generatePassword() : "");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});

  const selectedRole = ROLES.find((r) => r.value === role);
  const requiresRegion = selectedRole?.scoped ?? false;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setFieldErrors({});
    setLoading(true);

    const input: CreateStaffRequest = {
      fullName,
      email,
      phone,
      role,
      region: requiresRegion ? region : null,
      password: mode === "create" ? password : "", // password ignored on edit
    };

    const result = await onSubmit(input);
    setLoading(false);

    if (!result.success) {
      setError(result.error ?? "Failed to save");
      if (result.issues) setFieldErrors(result.issues);
      return;
    }
  };

  const regeneratePassword = () => setPassword(generatePassword());

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-2xl max-w-lg w-full max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-start justify-between p-5 border-b border-zinc-100 dark:border-zinc-800">
          <div>
            <h2 className="text-sm font-black uppercase tracking-wide text-zinc-900 dark:text-white">
              {mode === "create" ? "Add Staff Member" : "Edit Staff Member"}
            </h2>
            <p className="text-xs text-zinc-500 mt-0.5">
              {mode === "create"
                ? "Create a new staff account with system access."
                : "Update this staff member's details."}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {error && (
            <div className="bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 rounded-xl p-3 text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="block text-[11px] font-bold uppercase text-zinc-500 dark:text-zinc-400 mb-1.5">
              Full Name
            </label>
            <input
              type="text"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="e.g. Sipho Dlamini"
              className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3.5 py-2.5 text-sm text-zinc-900 dark:text-white focus:outline-none focus:border-emerald-500"
            />
            {fieldErrors.fullName && (
              <p className="text-[10px] text-red-600 mt-1">{fieldErrors.fullName[0]}</p>
            )}
          </div>

          <div>
            <label className="block text-[11px] font-bold uppercase text-zinc-500 dark:text-zinc-400 mb-1.5">
              Email
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="e.g. sipho@transport.gov.sz"
              disabled={mode === "edit"}
              className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3.5 py-2.5 text-sm text-zinc-900 dark:text-white focus:outline-none focus:border-emerald-500 disabled:opacity-60 disabled:cursor-not-allowed"
            />
            {mode === "edit" && (
              <p className="text-[10px] text-zinc-400 mt-1">
                Email cannot be changed. Create a new account if needed.
              </p>
            )}
            {fieldErrors.email && (
              <p className="text-[10px] text-red-600 mt-1">{fieldErrors.email[0]}</p>
            )}
          </div>

          <div>
            <label className="block text-[11px] font-bold uppercase text-zinc-500 dark:text-zinc-400 mb-1.5">
              Phone (optional)
            </label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="e.g. +268 7600 0000"
              className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3.5 py-2.5 text-sm text-zinc-900 dark:text-white focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold uppercase text-zinc-500 dark:text-zinc-400 mb-1.5">
              Role
            </label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              disabled={mode === "edit"}
              className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3.5 py-2.5 text-sm font-bold text-zinc-900 dark:text-white focus:outline-none focus:border-emerald-500 disabled:opacity-60"
            >
              {ROLES.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </select>
            {selectedRole && (
              <p className="text-[10px] text-zinc-500 mt-1">{selectedRole.desc}</p>
            )}
          </div>

          {requiresRegion && (
            <div>
              <label className="block text-[11px] font-bold uppercase text-zinc-500 dark:text-zinc-400 mb-1.5">
                Assigned Region
              </label>
              <select
                required
                value={region}
                onChange={(e) => setRegion(e.target.value)}
                className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3.5 py-2.5 text-sm text-zinc-900 dark:text-white focus:outline-none focus:border-emerald-500"
              >
                <option value="">— Select region —</option>
                {REGIONS.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
              {fieldErrors.region && (
                <p className="text-[10px] text-red-600 mt-1">{fieldErrors.region[0]}</p>
              )}
            </div>
          )}

          {mode === "create" && (
            <div>
              <label className="block text-[11px] font-bold uppercase text-zinc-500 dark:text-zinc-400 mb-1.5">
                Initial Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  minLength={8}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3.5 py-2.5 pr-20 text-sm font-mono text-zinc-900 dark:text-white focus:outline-none focus:border-emerald-500"
                />
                <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="p-1 rounded text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                  <button
                    type="button"
                    onClick={regeneratePassword}
                    className="text-[10px] font-bold uppercase text-emerald-600 hover:text-emerald-700 px-1.5"
                  >
                    New
                  </button>
                </div>
              </div>
              <p className="text-[10px] text-zinc-500 mt-1">
                Share this password with the staff member securely. They should change it after first login.
              </p>
            </div>
          )}

          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 rounded-xl text-xs font-bold hover:bg-zinc-200 dark:hover:bg-zinc-700"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-sm"
            >
              {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              {mode === "create" ? "Create Staff" : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
