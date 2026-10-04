"use client";

import { useState } from "react";
import { Send, Loader2, MessageSquare, Inbox } from "lucide-react";
import { useDriverMessages } from "@/hooks/useDriverMessages";

interface Props {
  drivers: { id: string; name: string; phone: string | null }[];
}

export default function DriverCommsPanel({ drivers }: Props) {
  const { messages, loading, refresh, send } = useDriverMessages();
  const [selectedDriverId, setSelectedDriverId] = useState<string>(
    drivers[0]?.id ?? ""
  );
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);

  const selectedDriver = drivers.find((d) => d.id === selectedDriverId);

  const handleSend = async () => {
    if (!text.trim() || !selectedDriver) return;
    setSending(true);
    await send(selectedDriver.name, selectedDriver.phone, text.trim());
    setText("");
    setSending(false);
  };

  const PRESETS = [
    "Please proceed to the loading bay now.",
    "Your position in the queue has changed.",
    "Document check required before departure.",
    "Depart when ready. Corridor is clear.",
  ];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      <div className="bg-[#0F0F10] border border-white/[0.06] rounded-2xl p-4">
        <h4 className="text-xs font-black uppercase tracking-wider text-white mb-3">
          Drivers
        </h4>
        {drivers.length === 0 ? (
          <div className="text-xs text-zinc-500 text-center py-6">
            No drivers on this route.
          </div>
        ) : (
          <div className="space-y-1.5 max-h-96 overflow-y-auto">
            {drivers.map((d) => (
              <button
                key={d.id}
                onClick={() => setSelectedDriverId(d.id)}
                className={`w-full text-left p-2.5 rounded-xl border transition-colors ${
                  selectedDriverId === d.id
                    ? "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-700"
                    : "bg-[#0F0F10] border-white/[0.06]"
                }`}
              >
                <div className="font-bold text-xs text-white">
                  {d.name}
                </div>
                {d.phone && (
                  <div className="text-[10px] text-zinc-500 font-mono mt-0.5">
                    {d.phone}
                  </div>
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="lg:col-span-2 bg-[#0F0F10] border border-white/[0.06] rounded-2xl p-4 flex flex-col">
        <div className="flex items-center gap-2 pb-3 border-b border-white/[0.06]">
          <MessageSquare className="w-4 h-4 text-emerald-600" />
          <h4 className="text-xs font-black uppercase tracking-wider text-white">
            {selectedDriver?.name ?? "Select a driver"}
          </h4>
        </div>

        <div className="flex-1 overflow-y-auto py-3 space-y-2 max-h-80">
          {messages.length === 0 ? (
            <div className="text-center py-8 text-xs text-zinc-500">
              <Inbox className="w-6 h-6 mx-auto mb-2 text-zinc-300" />
              No messages yet.
            </div>
          ) : (
            messages
              .filter((m) => !selectedDriver || m.driverName === selectedDriver.name)
              .map((m) => (
                <div
                  key={m.id}
                  className={`flex ${
                    m.sender === "marshal" ? "justify-end" : "justify-start"
                  }`}
                >
                  <div
                    className={`max-w-[75%] p-2.5 rounded-2xl text-xs ${
                      m.sender === "marshal"
                        ? "bg-emerald-600 text-white rounded-br-none"
                        : "bg-white/[0.06] text-white rounded-bl-none"
                    }`}
                  >
                    <div>{m.message}</div>
                    <div
                      className={`text-[9px] mt-1 font-mono ${
                        m.sender === "marshal" ? "text-emerald-200" : "text-zinc-500"
                      }`}
                    >
                      {new Date(m.timestamp).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </div>
                  </div>
                </div>
              ))
          )}
        </div>

        <div className="pt-3 border-t border-white/[0.06] space-y-2">
          <div className="flex flex-wrap gap-1">
            {PRESETS.map((p) => (
              <button
                key={p}
                onClick={() => setText(p)}
                className="px-2 py-1 rounded-lg bg-white/[0.06] text-[10px] text-zinc-300 font-medium"
              >
                {p.slice(0, 30)}
                {p.length > 30 ? "\u2026" : ""}
              </button>
            ))}
          </div>

          <div className="flex gap-2">
            <input
              type="text"
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  void handleSend();
                }
              }}
              placeholder="Type a message\u2026"
              className="flex-1 bg-[#0F0F10] border border-white/[0.06] rounded-xl px-3.5 py-2 text-xs text-white"
            />
            <button
              onClick={handleSend}
              disabled={sending || !text.trim() || !selectedDriver}
              className="p-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white"
            >
              {sending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
