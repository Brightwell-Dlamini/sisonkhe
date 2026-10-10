/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { useRenewals } from "@/hooks/useRenewals";
import { useAuth } from "@/hooks/useAuth";
import { useLocale } from "@/hooks/useLocale";
import RenewalsList from "./RenewalsList";
import RenewalRequestModal from "./RenewalRequestModal";
import { Button, PageHeader, useToast } from "@/components/ui";

export default function OperatorRenewalsPage() {
  const { user } = useAuth();
  const { t } = useLocale();
  const { renewals, loading, error, createRenewal } = useRenewals();
  const [showModal, setShowModal] = useState(false);
  const toast = useToast();

  const handleSubmit = async (input: Parameters<typeof createRenewal>[0]) => {
    const result = await createRenewal(input);
    if (result.success) {
      toast.success("Renewal request submitted", "Pending approval");
      setShowModal(false);
      return { success: true };
    }
    return { success: false, error: result.error, issues: result.issues };
  };

  return (
    <div>
      <PageHeader
        title={t("operator.renewals_title")}
        description={t("operator.renewals_desc")}
        actions={
          <Button leadingIcon={Plus} onClick={() => setShowModal(true)} size="sm">
            {t("operator.request_renewal")}
          </Button>
        }
      />
      {error && (
        <div className="mb-4 bg-rose-500/10 border border-rose-500/25 text-rose-400 rounded-xl p-3 text-xs font-medium">
          {error}
        </div>
      )}
      <RenewalsList renewals={renewals} loading={loading} />
      {showModal && user?.operatorId && (
        <RenewalRequestModal
          operatorId={user.operatorId}
          operatorName={user.fullName}
          onClose={() => setShowModal(false)}
          onSubmit={handleSubmit}
        />
      )}
    </div>
  );
}
