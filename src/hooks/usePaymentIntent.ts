/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { PaymentIntent, ProviderId, PaymentPurpose } from "../lib/payments/types";

export interface CreatePaymentIntentInput {
  providerId: ProviderId;
  amountSzl: number;
  purpose: PaymentPurpose;
  targetEntityId: string;
  payerPhone?: string;
  payerName?: string;
  description?: string;
}

export interface EnabledProvider {
  id: ProviderId;
  displayName: string;
  requiresPayerPhone: boolean;
}

interface UsePaymentIntentResult {
  intent: PaymentIntent | null;
  providers: EnabledProvider[];
  live: boolean;
  loading: boolean;
  error: string | null;
  create: (input: CreatePaymentIntentInput) => Promise<{
    success: boolean;
    intent?: PaymentIntent;
    error?: string;
  }>;
  poll: () => Promise<void>;
  cancel: () => void;
}

const TERMINAL_STATUSES = ["completed", "failed", "cancelled", "expired"];

export function usePaymentIntent(): UsePaymentIntentResult {
  const [intent, setIntent] = useState<PaymentIntent | null>(null);
  const [providers, setProviders] = useState<EnabledProvider[]>([]);
  const [live, setLive] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pollTimer = useRef<number | null>(null);

  // Load providers on mount
  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch("/api/payments/intent", { cache: "no-store" });
        if (!res.ok) return;
        const data = await res.json();
        setProviders(data.providers ?? []);
        setLive(Boolean(data.live));
      } catch {
        // ignore
      }
    };
    void load();
  }, []);

  // Poll active intents every 3 seconds
  useEffect(() => {
    if (!intent || TERMINAL_STATUSES.includes(intent.status)) {
      if (pollTimer.current) {
        window.clearInterval(pollTimer.current);
        pollTimer.current = null;
      }
      return;
    }

    pollTimer.current = window.setInterval(async () => {
      try {
        const res = await fetch(`/api/payments/intent/${intent.id}`, {
          method: "POST",
          cache: "no-store",
        });
        if (!res.ok) return;
        const data = await res.json();
        if (data.intent) setIntent(data.intent);
      } catch {
        // ignore
      }
    }, 3000);

    return () => {
      if (pollTimer.current) {
        window.clearInterval(pollTimer.current);
        pollTimer.current = null;
      }
    };
  }, [intent]);

  const create = useCallback(async (input: CreatePaymentIntentInput) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/payments/intent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Payment failed");
        return { success: false, error: data.error };
      }
      setIntent(data.intent);
      return { success: true, intent: data.intent };
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Network error";
      setError(msg);
      return { success: false, error: msg };
    } finally {
      setLoading(false);
    }
  }, []);

  const poll = useCallback(async () => {
    if (!intent) return;
    try {
      const res = await fetch(`/api/payments/intent/${intent.id}`, {
        method: "POST",
        cache: "no-store",
      });
      if (!res.ok) return;
      const data = await res.json();
      if (data.intent) setIntent(data.intent);
    } catch {
      // ignore
    }
  }, [intent]);

  const cancel = useCallback(() => {
    setIntent(null);
    setError(null);
  }, []);

  return { intent, providers, live, loading, error, create, poll, cancel };
}
