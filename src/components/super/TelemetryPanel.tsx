"use client";

import { useEffect, useState } from "react";
import { Loader2, Cpu, Server, Activity, Database } from "lucide-react";
import type { TelemetrySnapshot } from "@/lib/super/telemetry";

export default function TelemetryPanel() {
  const [data, setData] = useState<TelemetrySnapshot | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = () =>
      fetch("/api/super/telemetry")
        .then((r) => r.json())
        .then(setData)
        .finally(() => setLoading(false));
    void load();
    const timer = setInterval(load, 10000);
    return () => clearInterval(timer);
  }, []);

  if (loading || !data) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
      </div>
    );
  }

  const uptimeHours = Math.floor(data.uptimeSeconds / 3600);
  const uptimeMins = Math.floor((data.uptimeSeconds % 3600) / 60);

  return (
    <div className="space-y-4">
      <header>
        <h1 className="text-xl font-black text-white uppercase tracking-tight flex items-center gap-2">
          <Activity className="w-5 h-5 text-blue-600" />
          Telemetry
        </h1>
        <p className="text-xs text-zinc-500 mt-1">
          Live server and database metrics. Auto-refreshes every 10s.
        </p>
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <Card icon={Server} label="Uptime" value={`${uptimeHours}h ${uptimeMins}m`} />
        <Card icon={Database} label="DB Latency" value={`${data.dbLatencyMs}ms`} />
        <Card icon={Cpu} label="Node Version" value={data.nodeVersion} />
        <Card icon={Activity} label="Sync Events (1h)" value={String(data.syncEvents1h)} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <InfoCard label="Active Clients (24h)" value={String(data.activeClients24h)} />
        <InfoCard label="Memory (heap)" value={`${data.memoryMb} MB`} />
        <InfoCard label="CPU Cores" value={String(data.cpuCount)} />
        <InfoCard label="Server Time" value={new Date(data.serverTime).toLocaleTimeString()} />
      </div>
    </div>
  );
}

function Card({ icon: Icon, label, value }: any) {
  return (
    <div className="bg-[#0F0F10] border border-white/[0.06] rounded-2xl p-4">
      <Icon className="w-4 h-4 text-blue-600 mb-2" />
      <div className="text-[10px] uppercase font-bold text-zinc-400">{label}</div>
      <div className="text-lg font-mono font-black text-white mt-1">
        {value}
      </div>
    </div>
  );
}

function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-[#0F0F10] border border-white/[0.06] rounded-2xl p-4">
      <div className="text-[10px] uppercase font-bold text-zinc-400">{label}</div>
      <div className="text-lg font-mono font-black text-white mt-1">
        {value}
      </div>
    </div>
  );
}
