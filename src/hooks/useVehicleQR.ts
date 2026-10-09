/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

"use client";

import { useCallback, useState } from "react";

interface UseVehicleQRResult {
  token: string | null;
  verifyUrl: string | null;
  loading: boolean;
  error: string | null;
  issue: (registrationNumber: string) => Promise<string | null>;
  reset: () => void;
}

export function useVehicleQR(): UseVehicleQRResult {
  const [token, setToken] = useState<string | null>(null);
  const [verifyUrl, setVerifyUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const issue = useCallback(async (registrationNumber: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/qr/issue", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ registrationNumber }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Could not issue QR.");
        return null;
      }

      setToken(data.token);
      setVerifyUrl(data.verifyUrl ?? null);
      return data.token as string;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Network error");
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const reset = useCallback(() => {
    setToken(null);
    setVerifyUrl(null);
    setError(null);
  }, []);

  return { token, verifyUrl, loading, error, issue, reset };
}
