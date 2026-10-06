/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

"use client";

import { useMemo, useState } from "react";
import { Edit2, KeyRound, UserX, UserPlus } from "lucide-react";
import type { DriverRow } from "@/lib/drivers/queries";
import { previewSuspendDriver } from "@/lib/intelligence/consequences";
import { ConsequencePreviewDialog } from "@/components/intelligence/ConsequencePreviewDialog";
import { ActionsMenu, type ActionsMenuItem } from "@/components/ui";

interface Props {
  driver: DriverRow;
  onEdit: () => void;
  onDeactivate: () => void;
  onResetPassword: () => Promise<unknown>;
  onIssueLogin?: () => Promise<unknown>;
}

export default function DriverActionsMenu({
  driver,
  onEdit,
  onDeactivate,
  onResetPassword,
  onIssueLogin,
}: Props) {
  const [confirmDeactivate, setConfirmDeactivate] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [issuing, setIssuing] = useState(false);

  const suspendPreview = useMemo(
    () =>
      previewSuspendDriver({
        driverName: driver.fullName,
        assignedVehicleReg: driver.assignedVehicleReg,
        hasActiveQueuePosition: false,
      }),
    [driver]
  );

  const items: ActionsMenuItem[] = [
    {
      key: "edit",
      label: "Edit",
      icon: Edit2,
      onClick: onEdit,
    },
  ];

  if (!driver.authUserId && onIssueLogin) {
    items.push({
      key: "issue-login",
      label: issuing ? "Issuing…" : "Issue login",
      icon: UserPlus,
      disabled: issuing,
      onClick: async () => {
        setIssuing(true);
        try {
          await onIssueLogin();
        } finally {
          setIssuing(false);
        }
      },
    });
  }

  items.push({
    key: "reset-password",
    label: resetting ? "Resetting…" : "Reset Password",
    icon: KeyRound,
    disabled: resetting || !driver.authUserId,
    onClick: async () => {
      setResetting(true);
      try {
        await onResetPassword();
      } finally {
        setResetting(false);
      }
    },
  });

  if (driver.status !== "Suspended") {
    items.push({
      key: "suspend",
      label: "Suspend",
      icon: UserX,
      tone: "danger",
      dividerBefore: true,
      onClick: () => setConfirmDeactivate(true),
    });
  }

  return (
    <>
      <ActionsMenu items={items} label="Driver actions" />

      <ConsequencePreviewDialog
        open={confirmDeactivate}
        preview={suspendPreview}
        confirmLabel="Suspend"
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
