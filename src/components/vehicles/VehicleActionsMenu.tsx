/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

"use client";

import { useState } from "react";
import { Edit2, Trash2, Printer, QrCode } from "lucide-react";
import type { VehicleRow } from "@/lib/vehicles/queries";
import { ActionsMenu, type ActionsMenuItem } from "@/components/ui";

interface Props {
  vehicle: VehicleRow;
  onEdit: () => void;
  onDeactivate: () => void;
  onViewQR?: () => void;
  onPrintPermit?: () => void;
}

export default function VehicleActionsMenu({
  vehicle,
  onEdit,
  onDeactivate,
  onViewQR,
  onPrintPermit,
}: Props) {
  const [confirmDeactivate, setConfirmDeactivate] = useState(false);

  const items: ActionsMenuItem[] = [
    {
      key: "edit",
      label: "Edit",
      icon: Edit2,
      onClick: onEdit,
    },
  ];

  if (onViewQR) {
    items.push({
      key: "view-qr",
      label: "View QR Plaque",
      icon: QrCode,
      onClick: onViewQR,
    });
  }

  if (onPrintPermit) {
    items.push({
      key: "print-permit",
      label: "Print A4 Permit",
      icon: Printer,
      onClick: onPrintPermit,
    });
  }

  items.push({
    key: "deactivate",
    label: "Deactivate",
    icon: Trash2,
    tone: "danger",
    dividerBefore: true,
    onClick: () => setConfirmDeactivate(true),
  });

  return (
    <>
      <ActionsMenu items={items} label="Vehicle actions" />

      {confirmDeactivate && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-2xl max-w-sm w-full p-5 space-y-4">
            <h3 className="text-sm font-black uppercase text-zinc-900 dark:text-white">
              Deactivate Vehicle?
            </h3>
            <p className="text-xs text-zinc-500">
              {vehicle.registrationNumber} will be marked Offline, removed from
              any active queue, and unassigned from its driver. Its history
              remains intact and it can be reactivated by editing.
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
