/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

"use client";

import { useCallback, useEffect, useState } from "react";
import type {
  InspectorTicket,
  InspectorVehicleView,
} from "../lib/inspector/queries";

interface UseInspectorTicketsResult {
  tickets: InspectorTicket[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  /** Lookup by plate or VIC. */
  lookupVehicle: (query: string) => Promise<InspectorVehicleView | null>;
  createTicket: (input: CreateTicketRequest) => Promise<{
    success: boolean;
    ticket?: InspectorTicket;
    error?: string;
    issues?: Record<string, string[]>;
  }>;
}

export interface CreateTicketRequest {
  vehicleReg: string;
  offenseType: string;
  amountSzl: number;
  location?: string;
  notes?: string;
}

export function useInspectorTickets(): UseInspectorTicketsResult {
  const [tickets, setTickets] = useState<InspectorTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/inspector/ticket", { cache: "no-store" });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? `Failed (${res.status})`);
      }
      const data = await res.json();
      setTickets(data.tickets ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const lookupVehicle = useCallback(async (query: string) => {
    try {
      const res = await fetch(
        `/api/inspector/vehicle?q=${encodeURIComponent(query.trim())}`,
        { cache: "no-store" }
      );
      if (!res.ok) return null;
      const data = await res.json();
      return (data.vehicle as InspectorVehicleView) ?? null;
    } catch {
      return null;
    }
  }, []);

  const createTicket = useCallback(
    async (input: CreateTicketRequest) => {
      try {
        const res = await fetch("/api/inspector/ticket", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(input),
        });
        const data = await res.json();
        if (!res.ok) {
          return {
            success: false,
            error: data.error ?? "Failed to create ticket",
            issues: data.issues,
          };
        }
        await refresh();
        return { success: true, ticket: data.ticket as InspectorTicket };
      } catch (err) {
        return {
          success: false,
          error: err instanceof Error ? err.message : "Network error",
        };
      }
    },
    [refresh]
  );

  return { tickets, loading, error, refresh, lookupVehicle, createTicket };
}
