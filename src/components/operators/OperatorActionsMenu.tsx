/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { MoreVertical, Edit2, KeyRound, UserX } from "lucide-react";
import type { OperatorRow } from "@/lib/operators/queries";
import { previewDeactivateOperator } from "@/lib/intelligence/consequences";
import { ConsequencePreviewDialog } from "@/components/intelligence/ConsequencePreviewDialog";

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

  const deactivatePreview = useMemo(
    () =>
      previewDeactivateOperator({
        operatorName: operator.companyName || operator.name,
        vehicleCount: operator.vehicleCount ?? 0,
        driverCount: 0,
        masterCardStatus: operator.masterCard?.status ?? "Active",
        hasPendingRenewals: false,
      }),
    [operator]
  );

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
          className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.06]"
        >
          <MoreVertical className="w-4 h-4" />
        </button>

        {open && (
          <div className="absolute right-0 top-full mt-1 z-20 bg-[#0F0F10] border border-white/[0.06] rounded-xl shadow-xl py-1 min-w-[180px]">
            <button
              onClick={() => {
                setOpen(false);
                onEdit();
              }}
              className="w-full text-left px-3 py-2 text-xs font-bold text-zinc-300 hover:bg-white/[0.06] flex items-center gap-2"
            >
              <Edit2 className="w-3.5 h-3.5" />
              Edit
            </button>
            <button
              onClick={handleReset}
              disabled={resetting || !operator.authUserId}
              className="w-full text-left px-3 py-2 text-xs font-bold text-zinc-300 hover:bg-white/[0.06] flex items-center gap-2 disabled:opacity-40"
            >
              <KeyRound className="w-3.5 h-3.5" />
              Reset Password
            </button>
            <button
              onClick={() => {
                setOpen(false);
                setConfirmDeactivate(true);
              }}
              className="w-full text-left px-3 py-2 text-xs font-bold text-red-400 hover:bg-red-950/40 flex items-center gap-2"
            >
              <UserX className="w-3.5 h-3.5" />
              Deactivate
            </button>
          </div>
        )}
      </div>

      <ConsequencePreviewDialog
        open={confirmDeactivate}
        preview={deactivatePreview}
        confirmLabel="Deactivate"
        variant="danger"
        onCancel={() => setConfirmDeactivate(false)}
        onConfirm={() => {
          setConfirmDeactivate(false);
          onDeactivate();
        }}
      />
    </>
  );
}
