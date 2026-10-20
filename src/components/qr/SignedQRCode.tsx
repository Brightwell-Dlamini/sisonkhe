/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Renders a signed QR. The QR encodes the *verify URL* (token in hash),
 * so a phone camera opens the public verify page. High error correction
 * for dust / sun / bent plastic at ranks.
 */

"use client";

import { useEffect } from "react";
import { Loader2, AlertCircle, RefreshCw } from "lucide-react";
import QRCodeView from "../common/QRCodeView";
import { useVehicleQR } from "@/hooks/useVehicleQR";

interface Props {
  registrationNumber: string;
  size?: number;
  showRefreshButton?: boolean;
  className?: string;
}

export default function SignedQRCode({
  registrationNumber,
  size = 220,
  showRefreshButton = true,
  className,
}: Props) {
  const { token, verifyUrl, loading, error, issue } = useVehicleQR();

  useEffect(() => {
    void issue(registrationNumber);
  }, [registrationNumber, issue]);

  const handleRefresh = () => {
    void issue(registrationNumber);
  };

  // Prefer full verify URL so consumer cameras open the page.
  // Fall back to raw token for staff scanners that POST the payload.
  const qrPayload = verifyUrl || token;

  if (loading && !qrPayload) {
    return (
      <div
        className={`flex items-center justify-center bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 ${className ?? ""}`}
        style={{ width: size, height: size }}
      >
        <Loader2 className="w-5 h-5 animate-spin text-emerald-600" />
      </div>
    );
  }

  if (error && !qrPayload) {
    return (
      <div
        className={`flex flex-col items-center justify-center gap-2 bg-red-50 dark:bg-red-950/40 rounded-xl border border-red-200 dark:border-red-800 p-3 ${className ?? ""}`}
        style={{ width: size, height: size }}
      >
        <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
        <span className="text-[10px] text-red-700 dark:text-red-300 text-center">
          {error}
        </span>
        <button
          onClick={handleRefresh}
          className="mt-1 px-2 py-1 rounded-lg bg-red-600 text-white text-[10px] font-bold"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!qrPayload) return null;

  return (
    <div className={`flex flex-col items-center gap-2 ${className ?? ""}`}>
      <QRCodeView
        data={qrPayload}
        size={size}
        margin={2}
        fgColor="#000000"
        bgColor="#ffffff"
        errorCorrectionLevel="H"
      />

      {showRefreshButton && (
        <button
          onClick={handleRefresh}
          disabled={loading}
          className="text-[10px] text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 flex items-center gap-1 disabled:opacity-50"
          title="Re-issue QR with current permit state"
        >
          <RefreshCw
            className={`w-3 h-3 ${loading ? "animate-spin" : ""}`}
          />
          Re-issue
        </button>
      )}
    </div>
  );
}
