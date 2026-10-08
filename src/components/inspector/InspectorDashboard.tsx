/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Government / traffic roadside lookup — plate, VIC, or QR.
 */

"use client";

import { useRef, useState } from "react";
import { Search, QrCode, Loader2, AlertCircle, FileText, ShieldCheck } from "lucide-react";
import { useQrScanner } from "@/hooks/useQrScanner";
import { useInspectorTickets } from "@/hooks/useInspectorTickets";
import { useAuth } from "@/hooks/useAuth";
import type { InspectorVehicleView } from "@/lib/inspector/queries";
import { RoleWelcomeBanner } from "@/components/common/RoleWelcomeBanner";
import { RoleGuidance } from "@/components/common/RoleGuidance";
import VehicleCompliancePanel from "./VehicleCompliancePanel";
import TicketForm from "./TicketForm";

export default function InspectorDashboard() {
  const { user } = useAuth();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const scanner = useQrScanner(videoRef);
  const { lookupVehicle, createTicket } = useInspectorTickets();

  const [manualQ, setManualQ] = useState("");
  const [lookupLoading, setLookupLoading] = useState(false);
  const [vehicle, setVehicle] = useState<InspectorVehicleView | null>(null);
  const [lookupError, setLookupError] = useState<string | null>(null);
  const [showTicketForm, setShowTicketForm] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3500);
  };

  const handleLookup = async (raw: string) => {
    setLookupError(null);
    setLookupLoading(true);
    setVehicle(null);
    setShowTicketForm(false);

    const result = await lookupVehicle(raw);

    setLookupLoading(false);
    if (!result) {
      setLookupError(
        `No vehicle found for "${raw.trim()}". Try plate (e.g. HSD 101 BM) or VIC.`
      );
      return;
    }

    setVehicle(result);
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualQ.trim()) return;
    void handleLookup(manualQ.trim());
  };

  const handleScanClick = async () => {
    scanner.onDetected((payload) => {
      try {
        if (payload.startsWith("http")) {
          const url = new URL(payload);
          const token = url.searchParams.get("token");
          if (token) {
            fetch("/api/qr/verify", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ token }),
            })
              .then((r) => r.json())
              .then((data) => {
                if (data.valid && data.payload?.r) {
                  void handleLookup(data.payload.r);
                } else {
                  setLookupError("QR token is not valid.");
                }
              })
              .catch(() => setLookupError("Failed to verify QR."));
            return;
          }
        }

        if (payload.startsWith("v1.")) {
          fetch("/api/qr/verify", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ token: payload }),
          })
            .then((r) => r.json())
            .then((data) => {
              if (data.valid && data.payload?.r) {
                void handleLookup(data.payload.r);
              } else {
                setLookupError("QR token is not valid.");
              }
            })
            .catch(() => setLookupError("Failed to verify QR."));
          return;
        }

        void handleLookup(payload);
      } catch {
        setLookupError("Could not parse QR payload.");
      }
    });

    await scanner.start();
  };

  return (
    <div className="space-y-4 max-w-2xl mx-auto">
      <RoleWelcomeBanner
        title={`Inspection desk ready${user?.fullName ? `, ${user.fullName}` : ""}`}
        subtitle="Check permit validity, roadside compliance, and vehicle status quickly before issuing any action or ticket."
        actionLabel="Scan QR"
        actionHref="/inspector/scan"
      />

      {toast && (
        <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-200 rounded-xl px-4 py-3 text-xs font-bold">
          {toast}
        </div>
      )}

      <div className="bg-[#0F0F10] border border-white/[0.06] rounded-2xl p-5 space-y-4">
        <div>
          <h2 className="text-sm font-black uppercase tracking-wide text-white mb-1">
            Roadside lookup
          </h2>
          <p className="text-[11px] text-zinc-500 mb-3">
            Enter number plate or VIC. Results show permit, COF, and driver
            licence validity only — no admin tools.
          </p>

          <form onSubmit={handleManualSubmit} className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
              <input
                type="text"
                placeholder="Plate or VIC (e.g. HSD 101 BM)"
                value={manualQ}
                onChange={(e) => setManualQ(e.target.value.toUpperCase())}
                autoComplete="off"
                className="w-full bg-[#0A0A0A] border border-white/[0.08] rounded-xl pl-10 pr-4 py-3 text-sm font-mono text-white focus:outline-none focus:border-red-500/60"
              />
            </div>
            <button
              type="submit"
              disabled={lookupLoading || !manualQ.trim()}
              className="px-4 py-3 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-1.5 shrink-0"
            >
              {lookupLoading ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Search className="w-3.5 h-3.5" />
              )}
              Look up
            </button>
          </form>

          <div className="mt-3 flex items-center justify-between">
            <span className="text-[10px] text-zinc-500">or</span>
            <button
              type="button"
              onClick={handleScanClick}
              disabled={scanner.scanning}
              className="text-xs font-bold text-red-500 hover:text-red-400 flex items-center gap-1.5"
            >
              <QrCode className="w-3.5 h-3.5" />
              {scanner.scanning ? "Scanning…" : "Scan permit QR"}
            </button>
          </div>
        </div>

        {scanner.scanning && (
          <div className="relative aspect-square max-h-72 rounded-xl overflow-hidden bg-black mx-auto">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
            />
            <button
              type="button"
              onClick={scanner.stop}
              className="absolute bottom-3 left-1/2 -translate-x-1/2 px-3 py-1.5 bg-black/70 text-white rounded-lg text-xs font-bold"
            >
              Stop scanning
            </button>
          </div>
        )}

        {scanner.error && (
          <div className="bg-amber-500/10 border border-amber-500/30 text-amber-200 rounded-xl p-3 text-xs flex items-start gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <span>{scanner.error}</span>
          </div>
        )}

        {!scanner.supported && !scanner.scanning && (
          <div className="text-[11px] text-zinc-500 text-center">
            Camera scanning needs Chrome or Edge. Use plate / VIC entry on this
            device.
          </div>
        )}
      </div>

      {lookupError && (
        <div className="bg-red-500/10 border border-red-500/30 text-red-300 rounded-xl px-4 py-3 text-xs">
          {lookupError}
        </div>
      )}

      <RoleGuidance
        title="Inspection flow"
        items={[
          {
            label: "Lookup roadside vehicle",
            detail: "Check a plate or VIC for permit, compliance, and driver details before action.",
            href: "/inspector/scan",
            icon: Search,
          },
          {
            label: "Scan a permit QR",
            detail: "Use the camera flow for quick roadside verification when the permit code is available.",
            href: "/inspector/scan",
            icon: QrCode,
          },
          {
            label: "Issue a ticket",
            detail: "Open the ticket form after the vehicle passes the compliance review, then submit the required evidence.",
            href: "/inspector/scan",
            icon: FileText,
          },
          {
            label: "Review recent tickets",
            detail: "Check what has already been issued to confirm the current enforcement history.",
            href: "/inspector/tickets",
            icon: ShieldCheck,
          },
        ]}
      />

      {vehicle && (
        <>
          <VehicleCompliancePanel
            vehicle={vehicle}
            onIssueTicket={() => setShowTicketForm(true)}
          />

          {showTicketForm && (
            <TicketForm
              vehicle={vehicle}
              onCancel={() => setShowTicketForm(false)}
              onSubmit={async (input) => {
                const result = await createTicket(input);
                if (result.success) {
                  showToast(
                    `Ticket ${result.ticket?.ticketNumber} issued to ${input.vehicleReg}`
                  );
                  setShowTicketForm(false);
                  return { success: true };
                }
                return { success: false, error: result.error };
              }}
            />
          )}
        </>
      )}
    </div>
  );
}
