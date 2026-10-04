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
    <div className="mx-auto max-w-3xl space-y-6 px-1 pb-10">
      <AccountHeader />
      <div className="grid gap-6 md:grid-cols-5">
        <div className="md:col-span-3">
          <ChangePasswordForm />
        </div>
        <div className="md:col-span-2">
          <SessionCard />
        </div>
      </div>
    </div>
  );
}
