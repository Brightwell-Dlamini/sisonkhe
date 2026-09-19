/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

"use client";

import { useCallback, useEffect, useState } from "react";
import type { OperatorRow } from "../lib/operators/queries";

export interface CreateOperatorRequest {
  name: string;
  companyName: string;
  phone: string;
  email: string;
  nationalId?: string;
  taxNumber?: string;
  association?: string;
  bankAccountRef?: string;
  operatorLicenseNumber?: string;
  avatarUrl?: string;
}

export interface CreateOperatorResponse {
  success: boolean;
  error?: string;
  issues?: Record<string, string[]>;
  operatorId?: string;
  credentials?: {
    username: string;
    password: string;
    email: string;
  };
  masterCard?: {
    cardNumber: string;
    initialBalance: number;
  };
}

export interface ResetPasswordResponse {
  success: boolean;
  error?: string;
  tempPassword?: string;
  name?: string;
}

interface UseOperatorsResult {
  operators: OperatorRow[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  createOperator: (input: CreateOperatorRequest) => Promise<CreateOperatorResponse>;
  updateOperator: (
    id: string,
    input: Partial<CreateOperatorRequest>
  ) => Promise<boolean>;
  deactivateOperator: (id: string) => Promise<boolean>;
  resetPassword: (id: string) => Promise<ResetPasswordResponse>;
}

export function useOperators(): UseOperatorsResult {
  const [operators, setOperators] = useState<OperatorRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/operators", { cache: "no-store" });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? `Failed to load operators (${res.status})`);
      }
      const data = await res.json();
      setOperators(data.operators ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const createOperator = useCallback(
    async (input: CreateOperatorRequest): Promise<CreateOperatorResponse> => {
      try {
        const res = await fetch("/api/operators", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(input),
        });
        const data = await res.json();
        if (!res.ok) {
          return {
            success: false,
            error: data.error ?? "Failed to create operator",
            issues: data.issues,
          };
        }
        await refresh();
        return {
          success: true,
          operatorId: data.operatorId,
          credentials: data.credentials,
          masterCard: data.masterCard,
        };
      } catch (err) {
        return {
          success: false,
          error: err instanceof Error ? err.message : "Network error",
        };
      }
    },
    [refresh]
  );

  const updateOperator = useCallback(
    async (
      id: string,
      input: Partial<CreateOperatorRequest>
    ): Promise<boolean> => {
      try {
        const res = await fetch(`/api/operators/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(input),
        });
        if (!res.ok) return false;
        await refresh();
        return true;
      } catch {
        return false;
      }
    },
    [refresh]
  );

  const deactivateOperator = useCallback(
    async (id: string): Promise<boolean> => {
      try {
        const res = await fetch(`/api/operators/${id}`, { method: "DELETE" });
        if (!res.ok) return false;
        await refresh();
        return true;
      } catch {
        return false;
      }
    },
    [refresh]
  );

  const resetPassword = useCallback(
    async (id: string): Promise<ResetPasswordResponse> => {
      try {
        const res = await fetch(`/api/operators/${id}/reset-password`, {
          method: "POST",
        });
        const data = await res.json();
        if (!res.ok) {
          return { success: false, error: data.error ?? "Reset failed" };
        }
        return {
          success: true,
          tempPassword: data.tempPassword,
          name: data.name,
        };
      } catch (err) {
        return {
          success: false,
          error: err instanceof Error ? err.message : "Network error",
        };
      }
    },
    []
  );

  return {
    operators,
    loading,
    error,
    refresh,
    createOperator,
    updateOperator,
    deactivateOperator,
    resetPassword,
  };
}
