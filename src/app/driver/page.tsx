/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

"use client";

import DriverDashboard from "@/components/driver/DriverDashboard";
import FirstRunWizard from "@/components/common/FirstRunWizard";
import { useAuth } from "@/hooks/useAuth";

export default function DriverPage() {
  const { user } = useAuth();
  return (
    <>
      <FirstRunWizard
        role="driver"
        userId={user?.id}
        displayName={user?.fullName}
      />
      <DriverDashboard />
    </>
  );
}
