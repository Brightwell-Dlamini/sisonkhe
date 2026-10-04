"use client";

import { useCallback, useEffect, useState } from "react";
import { Save, Building2 } from "lucide-react";
import type { RegionConfigRow } from "@/lib/admin/terminals";
import {
  Button,
  Input,
  Textarea,
  PageHeader,
  TableSkeleton,
  EmptyState,
  useToast,
} from "@/components/ui";

export default function TerminalsConfig() {
  const [terminals, setTerminals] = useState<RegionConfigRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const toast = useToast();

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/terminals", { cache: "no-store" });
      const data = await res.json();
      setTerminals(data.terminals ?? []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const update = (region: string, patch: Partial<RegionConfigRow>) => {
    setTerminals((prev) =>
      prev.map((t) => (t.region === region ? { ...t, ...patch } : t))
    );
  };

  const save = async (region: string) => {
    const t = terminals.find((x) => x.region === region);
    if (!t) return;
    setSaving(region);
    try {
      await fetch(`/api/admin/terminals/${encodeURIComponent(region)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          terminalName: t.terminalName,
          emergencyNumber: t.emergencyNumber,
          announcement: t.announcement,
        }),
      });
      toast.success("Terminal saved", region);
    } catch {
      toast.error("Save failed", region);
    } finally {
      setSaving(null);
    }
  };

  return (
    <div>
      <PageHeader
        title="Regional Terminals"
        description="Configure terminal names, emergency numbers, and announcements."
      />

      {loading ? (
        <TableSkeleton rows={4} />
      ) : terminals.length === 0 ? (
        <EmptyState
          icon={Building2}
          title="No terminals configured"
          description="Regional terminal configs will appear here once seeded."
        />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {terminals.map((t) => (
            <div
              key={t.region}
              className="bg-[#0F0F10] border border-white/[0.06] rounded-2xl p-5 space-y-3"
            >
              <div className="flex items-center gap-2 pb-3 border-b border-white/[0.06]">
                <Building2 className="w-4 h-4 text-amber-400" />
                <h3 className="text-sm font-black uppercase text-white">
                  {t.region} Region
                </h3>
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase text-zinc-500 mb-1">
                  Terminal Name
                </label>
                <Input
                  value={t.terminalName}
                  onChange={(e) => update(t.region, { terminalName: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase text-zinc-500 mb-1">
                  Emergency Number
                </label>
                <Input
                  value={t.emergencyNumber ?? ""}
                  onChange={(e) => update(t.region, { emergencyNumber: e.target.value })}
                  className="font-mono"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase text-zinc-500 mb-1">
                  Announcement
                </label>
                <Textarea
                  rows={2}
                  value={t.announcement ?? ""}
                  onChange={(e) => update(t.region, { announcement: e.target.value })}
                />
              </div>

              <div className="flex justify-end">
                <Button
                  size="sm"
                  onClick={() => save(t.region)}
                  loading={saving === t.region}
                  leadingIcon={Save}
                >
                  Save
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
