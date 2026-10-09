/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Public QR verification page. Anonymous access.
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
  QrCode,
  LogIn,
  User,
  Building2,
} from "lucide-react";
import BrandMark from "@/components/common/BrandMark";
import { RoleGuidance } from "@/components/common/RoleGuidance";

interface VerifyResult {
  valid: boolean;
  reason?: string;
  message?: string;
  entityType?: string;
  payload?: Record<string, unknown>;
  summary?: Record<string, string | null>;
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
        message: "No token provided in URL. Scan an official signed QR.",
      });
      setLoading(false);
      return;
    }

    const run = async () => {
      try {
        const res = await fetch("/api/qr/verify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token, source: "public-verify-page" }),
        });
        const data = await res.json();
        setResult(data.data ?? data);
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
          <div className="flex justify-center mb-2">
            <BrandMark size="md" showSubtitle />
          </div>
          <h1 className="text-lg font-black uppercase tracking-tight text-zinc-900 dark:text-white mt-2">
            QR Verification
          </h1>
          <p className="text-xs text-zinc-500 mt-1">NRTC Official Verification</p>
        </div>

        {loading && (
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-10 text-center">
            <Loader2 className="w-6 h-6 animate-spin text-emerald-600 mx-auto mb-3" />
            <div className="text-xs text-zinc-500">Verifying signature…</div>
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
                    {titleForEntity(result.entityType)}
                  </div>
                </div>
              </div>
            </div>

            <div className="p-5 space-y-3 text-xs">
              {result.entityType === "vehicle" && (
                <>
                  <Row
                    icon={<Car className="w-4 h-4 text-zinc-400" />}
                    label="Vehicle"
                    value={str(result.summary?.plate)}
                    mono
                  />
                  <Row
                    icon={<FileText className="w-4 h-4 text-zinc-400" />}
                    label="VIC"
                    value={str(result.summary?.vic)}
                    mono
                  />
                  <Row
                    icon={<FileText className="w-4 h-4 text-zinc-400" />}
                    label="Permit"
                    value={str(result.summary?.permit)}
                    mono
                  />
                  {(result.summary?.make || result.summary?.model) && (
                    <Row
                      icon={<Car className="w-4 h-4 text-zinc-400" />}
                      label="Make / model"
                      value={`${result.summary?.make ?? ""} ${result.summary?.model ?? ""}`.trim()}
                    />
                  )}
                  <Row
                    icon={<CheckCircle2 className="w-4 h-4 text-emerald-500" />}
                    label="Status"
                    value={str(result.permitStatus ?? result.summary?.status)}
                  />
                  {result.permitExpiry && (
                    <Row
                      icon={<Calendar className="w-4 h-4 text-zinc-400" />}
                      label="Expires"
                      value={result.permitExpiry}
                      mono
                    />
                  )}
                </>
              )}

              {result.entityType === "operator" && (
                <>
                  <Row
                    icon={<Building2 className="w-4 h-4 text-zinc-400" />}
                    label="Operator"
                    value={str(result.summary?.name)}
                  />
                  <Row
                    icon={<Building2 className="w-4 h-4 text-zinc-400" />}
                    label="Company"
                    value={str(result.summary?.company)}
                  />
                  <Row
                    icon={<FileText className="w-4 h-4 text-zinc-400" />}
                    label="Licence"
                    value={str(result.summary?.licence)}
                    mono
                  />
                </>
              )}

              {result.entityType === "driver" && (
                <>
                  <Row
                    icon={<User className="w-4 h-4 text-zinc-400" />}
                    label="Driver"
                    value={str(result.summary?.name)}
                  />
                  <Row
                    icon={<CheckCircle2 className="w-4 h-4 text-emerald-500" />}
                    label="PDP"
                    value={str(result.summary?.pdpStatus)}
                  />
                  {result.summary?.pdpExpiry && (
                    <Row
                      icon={<Calendar className="w-4 h-4 text-zinc-400" />}
                      label="PDP expires"
                      value={result.summary.pdpExpiry}
                      mono
                    />
                  )}
                  {result.summary?.assignedVehicle && (
                    <Row
                      icon={<Car className="w-4 h-4 text-zinc-400" />}
                      label="Assigned vehicle"
                      value={result.summary.assignedVehicle}
                      mono
                    />
                  )}
                </>
              )}

              {result.issuedAt && (
                <Row
                  icon={<Calendar className="w-4 h-4 text-zinc-400" />}
                  label="QR issued"
                  value={new Date(result.issuedAt).toLocaleString()}
                />
              )}
            </div>
          </div>
        )}

        {!loading && result && !result.valid && (
          <div className="bg-white dark:bg-zinc-900 border-2 border-red-500 rounded-2xl overflow-hidden">
            <div className="bg-red-50 dark:bg-red-950/40 p-5 border-b border-red-200 dark:border-red-900/50">
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

              {result.summary && Object.keys(result.summary).length > 0 && (
                <div className="pt-3 mt-3 border-t border-red-100 dark:border-red-900/50 space-y-1">
                  {Object.entries(result.summary).map(([k, v]) =>
                    v ? (
                      <div key={k} className="font-mono text-[10px] text-zinc-500">
                        {k}: {v}
                      </div>
                    ) : null
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        <div className="mt-6">
          <RoleGuidance
            title="Quick actions"
            className="border-zinc-200 bg-white text-zinc-900 shadow-sm dark:border-white/[0.08] dark:bg-[#0F0F10] dark:text-white"
            items={[
              {
                label: "Scan again",
                detail: "Open a fresh verification for another official QR.",
                href: "/verify",
                icon: QrCode,
              },
              {
                label: "Staff sign-in",
                detail: "Operator and marshal dashboards for live operations.",
                href: "/login",
                icon: LogIn,
              },
              {
                label: "Public kiosk",
                detail: "Live public transport board.",
                href: "/kiosk",
                icon: ShieldCheck,
              },
            ]}
          />
        </div>

        <div className="mt-6 text-center text-[10px] text-zinc-400">
          Cryptographic verification by Sisonkhe In Transit · NRTC
        </div>
      </div>
    </div>
  );
}

function str(v: string | null | undefined): string {
  return v && String(v).trim() ? String(v) : "—";
}

function titleForEntity(t?: string): string {
  switch (t) {
    case "operator":
      return "Valid Operator";
    case "driver":
      return "Valid Driver";
    default:
      return "Valid Permit";
  }
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
    case "OPERATOR_NOT_FOUND":
      return "Unknown Operator";
    case "DRIVER_NOT_FOUND":
      return "Unknown Driver";
    case "PERMIT_SUSPENDED":
      return "Permit Suspended";
    case "PERMIT_EXPIRED":
      return "Permit Expired";
    case "PERMIT_SUPERSEDED":
      return "Permit Superseded";
    case "PDP_INVALID":
      return "PDP Invalid";
    case "PDP_EXPIRED":
      return "PDP Expired";
    case "QR_TOO_OLD":
      return "QR Too Old";
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
