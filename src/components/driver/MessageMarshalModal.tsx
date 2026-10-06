/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Messages go through the server, never directly to Supabase from the browser.
 * The server owns notification shape + idempotency + audit.
 */

"use client";

import { useState } from "react";
import { Send, X, Loader2, AlertCircle } from "lucide-react";
import type { DriverContext } from "@/lib/driver/queries";

interface Props {
  marshal: NonNullable<DriverContext["marshal"]>;
  driverName: string;
  onClose: () => void;
  onSent: () => void;
}

const PRESETS = [
  "Ready at bay — awaiting dispatch instructions.",
  "Passenger capacity reached.",
  "Minor mechanical issue — need assistance.",
  "Traffic delay on route.",
  "Arrived back at terminal.",
];

export default function MessageMarshalModal({
  marshal,
  driverName,
  onClose,
  onSent,
}: Props) {
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSend = async () => {
    if (!text.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/driver/message", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text.trim() }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(body.error ?? `HTTP ${res.status}`);
        return;
      }
      onSent();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#0F0F10] border border-white/[0.06] rounded-2xl shadow-2xl max-w-md w-full p-5 space-y-4">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-sm font-black uppercase text-white">
              Message Marshal
            </h3>
            <p className="text-[11px] text-zinc-500">
              {marshal.fullName}
              {marshal.phone ? ` • ${marshal.phone}` : ""}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-200"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {error && (
          <div className="bg-rose-500/10 border border-rose-500/25 text-rose-400 rounded-xl p-3 text-xs flex items-start gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <div className="space-y-1.5">
          <label className="text-[10px] font-bold uppercase text-zinc-500">
            Quick Messages
          </label>
          <div className="flex flex-wrap gap-1.5">
            {PRESETS.map((p) => (
              <button
                key={p}
                onClick={() => setText(p)}
                className="px-2.5 py-1 rounded-lg bg-white/[0.06] text-[11px] text-zinc-300 font-medium hover:bg-white/[0.10]"
              >
                {p.length > 40 ? p.slice(0, 40) + "…" : p}
              </button>
            ))}
          </div>
        </div>

        <textarea
          rows={3}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Type your message to the marshal…"
          className="w-full bg-white/[0.03] border border-white/[0.08] rounded-xl px-3.5 py-2.5 text-sm text-white resize-none"
        />

        <div className="flex gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2.5 bg-white/[0.06] text-zinc-300 rounded-xl text-xs font-bold"
          >
            Cancel
          </button>
          <button
            onClick={handleSend}
            disabled={loading || !text.trim()}
            className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-1.5"
          >
            {loading ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Send className="w-3.5 h-3.5" />
            )}
            Send Message
          </button>
        </div>
      </div>
    </div>
  );
}
