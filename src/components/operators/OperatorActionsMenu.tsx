/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

"use client";

import { useMemo, useState } from "react";
import { Edit2, KeyRound, UserX } from "lucide-react";
import type { OperatorRow } from "@/lib/operators/queries";
import { previewDeactivateOperator } from "@/lib/intelligence/consequences";
import { ConsequencePreviewDialog } from "@/components/intelligence/ConsequencePreviewDialog";
import { ActionsMenu, type ActionsMenuItem } from "@/components/ui";

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
  const [confirmDeactivate, setConfirmDeactivate] = useState(false);
  const [resetting, setResetting] = useState(false);

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
      disabled: resetting || !operator.authUserId,
      onClick: async () => {
        setResetting(true);
        try {
          await onResetPassword();
        } finally {
          setResetting(false);
        }
      },
    },
    {
      key: "deactivate",
      label: "Deactivate",
      icon: UserX,
      tone: "danger",
      dividerBefore: true,
      onClick: () => setConfirmDeactivate(true),
    },
  ];

  return (
    <>
      <ActionsMenu items={items} label="Operator actions" />

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
