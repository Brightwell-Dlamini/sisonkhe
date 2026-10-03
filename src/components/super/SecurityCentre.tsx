"use client";

import { useCallback, useEffect, useState } from "react";
import { Shield, Loader2, Plus, X, AlertTriangle } from "lucide-react";
import type { SecurityThreat } from "@/lib/super/security";

export default function SecurityCentre() {
  const [threats, setThreats] = useState<SecurityThreat[]>([]);
  const [whitelist, setWhitelist] = useState<string[]>([]);
  const [blacklist, setBlacklist] = useState<string[]>([]);
  const [newIp, setNewIp] = useState("");
  const [listType, setListType] = useState<"white" | "black">("white");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const [tRes, lRes] = await Promise.all([
      fetch("/api/super/security/threats"),
      fetch("/api/super/security/ip-lists"),
    ]);
    if (tRes.ok) setThreats((await tRes.json()).threats ?? []);
    if (lRes.ok) {
      const lists = await lRes.json();
      setWhitelist(lists.whitelist ?? []);
      setBlacklist(lists.blacklist ?? []);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const saveLists = async (w: string[], b: string[]) => {
    await fetch("/api/super/security/ip-lists", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ whitelist: w, blacklist: b }),
    });
  };

  const addIp = async () => {
    if (!newIp.trim()) return;
    if (listType === "white") {
      const next = [...whitelist, newIp.trim()];
      setWhitelist(next);
      await saveLists(next, blacklist);
    } else {
      const next = [...blacklist, newIp.trim()];
      setBlacklist(next);
      await saveLists(whitelist, next);
    }
    setNewIp("");
  };

  const removeIp = async (ip: string, list: "white" | "black") => {
    if (list === "white") {
      const next = whitelist.filter((i) => i !== ip);
      setWhitelist(next);
      await saveLists(next, blacklist);
    } else {
      const next = blacklist.filter((i) => i !== ip);
      setBlacklist(next);
      await saveLists(whitelist, next);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="w-6 h-6 animate-spin text-red-600" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <header>
        <h1 className="text-xl font-black text-zinc-900 dark:text-white uppercase tracking-tight flex items-center gap-2">
          <Shield className="w-5 h-5 text-red-600" />
          Security Centre
        </h1>
        <p className="text-xs text-zinc-500 mt-1">
          Threat monitoring and subnet access control.
        </p>
      </header>

      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5">
        <h3 className="text-xs font-black uppercase tracking-wider text-zinc-900 dark:text-white mb-3 flex items-center gap-2">
          <AlertTriangle className="w-3.5 h-3.5 text-red-500" />
          Live Threats ({threats.length})
        </h3>
        {threats.length === 0 ? (
          <div className="text-center text-xs text-zinc-500 py-6">
            No elevated activity detected.
          </div>
        ) : (
          <div className="space-y-2">
            {threats.map((t) => (
              <div
                key={t.id}
                className="p-3 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-xs"
              >
                <div className="flex justify-between">
                  <span className="font-mono font-bold text-red-800 dark:text-red-300">
                    {t.ipAddress}
                  </span>
                  <span className="text-[10px] font-black uppercase text-red-600">
                    {t.severity}
                  </span>
                </div>
                <div className="text-red-700 dark:text-red-300 mt-1">{t.event}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 space-y-4">
        <h3 className="text-xs font-black uppercase tracking-wider text-zinc-900 dark:text-white">
          IP Access Lists
        </h3>

        <div className="flex flex-wrap gap-2">
          <select
            value={listType}
            onChange={(e) => setListType(e.target.value as "white" | "black")}
            className="bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 py-2 text-xs font-bold"
          >
            <option value="white">Whitelist</option>
            <option value="black">Blacklist</option>
          </select>
          <input
            value={newIp}
            onChange={(e) => setNewIp(e.target.value)}
            placeholder="192.168.1.1"
            className="flex-1 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 py-2 text-xs font-mono min-w-[150px]"
          />
          <button
            onClick={addIp}
            className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1"
          >
            <Plus className="w-3.5 h-3.5" /> Add
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <div className="text-[10px] uppercase font-bold text-emerald-600 mb-2">
              Whitelist ({whitelist.length})
            </div>
            <div className="flex flex-wrap gap-1.5">
              {whitelist.map((ip) => (
                <span
                  key={ip}
                  className="inline-flex items-center gap-1 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 text-[10px] font-mono px-2 py-1 rounded-lg border border-emerald-200"
                >
                  {ip}
                  <button onClick={() => removeIp(ip, "white")} className="text-emerald-400 hover:text-red-500">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
          </div>

          <div>
            <div className="text-[10px] uppercase font-bold text-red-600 mb-2">
              Blacklist ({blacklist.length})
            </div>
            <div className="flex flex-wrap gap-1.5">
              {blacklist.map((ip) => (
                <span
                  key={ip}
                  className="inline-flex items-center gap-1 bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 text-[10px] font-mono px-2 py-1 rounded-lg border border-red-200"
                >
                  {ip}
                  <button onClick={() => removeIp(ip, "black")} className="text-red-400 hover:text-red-600">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
