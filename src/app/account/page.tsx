/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

"use client";

import AccountHeader from "@/components/account/AccountHeader";
import SessionCard from "@/components/account/SessionCard";
import ChangePasswordForm from "@/components/account/ChangePasswordForm";

export default function AccountPage() {
  return (
    <div className="space-y-6">
      <AccountHeader />
      <ChangePasswordForm />
      <SessionCard />
    </div>
  );
}
