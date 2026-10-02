"use client";

import { useCallback, useEffect, useState } from "react";
import type {
  OperatorMasterCard,
  OperatorMasterCardTransaction,
} from "../lib/operator/queries";

interface UseOperatorMasterCardResult {
  card: OperatorMasterCard | null;
  transactions: OperatorMasterCardTransaction[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  toggleFreeze: () => Promise<boolean>;
  sendMoney: (input: {
    vehicleReg: string;
    amountSzl: number;
    category: string;
    description?: string;
  }) => Promise<{
    success: boolean;
    error?: string;
    newMasterBalance?: number;
    masterReceiptRef?: string;
  }>;
}

export function useOperatorMasterCard(): UseOperatorMasterCardResult {
  const [card, setCard] = useState<OperatorMasterCard | null>(null);
  const [transactions, setTransactions] = useState<OperatorMasterCardTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const [cardRes, txRes] = await Promise.all([
        fetch("/api/operator/master-card", { cache: "no-store" }),
        fetch("/api/operator/master-card/transactions", { cache: "no-store" }),
      ]);
      if (!cardRes.ok) throw new Error(`HTTP ${cardRes.status}`);
      const cardData = await cardRes.json();
      setCard(cardData.card);
      if (txRes.ok) {
        const txData = await txRes.json();
        setTransactions(txData.transactions ?? []);
      }
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const toggleFreeze = useCallback(async () => {
    try {
      const res = await fetch("/api/operator/master-card/freeze", {
        method: "POST",
      });
      if (!res.ok) return false;
      await refresh();
      return true;
    } catch {
      return false;
    }
  }, [refresh]);

  const sendMoney = useCallback(
    async (input: {
      vehicleReg: string;
      amountSzl: number;
      category: string;
      description?: string;
    }) => {
      try {
        const res = await fetch("/api/operator/transfer", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(input),
        });
        const data = await res.json();
        if (!res.ok) return { success: false, error: data.error };
        await refresh();
        return {
          success: true,
          newMasterBalance: data.newMasterBalance,
          masterReceiptRef: data.masterReceiptRef,
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

  return { card, transactions, loading, error, refresh, toggleFreeze, sendMoney };
}
