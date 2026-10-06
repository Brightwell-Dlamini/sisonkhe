/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

"use client";

import { useState } from "react";
import { Edit2, KeyRound, UserX } from "lucide-react";
import type { StaffRow } from "@/lib/staff/queries";
import { ActionsMenu, type ActionsMenuItem } from "@/components/ui";
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
  const [confirmDeactivate, setConfirmDeactivate] = useState(false);
  const [resetResult, setResetResult] = useState<{
    fullName: string;
    tempPassword: string;
  } | null>(null);
  const [resetting, setResetting] = useState(false);

  const items: ActionsMenuItem[] = [
    {
      key: "edit",
      label: "Edit",
      icon: Edit2,
      onClick: onEdit,
    },
    {
      key: "reset-password",
      label: resetting ? "Resetting…" : "Reset Password",
      icon: KeyRound,
      disabled: resetting,
      onClick: async () => {
        setResetting(true);
        try {
          const res = await onResetPassword();
          if (res.success && res.tempPassword && res.fullName) {
            setResetResult({
              fullName: res.fullName,
              tempPassword: res.tempPassword,
            });
          }
        } finally {
          setResetting(false);
        }
      },
    },
  ];

  if (staff.isActive) {
    items.push({
      key: "deactivate",
      label: "Deactivate",
      icon: UserX,
      tone: "danger",
      dividerBefore: true,
      onClick: () => setConfirmDeactivate(true),
    });
  }

  return (
    <>
      <ActionsMenu items={items} label="Staff actions" />

      {/* Deactivate confirmation */}
      {confirmDeactivate && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0F0F10] border border-white/[0.06] rounded-2xl shadow-2xl max-w-sm w-full p-5 space-y-4">
            <div>
              <h3 className="text-sm font-black uppercase text-white">
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
                className="flex-1 py-2 bg-white/[0.06] text-zinc-300 rounded-xl text-xs font-bold"
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
