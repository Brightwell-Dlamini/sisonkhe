/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Public QR verification page. Anonymous access.
 * Reads ?token=... from the URL, POSTs it to /api/qr/verify, and shows the result.
 */

"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  ShieldCheck,
  ShieldAlert,
  Loader2,
  CheckCircle2,
  XCircle,
  Car,
  FileText,
  Calendar,
} from "lucide-react";

interface VerifyResult {
  valid: boolean;
  reason?: string;
  message?: string;
  payload?: {
    t: string;
    r: string;
    v: string;
    p: string;
    s: string;
    e: string;
    i: number;
  };
  vehicleExists?: boolean;
  permitStatus?: string;
  permitExpiry?: string | null;
  issuedAt?: string;
}

function VerifyInner() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";

  const [result, setResult] = useState<VerifyResult | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) {
      setResult({
        valid: false,
        reason: "MALFORMED",
        message: "No token provided in URL.",
      });
      setLoading(false);
      return;
    }

    const run = async () => {
      try {
        const res = await fetch("/api/qr/verify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token }),
        });
        const data = await res.json();
        setResult(data);
      } catch {
        setResult({
          valid: false,
          reason: "MALFORMED",
          message: "Network error during verification.",
        });
      } finally {
        setLoading(false);
      }
    };
    void run();
  }, [token]);

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-[#050505] flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-md">
        <div className="text-center mb-6">
          <span className="text-3xl">🇸🇿</span>
          <h1 className="text-lg font-black uppercase tracking-tight text-zinc-900 dark:text-white mt-2">
            QR Verification
          </h1>
          <p className="text-xs text-zinc-500 mt-1">
            Sisonkhe In Transit • NRTC Official Verification
          </p>
        </div>

        {loading && (
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-10 text-center">
            <Loader2 className="w-6 h-6 animate-spin text-emerald-600 mx-auto mb-3" />
            <div className="text-xs text-zinc-500">
              Verifying signature…
            </div>
          </div>
        )}

        {!loading && result && result.valid && (
          <div className="bg-white dark:bg-zinc-900 border-2 border-emerald-500 rounded-2xl overflow-hidden">
            <div className="bg-emerald-50 dark:bg-emerald-950/40 p-5 border-b border-emerald-200 dark:border-emerald-800">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-emerald-600 text-white flex items-center justify-center">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <div>
                  <div className="text-[10px] font-black uppercase tracking-widest text-emerald-700 dark:text-emerald-300">
                    Verified Authentic
                  </div>
                  <div className="text-base font-black uppercase text-emerald-900 dark:text-emerald-100">
                    Valid Permit
                  </div>
                </div>
              </div>
            </div>

            <div className="p-5 space-y-3 text-xs">
              <Row
                icon={<Car className="w-4 h-4 text-zinc-400" />}
                label="Vehicle"
                value={result.payload!.r}
                mono
              />
              <Row
                icon={<FileText className="w-4 h-4 text-zinc-400" />}
                label="VIC"
                value={result.payload!.v || "—"}
                mono
              />
              <Row
                icon={<FileText className="w-4 h-4 text-zinc-400" />}
                label="Permit"
                value={result.payload!.p || "—"}
                mono
              />
              <Row
                icon={<CheckCircle2 className="w-4 h-4 text-emerald-500" />}
                label="Status"
                value={result.permitStatus ?? result.payload!.s}
              />
              {result.permitExpiry && (
                <Row
                  icon={<Calendar className="w-4 h-4 text-zinc-400" />}
                  label="Expires"
                  value={result.permitExpiry}
                  mono
                />
              )}
              {result.issuedAt && (
                <Row
                  icon={<Calendar className="w-4 h-4 text-zinc-400" />}
                  label="QR Issued"
                  value={new Date(result.issuedAt).toLocaleString()}
                />
              )}
            </div>
          </div>
        )}

        {!loading && result && !result.valid && (
          <div className="bg-white dark:bg-zinc-900 border-2 border-red-500 rounded-2xl overflow-hidden">
            <div className="bg-red-50 dark:bg-red-950/40 p-5 border-b border-red-200 dark:border-red-800">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-red-600 text-white flex items-center justify-center">
                  <ShieldAlert className="w-6 h-6" />
                </div>
                <div>
                  <div className="text-[10px] font-black uppercase tracking-widest text-red-700 dark:text-red-300">
                    Verification Failed
                  </div>
                  <div className="text-base font-black uppercase text-red-900 dark:text-red-100">
                    {labelForReason(result.reason)}
                  </div>
                </div>
              </div>
            </div>

            <div className="p-5 space-y-3 text-xs">
              <div className="flex items-start gap-2 text-red-700 dark:text-red-300">
                <XCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span>{result.message ?? "Unknown error."}</span>
              </div>

              {result.payload && (
                <div className="pt-3 mt-3 border-t border-red-100 dark:border-red-900/50">
                  <div className="text-[10px] uppercase text-zinc-400 font-bold mb-2">
                    Token Contents (for reference)
                  </div>
                  <div className="font-mono text-[10px] text-zinc-500 space-y-0.5">
                    <div>Vehicle: {result.payload.r}</div>
                    <div>VIC: {result.payload.v || "—"}</div>
                    <div>Permit: {result.payload.p || "—"}</div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        <div className="mt-6 text-center text-[10px] text-zinc-400">
          Cryptographic verification by Sisonkhe In Transit • NRTC
        </div>
      </div>
    </div>
  );
}

function Row({
  icon,
  label,
  value,
  mono,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3 py-1.5 border-b border-zinc-100 dark:border-zinc-800 last:border-0">
      <div className="flex items-center gap-2 text-zinc-500">
        {icon}
        <span>{label}</span>
      </div>
      <span
        className={`font-bold text-zinc-900 dark:text-white text-right ${mono ? "font-mono" : ""}`}
      >
        {value}
      </span>
    </div>
  );
}

function labelForReason(reason?: string): string {
  switch (reason) {
    case "MALFORMED":
      return "Malformed Token";
    case "UNKNOWN_VERSION":
      return "Unsupported Token Version";
    case "BAD_SIGNATURE":
      return "Forged or Tampered";
    case "INVALID_PAYLOAD":
      return "Invalid Payload";
    case "VEHICLE_NOT_FOUND":
      return "Unknown Vehicle";
    case "PERMIT_SUSPENDED":
      return "Permit Suspended";
    case "PERMIT_EXPIRED":
      return "Permit Expired";
    case "QR_TOO_OLD":
      return "QR Expired";
    default:
      return "Verification Failed";
  }
}

export default function VerifyPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-emerald-600" />
        </div>
      }
    >
      <VerifyInner />
    </Suspense>
  );
}
