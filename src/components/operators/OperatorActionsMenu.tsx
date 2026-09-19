/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

"use client";

import { useEffect, useRef, useState } from "react";
import { MoreVertical, Edit2, KeyRound, UserX } from "lucide-react";
import type { OperatorRow } from "@/lib/operators/queries";

interface Props {
  operator: OperatorRow;
  onEdit: () => void;
  onDeactivate: () => void;
  onResetPassword: () => Promise<unknown>;
}

export default function OperatorActionsMenu({
  operator,
  onEdit,
  onDeactivate,
  onResetPassword,
}: Props) {
  const [open, setOpen] = useState(false);
  const [confirmDeactivate, setConfirmDeactivate] = useState(false);
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
    await onResetPassword();
    setResetting(false);
  };

  return (
    <>
      <div className="relative inline-block shrink-0" ref={menuRef}>
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
              disabled={resetting || !operator.authUserId}
              className="w-full text-left px-3 py-2 text-xs font-bold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 flex items-center gap-2 disabled:opacity-40"
            >
              <KeyRound className="w-3.5 h-3.5" />
              Reset Password
            </button>
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
          </div>
        )}
      </div>

      {confirmDeactivate && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-2xl max-w-sm w-full p-5 space-y-4">
            <h3 className="text-sm font-black uppercase text-zinc-900 dark:text-white">
              Deactivate Operator?
            </h3>
            <p className="text-xs text-zinc-500">
              {operator.name} will be blocked from signing in, and their Master
              Card will be <strong>frozen</strong>. Vehicles owned by them will
              be unassigned. This cannot be undone without admin intervention.
            </p>
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
                className="flex-1 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-black uppercase"
              >
                Deactivate
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
