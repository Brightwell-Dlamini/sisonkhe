/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Roadside inspection desk — scan → verdict → ticket.
 */

"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  Search,
  QrCode,
  Loader2,
  AlertCircle,
  FileText,
  Car,
  UserCircle,
  WifiOff,
} from "lucide-react";
import { useQrScanner } from "@/hooks/useQrScanner";
import { useInspectorTickets } from "@/hooks/useInspectorTickets";
import { useAuth } from "@/hooks/useAuth";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import type { InspectorVehicleView } from "@/lib/inspector/queries";
import { parseQrScanInput } from "@/lib/qr/parse";
import VehicleCompliancePanel from "./VehicleCompliancePanel";
import TicketForm from "./TicketForm";

export default function InspectorDashboard() {
  const { user } = useAuth();
  const online = useOnlineStatus();
  const searchParams = useSearchParams();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const scanner = useQrScanner(videoRef);
  const { lookupVehicle, createTicket } = useInspectorTickets();
  const autoLookupDone = useRef(false);

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
    if (!online) {
      setLookupError(
        "You are offline. Plate lookup needs a connection. Try again when signal returns."
      );
      return;
    }

    setLookupError(null);
    setLookupLoading(true);
    setVehicle(null);
    setShowTicketForm(false);

    try {
      const result = await lookupVehicle(raw);
      setLookupLoading(false);
      if (!result) {
        setLookupError(
          `No vehicle for "${raw.trim()}". Check plate or VIC and try again.`
        );
        return;
      }
      setVehicle(result);
    } catch {
      setLookupLoading(false);
      setLookupError(
        online
          ? "Lookup failed. Check connection and try again."
          : "Offline — cannot reach the registry."
      );
    }
  };

  const verifyTokenThenLookup = async (token: string) => {
    if (!online) {
      setLookupError("Offline — cannot verify QR signature. Use plate entry when online.");
      return;
    }
    try {
      const res = await fetch("/api/qr/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          source: "inspector-scan",
          actorUserId: user?.id ?? null,
          actorRole: user?.role ?? "inspector",
        }),
      });
      const body = await res.json();
      const data = body.data ?? body;

      if (data.valid && data.entityType === "vehicle" && data.payload?.r) {
        void handleLookup(String(data.payload.r));
        return;
      }

      if (data.valid && data.entityType === "driver" && data.summary?.assignedVehicle) {
        void handleLookup(String(data.summary.assignedVehicle));
        return;
      }

      if (data.valid && data.entityType === "operator") {
        setLookupError(
          `Operator verified: ${data.summary?.name ?? "operator"}. Scan a vehicle permit for roadside checks.`
        );
        return;
      }

      setLookupError(
        data.message
          ? `QR invalid: ${data.message}`
          : "QR is not valid for vehicle lookup."
      );
    } catch {
      setLookupError("Could not verify QR — network error.");
    }
  };

  useEffect(() => {
    const q = searchParams.get("q")?.trim();
    if (!q || autoLookupDone.current) return;
    autoLookupDone.current = true;
    setManualQ(q.toUpperCase());
    void handleLookup(q);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualQ.trim()) return;
    void handleLookup(manualQ.trim());
  };

  const handleScanClick = async () => {
    scanner.onDetected((payload) => {
      const parsed = parseQrScanInput(payload);
      if (parsed.kind === "token") {
        void verifyTokenThenLookup(parsed.token);
        return;
      }
      if (parsed.kind === "lookup") {
        void handleLookup(parsed.query);
        return;
      }
      setLookupError("Could not read QR.");
    });
    await scanner.start();
  };

  return (
    <div className="space-y-5 max-w-2xl mx-auto pb-8">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-black uppercase tracking-tight text-white">
            Roadside
          </h1>
          <p className="text-sm text-zinc-400 mt-0.5">
            {user?.fullName ? user.fullName : "Inspector"} · plate, VIC, or QR
          </p>
        </div>
        {!online && (
          <div className="flex items-center gap-1.5 text-amber-300 text-xs font-bold bg-amber-950/50 border border-amber-500/40 rounded-lg px-2.5 py-1.5">
            <WifiOff className="w-3.5 h-3.5" />
            Offline
          </div>
        )}
      </div>

      {/* Field actions — real links, not guidance theatre */}
      <div className="flex flex-wrap gap-2">
        <Link
          href="/inspector/vehicles"
          className="px-3 py-2 rounded-xl bg-white/[0.06] border border-white/[0.08] text-zinc-200 text-xs font-bold flex items-center gap-1.5"
        >
          <Car className="w-3.5 h-3.5" />
          Vehicles
        </Link>
        <Link
          href="/inspector/drivers"
          className="px-3 py-2 rounded-xl bg-white/[0.06] border border-white/[0.08] text-zinc-200 text-xs font-bold flex items-center gap-1.5"
        >
          <UserCircle className="w-3.5 h-3.5" />
          Drivers
        </Link>
        <Link
          href="/inspector/tickets"
          className="px-3 py-2 rounded-xl bg-white/[0.06] border border-white/[0.08] text-zinc-200 text-xs font-bold flex items-center gap-1.5"
        >
          <FileText className="w-3.5 h-3.5" />
          Tickets
        </Link>
      </div>

      {toast && (
        <div className="bg-emerald-500/15 border border-emerald-500/40 text-emerald-100 rounded-xl px-4 py-3 text-sm font-bold">
          {toast}
        </div>
      )}

      <div className="bg-[#0F0F10] border border-white/[0.08] rounded-2xl p-5 space-y-4">
        <form onSubmit={handleManualSubmit} className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400" />
            <input
              type="text"
              placeholder="Plate or VIC"
              value={manualQ}
              onChange={(e) => setManualQ(e.target.value.toUpperCase())}
              autoComplete="off"
              className="w-full bg-[#0A0A0A] border border-white/[0.1] rounded-2xl pl-12 pr-4 py-4 text-base sm:text-lg font-mono text-white focus:outline-none focus:border-red-500/70"
            />
          </div>
          <button
            type="submit"
            disabled={lookupLoading || !manualQ.trim()}
            className="px-6 py-4 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white rounded-2xl text-sm font-black uppercase tracking-wider flex items-center justify-center gap-2 shrink-0 min-h-[3.25rem]"
          >
            {lookupLoading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Search className="w-5 h-5" />
            )}
            Look up
          </button>
        </form>

        <button
          type="button"
          onClick={handleScanClick}
          disabled={scanner.scanning || !online}
          className="w-full py-3.5 rounded-2xl border border-red-500/40 bg-red-950/30 hover:bg-red-950/50 disabled:opacity-40 text-red-200 text-sm font-black uppercase tracking-wider flex items-center justify-center gap-2"
        >
          <QrCode className="w-5 h-5" />
          {scanner.scanning ? "Scanning…" : "Scan permit QR"}
        </button>

        {scanner.scanning && (
          <div className="relative aspect-square max-h-80 rounded-2xl overflow-hidden bg-black mx-auto">
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
              className="absolute bottom-4 left-1/2 -translate-x-1/2 px-4 py-2 bg-black/80 text-white rounded-xl text-sm font-bold"
            >
              Stop
            </button>
          </div>
        )}

        {scanner.error && (
          <div className="bg-amber-500/10 border border-amber-500/30 text-amber-100 rounded-xl p-3 text-sm flex items-start gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <span>{scanner.error}</span>
          </div>
        )}
      </div>

      {lookupError && (
        <div className="bg-red-500/15 border border-red-500/40 text-red-100 rounded-2xl px-4 py-4 text-sm font-medium">
          {lookupError}
        </div>
      )}

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
                if (!online) {
                  return {
                    success: false,
                    error: "Offline — ticket cannot be issued until you reconnect.",
                  };
                }
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
