/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

"use client";

import { useCallback, useEffect, useState } from "react";
import type { DriverRow } from "../lib/drivers/queries";

interface UseDriversResult {
  drivers: DriverRow[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  createDriver: (input: CreateDriverRequest) => Promise<CreateDriverResponse>;
  updateDriver: (id: string, input: Partial<CreateDriverRequest>) => Promise<boolean>;
  deactivateDriver: (id: string) => Promise<boolean>;
  resetPassword: (id: string) => Promise<ResetPasswordResponse>;
}

export interface CreateDriverRequest {
  fullName: string;
  nationalId?: string;
  phone: string;
  residentialAddress?: string;
  dateOfBirth?: string;
  gender?: string;
  licenseNumber?: string;
  licenseClass?: string;
  pdpNumber?: string;
  pdpIssueDate?: string;
  pdpExpiryDate?: string;
  pdpIssuingAuthority?: string;
  pdpStatus?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  emergencyContactRelation?: string;
  assignedVehicleReg?: string;
  status?: string;
  profilePictureUrl?: string;
}

export interface CreateDriverResponse {
  success: boolean;
  error?: string;
  issues?: Record<string, string[]>;
  driverId?: string;
  credentials?: {
    username: string;
    password: string;
  };
}

export interface ResetPasswordResponse {
  success: boolean;
  error?: string;
  tempPassword?: string;
  fullName?: string;
}

export function useDrivers(): UseDriversResult {
  const [drivers, setDrivers] = useState<DriverRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/drivers", { cache: "no-store" });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? `Failed to load drivers (${res.status})`);
      }
      const data = await res.json();
      setDrivers(data.drivers ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const createDriver = useCallback(
    async (input: CreateDriverRequest): Promise<CreateDriverResponse> => {
      try {
        const res = await fetch("/api/drivers", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(input),
        });
        const data = await res.json();
        if (!res.ok) {
          return {
            success: false,
            error: data.error ?? "Failed to create driver",
            issues: data.issues,
          };
        }
        await refresh();
        return {
          success: true,
          driverId: data.driverId,
          credentials: data.credentials,
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

  const updateDriver = useCallback(
    async (id: string, input: Partial<CreateDriverRequest>): Promise<boolean> => {
      try {
        const res = await fetch(`/api/drivers/${id}`, {
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

  const deactivateDriver = useCallback(
    async (id: string): Promise<boolean> => {
      try {
        const res = await fetch(`/api/drivers/${id}`, { method: "DELETE" });
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
        const res = await fetch(`/api/drivers/${id}/reset-password`, {
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
    drivers,
    loading,
    error,
    refresh,
    createDriver,
    updateDriver,
    deactivateDriver,
    resetPassword,
  };
}
