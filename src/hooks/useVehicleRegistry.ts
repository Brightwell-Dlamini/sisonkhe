/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

"use client";

import { useCallback, useEffect, useState } from "react";
import type { VehicleRow } from "../lib/vehicles/queries";

export interface CreateVehicleRequest {
  registrationNumber: string;
  vic?: string;
  make: string;
  model: string;
  seatingCapacity: number;
  classification: string;
  routeAssignmentId?: string;
  loadingBay?: string;
  ownerName?: string;
  ownerPhone?: string;
  ownerOperatorId?: string;
  driverId?: string;
  permitNumber?: string;
  permitStatus?: string;
  permitIssueDate?: string;
  permitExpiryDate?: string;
  cofNumber?: string;
  cofIssueDate?: string;
  cofExpiryDate?: string;
  lastInspectionDate?: string;
  association?: string;
  insuranceExpiry?: string;
  roadworthinessExpiry?: string;
  isMidMonthAddition?: boolean;
  monthRegistered?: string;
  midMonthJoinDay?: number;
  monthlySequenceBaseIndex?: number;
  vehiclePhotoUrl?: string;
}

export interface CreateVehicleResponse {
  success: boolean;
  error?: string;
  issues?: Record<string, string[]>;
  registrationNumber?: string;
  vic?: string;
}

interface UseVehicleRegistryResult {
  vehicles: VehicleRow[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  createVehicle: (input: CreateVehicleRequest) => Promise<CreateVehicleResponse>;
  updateVehicle: (
    reg: string,
    input: Partial<CreateVehicleRequest>
  ) => Promise<boolean>;
  deactivateVehicle: (reg: string) => Promise<boolean>;
}

export function useVehicleRegistry(): UseVehicleRegistryResult {
  const [vehicles, setVehicles] = useState<VehicleRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/vehicles", { cache: "no-store" });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? `Failed to load vehicles (${res.status})`);
      }
      const data = await res.json();
      setVehicles(data.vehicles ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const createVehicle = useCallback(
    async (input: CreateVehicleRequest): Promise<CreateVehicleResponse> => {
      try {
        const res = await fetch("/api/vehicles", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(input),
        });
        const data = await res.json();
        if (!res.ok) {
          return {
            success: false,
            error: data.error ?? "Failed to create vehicle",
            issues: data.issues,
          };
        }
        await refresh();
        return {
          success: true,
          registrationNumber: data.registrationNumber,
          vic: data.vic,
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

  const updateVehicle = useCallback(
    async (
      reg: string,
      input: Partial<CreateVehicleRequest>
    ): Promise<boolean> => {
      try {
        const res = await fetch(`/api/vehicles/${encodeURIComponent(reg)}`, {
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

  const deactivateVehicle = useCallback(
    async (reg: string): Promise<boolean> => {
      try {
        const res = await fetch(`/api/vehicles/${encodeURIComponent(reg)}`, {
          method: "DELETE",
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

  return {
    vehicles,
    loading,
    error,
    refresh,
    createVehicle,
    updateVehicle,
    deactivateVehicle,
  };
}
