"use client";

import { useState } from "react";
import {
  Download,
  Clock,
  AlertTriangle,
  Wrench,
  Award,
  Car,
} from "lucide-react";
import {
  Button,
  PageHeader,
  useToast,
} from "@/components/ui";

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
  const toast = useToast();

  const handleDownload = async (type: string) => {
    setDownloading(type);
    try {
      const res = await fetch(`/api/admin/reports/compliance?type=${type}`);
      if (!res.ok) {
        toast.error("Report generation failed");
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
      toast.success("Report downloaded", a.download);
    } finally {
      setDownloading(null);
    }
  };

  return (
    <div>
      <PageHeader
        title="Compliance Reports"
        description="Generate CSV exports for regulatory filing and audit."
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {REPORTS.map((r) => {
          const Icon = r.icon;
          return (
            <div
              key={r.id}
              className="bg-[#0F0F10] border border-white/[0.06] rounded-2xl p-5 flex items-start gap-4"
            >
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                <Icon className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-black text-white">{r.label}</h3>
                <p className="text-xs text-zinc-500 mt-0.5">{r.desc}</p>
              </div>
              <Button
                size="sm"
                variant="secondary"
                leadingIcon={Download}
                loading={downloading === r.id}
                onClick={() => handleDownload(r.id)}
              >
                CSV
              </Button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
