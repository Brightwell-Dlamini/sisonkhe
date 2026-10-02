"use client";

import { useCallback, useEffect, useState } from "react";
import type { DriverMessage } from "../lib/marshal/messages";

interface UseDriverMessagesResult {
  messages: DriverMessage[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  send: (driverName: string, driverPhone: string | null, message: string) => Promise<boolean>;
}

export function useDriverMessages(): UseDriverMessagesResult {
  const [messages, setMessages] = useState<DriverMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/marshal/messages", { cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setMessages(data.messages ?? []);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
    const timer = window.setInterval(refresh, 20000);
    return () => window.clearInterval(timer);
  }, [refresh]);

  const send = useCallback(
    async (driverName: string, driverPhone: string | null, message: string) => {
      try {
        const res = await fetch("/api/marshal/messages", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ driverName, driverPhone, message }),
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

  return { messages, loading, error, refresh, send };
}
