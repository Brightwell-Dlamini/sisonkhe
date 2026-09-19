/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

"use client";

import { useCallback, useEffect, useState } from "react";
import type { StaffRow } from "../lib/staff/queries";

interface UseStaffResult {
  staff: StaffRow[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  createStaff: (input: CreateStaffRequest) => Promise<CreateStaffResponse>;
  updateStaff: (id: string, input: UpdateStaffRequest) => Promise<boolean>;
  deactivateStaff: (id: string) => Promise<boolean>;
  resetPassword: (id: string) => Promise<ResetPasswordResponse>;
}

export interface CreateStaffRequest {
  fullName: string;
  email: string;
  phone?: string;
  role: string;
  region?: string | null;
  terminalId?: string;
  password: string;
}

export interface CreateStaffResponse {
  success: boolean;
  error?: string;
  issues?: Record<string, string[]>;
  staff?: StaffRow;
}

export interface UpdateStaffRequest {
  fullName?: string;
  phone?: string | null;
  role?: string;
  region?: string | null;
  terminalId?: string | null;
  isActive?: boolean;
}

export interface ResetPasswordResponse {
  success: boolean;
  error?: string;
  tempPassword?: string;
  fullName?: string;
}

export function useStaff(): UseStaffResult {
  const [staff, setStaff] = useState<StaffRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/staff", { cache: "no-store" });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? `Failed to load staff (${res.status})`);
      }
      const data = await res.json();
      setStaff(data.staff ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const createStaff = useCallback(
    async (input: CreateStaffRequest): Promise<CreateStaffResponse> => {
      try {
        const res = await fetch("/api/staff", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(input),
        });
        const data = await res.json();

        if (!res.ok) {
          return {
            success: false,
            error: data.error ?? "Failed to create staff",
            issues: data.issues,
          };
        }

        await refresh();
        return { success: true, staff: data.staff };
      } catch (err) {
        return {
          success: false,
          error: err instanceof Error ? err.message : "Network error",
        };
      }
    },
    [refresh]
  );

  const updateStaff = useCallback(
    async (id: string, input: UpdateStaffRequest): Promise<boolean> => {
      try {
        const res = await fetch(`/api/staff/${id}`, {
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

  const deactivateStaff = useCallback(
    async (id: string): Promise<boolean> => {
      try {
        const res = await fetch(`/api/staff/${id}`, { method: "DELETE" });
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
        const res = await fetch(`/api/staff/${id}/reset-password`, {
          method: "POST",
        });
        const data = await res.json();
        if (!res.ok) {
          return { success: false, error: data.error ?? "Reset failed" };
        }
        return {
          success: true,
          tempPassword: data.tempPassword,
          fullName: data.fullName,
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
    staff,
    loading,
    error,
    refresh,
    createStaff,
    updateStaff,
    deactivateStaff,
    resetPassword,
  };
}
