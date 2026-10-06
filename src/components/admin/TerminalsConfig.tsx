"use client";

import { useCallback, useEffect, useState } from "react";
import { Save, Building2, Plus, Loader2 } from "lucide-react";
import type { RegionConfigRow, TerminalRow } from "@/lib/admin/terminals";
import {
  Button,
  Input,
  Textarea,
  PageHeader,
  TableSkeleton,
  EmptyState,
  useToast,
} from "@/components/ui";

const REGIONS = ["Hhohho", "Manzini", "Lubombo", "Shiselweni"];

export default function TerminalsConfig() {
  const [regionConfigs, setRegionConfigs] = useState<RegionConfigRow[]>([]);
  const [terminals, setTerminals] = useState<TerminalRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState("");
  const [newRegion, setNewRegion] = useState(REGIONS[0]);
  const [newEmergency, setNewEmergency] = useState("");
  const [adding, setAdding] = useState(false);
  const toast = useToast();

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/terminals", { cache: "no-store" });
      const data = await res.json();
      setRegionConfigs(data.terminals ?? []);
      setTerminals(data.terminalRecords ?? []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const update = (region: string, patch: Partial<RegionConfigRow>) => {
    setRegionConfigs((prev) =>
      prev.map((t) => (t.region === region ? { ...t, ...patch } : t))
    );
  };

  const save = async (region: string) => {
    const t = regionConfigs.find((x) => x.region === region);
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
      toast.success("Region default saved", region);
    } catch {
      toast.error("Save failed", region);
    } finally {
      setSaving(null);
    }
  };

  const addTerminal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    setAdding(true);
    try {
      const res = await fetch("/api/admin/terminals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newName.trim(),
          region: newRegion,
          emergencyNumber: newEmergency || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Could not add terminal");
        return;
      }
      toast.success("Terminal added", newName);
      setShowAdd(false);
      setNewName("");
      setNewEmergency("");
      void refresh();
    } catch {
      toast.error("Network error");
    } finally {
      setAdding(false);
    }
  };

  return (
    <div className="space-y-8">
      <PageHeader
        title="Terminals"
        description="Add bus termini across the country. Marshals pick these when assigned to a rank post."
        actions={
          <Button onClick={() => setShowAdd(true)} leadingIcon={Plus}>
            Add terminal
          </Button>
        }
      />

      {showAdd && (
        <form
          onSubmit={addTerminal}
          className="bg-[#0F0F10] border border-emerald-500/30 rounded-2xl p-5 space-y-3 max-w-lg"
        >
          <h3 className="text-sm font-black uppercase text-white">New terminal</h3>
          <div>
            <label className="block text-[11px] font-bold uppercase text-zinc-500 mb-1">
              Name *
            </label>
            <Input
              required
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="e.g. Nhlangano Rank"
            />
          </div>
          <div>
            <label className="block text-[11px] font-bold uppercase text-zinc-500 mb-1">
              Region *
            </label>
            <select
              value={newRegion}
              onChange={(e) => setNewRegion(e.target.value)}
              className="w-full bg-white/[0.03] border border-white/[0.06] rounded-xl px-3 py-2 text-sm text-white"
            >
              {REGIONS.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-[11px] font-bold uppercase text-zinc-500 mb-1">
              Emergency number
            </label>
            <Input
              value={newEmergency}
              onChange={(e) => setNewEmergency(e.target.value)}
              className="font-mono"
            />
          </div>
          <div className="flex gap-2">
            <Button type="button" variant="ghost" onClick={() => setShowAdd(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={adding} leadingIcon={Plus}>
              Create
            </Button>
          </div>
        </form>
      )}

      {loading ? (
        <TableSkeleton rows={4} />
      ) : (
        <>
          <section className="space-y-3">
            <h2 className="text-xs font-black uppercase tracking-wider text-zinc-400">
              All terminals ({terminals.length})
            </h2>
            {terminals.length === 0 ? (
              <EmptyState
                icon={Building2}
                title="No extra terminals yet"
                description="Run migration 20261006_terminals.sql, then add termini here. Region defaults below still work."
              />
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {terminals.map((t) => (
                  <div
                    key={t.id}
                    className="bg-[#0F0F10] border border-white/[0.06] rounded-2xl p-4"
                  >
                    <div className="text-sm font-bold text-white">{t.name}</div>
                    <div className="text-[11px] text-zinc-500 mt-0.5">
                      {t.region}
                      {t.emergencyNumber ? ` · ${t.emergencyNumber}` : ""}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="space-y-3">
            <h2 className="text-xs font-black uppercase tracking-wider text-zinc-400">
              Region defaults (seeded)
            </h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {regionConfigs.map((t) => (
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
                      Default terminal name
                    </label>
                    <Input
                      value={t.terminalName}
                      onChange={(e) =>
                        update(t.region, { terminalName: e.target.value })
                      }
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold uppercase text-zinc-500 mb-1">
                      Emergency Number
                    </label>
                    <Input
                      value={t.emergencyNumber ?? ""}
                      onChange={(e) =>
                        update(t.region, { emergencyNumber: e.target.value })
                      }
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
                      onChange={(e) =>
                        update(t.region, { announcement: e.target.value })
                      }
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
          </section>
        </>
      )}
    </div>
  );
}
