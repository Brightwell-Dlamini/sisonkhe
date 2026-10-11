/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

"use client";

import CommandCentre from "@/components/admin/CommandCentre";
import FirstRunWizard from "@/components/common/FirstRunWizard";
import { useAuth } from "@/hooks/useAuth";

export default function AdminIndex() {
  const { user } = useAuth();
  const role =
    user?.role === "super-admin" || user?.role === "admin" || user?.role === "fleet-manager"
      ? "admin"
      : "admin";
  return (
    <>
      <FirstRunWizard role={role} userId={user?.id} displayName={user?.fullName} />
      <CommandCentre />
    </>
  );
}
