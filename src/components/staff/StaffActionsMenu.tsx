/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

"use client";

import { useEffect, useRef, useState } from "react";
import { MoreVertical, Edit2, KeyRound, UserX } from "lucide-react";
import type { StaffRow } from "@/lib/staff/queries";
import ResetPasswordDialog from "./ResetPasswordDialog";

interface Props {
  staff: StaffRow;
  onEdit: () => void;
  onDeactivate: () => void;
  onResetPassword: () => Promise<{
    success: boolean;
    error?: string;
    tempPassword?: string;
    fullName?: string;
  }>;
}

export default function StaffActionsMenu({
  staff,
  onEdit,
  onDeactivate,
  onResetPassword,
}: Props) {
  const [open, setOpen] = useState(false);
  const [confirmDeactivate, setConfirmDeactivate] = useState(false);
  const [resetResult, setResetResult] = useState<{
    fullName: string;
    tempPassword: string;
  } | null>(null);
  const [resetting, setResetting] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const handleReset = async () => {
    setOpen(false);
    setResetting(true);
    const res = await onResetPassword();
    setResetting(false);
    if (res.success && res.tempPassword && res.fullName) {
      setResetResult({
        fullName: res.fullName,
        tempPassword: res.tempPassword,
      });
    }
  };

  return (
    <>
      <div className="relative inline-block" ref={menuRef}>
        <button
          onClick={() => setOpen((v) => !v)}
          className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800"
        >
          <MoreVertical className="w-4 h-4" />
        </button>

        {open && (
          <div className="absolute right-0 top-full mt-1 z-20 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-xl py-1 min-w-[180px]">
            <button
              onClick={() => {
                setOpen(false);
                onEdit();
              }}
              className="w-full text-left px-3 py-2 text-xs font-bold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 flex items-center gap-2"
            >
              <Edit2 className="w-3.5 h-3.5" />
              Edit
            </button>
            <button
              onClick={handleReset}
              disabled={resetting}
              className="w-full text-left px-3 py-2 text-xs font-bold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 flex items-center gap-2 disabled:opacity-50"
            >
              <KeyRound className="w-3.5 h-3.5" />
              Reset Password
            </button>
            {staff.isActive && (
              <button
                onClick={() => {
                  setOpen(false);
                  setConfirmDeactivate(true);
                }}
                className="w-full text-left px-3 py-2 text-xs font-bold text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 flex items-center gap-2"
              >
                <UserX className="w-3.5 h-3.5" />
                Deactivate
              </button>
            )}
          </div>
        )}
      </div>

      {/* Deactivate confirmation */}
      {confirmDeactivate && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-2xl max-w-sm w-full p-5 space-y-4">
            <div>
              <h3 className="text-sm font-black uppercase text-zinc-900 dark:text-white">
                Deactivate Staff?
              </h3>
              <p className="text-xs text-zinc-500 mt-1">
                {staff.fullName} will no longer be able to sign in. Their account
                and history remain intact and can be reactivated later.
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setConfirmDeactivate(false)}
                className="flex-1 py-2 bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 rounded-xl text-xs font-bold"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setConfirmDeactivate(false);
                  onDeactivate();
                }}
                className="flex-1 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-black uppercase tracking-wider"
              >
                Deactivate
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reset result dialog */}
      {resetResult && (
        <ResetPasswordDialog
          staff={{ ...staff, fullName: resetResult.fullName }}
          tempPassword={resetResult.tempPassword}
          onClose={() => setResetResult(null)}
        />
      )}
    </>
  );
}
