/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

"use client";

import { useCallback, useEffect, useState } from "react";
import type { RenewalRow } from "../lib/renewals/queries";

interface UseRenewalsResult {
  renewals: RenewalRow[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  createRenewal: (input: CreateRenewalRequest) => Promise<{
    success: boolean;
    error?: string;
    issues?: Record<string, string[]>;
    renewal?: RenewalRow;
  }>;
  approveRenewal: (
    id: string,
    input: ApproveRenewalRequest
  ) => Promise<{ success: boolean; error?: string }>;
}

export interface CreateRenewalRequest {
  vehicleReg: string;
  termMonths: number;
  reason: string;
  comments?: string;
  supportingDocuments?: string[];
  payWithMasterCard?: boolean;
  operatorLicenseNumber?: string;
  odometerReading?: number;
  yearOfManufacture?: number;
  insurancePolicy?: string;
  concessionId?: string;
}

export interface ApproveRenewalRequest {
  decision: "Approved" | "Rejected";
  newPermitNumber?: string;
  permitIssueDate?: string;
  permitExpiryDate?: string;
  cofNumber?: string;
  cofIssueDate?: string;
  cofExpiryDate?: string;
  inspectionDate?: string;
  licensingOffice?: string;
  renewalNotes?: string;
}

export function useRenewals(statusFilter?: RenewalRow["status"]): UseRenewalsResult {
  const [renewals, setRenewals] = useState<RenewalRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (statusFilter) params.set("status", statusFilter);

      const res = await fetch(`/api/renewals?${params.toString()}`, {
        cache: "no-store",
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? `Failed (${res.status})`);
      }
      const data = await res.json();
      setRenewals(data.renewals ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const createRenewal = useCallback(
    async (input: CreateRenewalRequest) => {
      try {
        const res = await fetch("/api/renewals", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(input),
        });
        const data = await res.json();
        if (!res.ok) {
          return {
            success: false,
            error: data.error ?? "Failed to submit renewal",
            issues: data.issues,
          };
        }
        await refresh();
        return { success: true, renewal: data.renewal as RenewalRow };
      } catch (err) {
        return {
          success: false,
          error: err instanceof Error ? err.message : "Network error",
        };
      }
    },
    [refresh]
  );

  const approveRenewal = useCallback(
    async (id: string, input: ApproveRenewalRequest) => {
      try {
        const res = await fetch(`/api/renewals/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(input),
        });
        const data = await res.json();
        if (!res.ok) {
          return { success: false, error: data.error ?? "Action failed" };
        }
        await refresh();
        return { success: true };
      } catch (err) {
        return {
          success: false,
          error: err instanceof Error ? err.message : "Network error",
        };
      }
    },
    [refresh]
  );

  return { renewals, loading, error, refresh, createRenewal, approveRenewal };
}
