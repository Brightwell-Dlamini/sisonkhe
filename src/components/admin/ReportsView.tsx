"use client";

import { useState } from "react";
import {
  FileText,
  Download,
  Clock,
  AlertTriangle,
  Wrench,
  Award,
  Car,
  Loader2,
} from "lucide-react";

const REPORTS = [
  {
    id: "expiring-permits",
    label: "Expiring Permits (30 days)",
    desc: "Vehicles with permits expiring in the next 30 days",
    icon: Clock,
  },
  {
    id: "expired-permits",
    label: "Expired Permits",
    desc: "Vehicles with lapsed permits",
    icon: AlertTriangle,
  },
  {
    id: "cof-expiry",
    label: "COF Expiry Report",
    desc: "Certificates of Fitness expiry dates",
    icon: Wrench,
  },
  {
    id: "renewals",
    label: "Renewal Requests",
    desc: "History of all permit renewal requests",
    icon: Award,
  },
  {
    id: "fleet-status",
    label: "Fleet Status Report",
    desc: "Full vehicle registry status",
    icon: Car,
  },
];

export default function ReportsView() {
  const [downloading, setDownloading] = useState<string | null>(null);

  const handleDownload = async (type: string) => {
    setDownloading(type);
    try {
      const res = await fetch(`/api/admin/reports/compliance?type=${type}`);
      if (!res.ok) {
        alert("Report generation failed");
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download =
        res.headers
          .get("Content-Disposition")
          ?.match(/filename="(.+)"/)?.[1] ?? `${type}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } finally {
      setDownloading(null);
    }
  };

  return (
    <div className="space-y-4">
      <header>
        <h1 className="text-xl font-black text-zinc-900 dark:text-white uppercase tracking-tight flex items-center gap-2">
          <FileText className="w-5 h-5 text-emerald-600" />
          Compliance Reports
        </h1>
        <p className="text-xs text-zinc-500 mt-1">
          Generate CSV exports for regulatory filing and audit.
        </p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {REPORTS.map((r) => {
          const Icon = r.icon;
          return (
            <div
              key={r.id}
              className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 flex items-start gap-4"
            >
              <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                <Icon className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-black text-zinc-900 dark:text-white">
                  {r.label}
                </h3>
                <p className="text-xs text-zinc-500 mt-0.5">{r.desc}</p>
              </div>
              <button
                onClick={() => handleDownload(r.id)}
                disabled={downloading === r.id}
                className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shrink-0"
              >
                {downloading === r.id ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Download className="w-3.5 h-3.5" />
                )}
                CSV
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
