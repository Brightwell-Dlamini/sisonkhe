"use client";

import { useState } from "react";
import { Sparkles, Loader2, Send } from "lucide-react";

interface Response {
  query: string;
  answer: string;
  bullets: string[];
}

const PRESETS = [
  "Show me expiring permits",
  "Any security concerns?",
  "System health status",
  "Vehicle inventory",
];

export default function AssistantPanel() {
  const [query, setQuery] = useState("");
  const [response, setResponse] = useState<Response | null>(null);
  const [loading, setLoading] = useState(false);

  const ask = async (q: string) => {
    setQuery(q);
    setLoading(true);
    setResponse(null);
    try {
      const res = await fetch("/api/super/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: q }),
      });
      if (res.ok) setResponse(await res.json());
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <header>
        <h1 className="text-xl font-black text-white uppercase tracking-tight flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-purple-600" />
          AI Virtual Assistant
        </h1>
        <p className="text-xs text-zinc-500 mt-1">
          Ask about system status, permits, security, or inventory.
        </p>
      </header>

      <div className="bg-[#0F0F10] border border-white/[0.06] rounded-2xl p-5 space-y-4">
        <div className="flex flex-wrap gap-1.5">
          {PRESETS.map((p) => (
            <button
              key={p}
              onClick={() => ask(p)}
              className="px-2.5 py-1.5 rounded-lg bg-purple-950/40 text-purple-300 text-xs font-bold"
            >
              {p}
            </button>
          ))}
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (query.trim()) void ask(query);
          }}
          className="flex gap-2"
        >
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Ask a question…"
            className="flex-1 bg-white/[0.03] border border-white/[0.06] rounded-xl px-3.5 py-2.5 text-sm"
          />
          <button
            type="submit"
            disabled={loading}
            className="px-4 py-2.5 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white rounded-xl text-xs font-black uppercase flex items-center gap-1.5"
          >
            {loading ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Send className="w-3.5 h-3.5" />
            )}
            Ask
          </button>
        </form>

        {response && (
          <div className="p-4 rounded-xl bg-purple-950/30 border border-purple-800 space-y-2">
            <div className="text-[10px] uppercase font-bold text-purple-600">
              Response
            </div>
            <div className="text-sm text-white font-bold">
              {response.answer}
            </div>
            {response.bullets.length > 0 && (
              <ul className="space-y-1 text-xs text-zinc-300">
                {response.bullets.map((b, i) => (
                  <li key={i} className="font-mono">
                    • {b}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
