"use client";

import { useEffect, useState } from "react";
import { Save } from "lucide-react";
import {
  Button,
  Input,
  PageHeader,
  TableSkeleton,
  useToast,
} from "@/components/ui";

export default function RankFeeConfig() {
  const [rankFee, setRankFee] = useState(25);
  const [operational, setOperational] = useState(20);
  const [nrtc, setNrtc] = useState(3.5);
  const [maintenance, setMaintenance] = useState(1.5);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const toast = useToast();

  useEffect(() => {
    void fetch("/api/admin/config/rank-fee")
      .then((r) => r.json())
      .then((data) => {
        setRankFee(data.rankFee ?? 25);
        setOperational(data.splitOperational ?? 20);
        setNrtc(data.splitNRTC ?? 3.5);
        setMaintenance(data.splitMaintenance ?? 1.5);
      })
      .finally(() => setLoading(false));
  }, []);

  const total = operational + nrtc + maintenance;
  const matches = Math.abs(total - rankFee) < 0.01;

  const handleSave = async () => {
    setSaving(true);
    try {
      await fetch("/api/admin/config/rank-fee", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rankFee,
          splitOperational: operational,
          splitNRTC: nrtc,
          splitMaintenance: maintenance,
        }),
      });
      toast.success("Configuration saved");
    } catch {
      toast.error("Save failed");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div>
        <PageHeader
          title="System Configuration"
          description="National rank fee and allocation split."
        />
        <TableSkeleton rows={4} />
      </div>
    );
  }

  return (
    <div className="max-w-2xl">
      <PageHeader
        title="System Configuration"
        description="National rank fee and allocation split."
      />

      <div className="bg-[#0F0F10] border border-white/[0.06] rounded-2xl p-5 space-y-4">
        <div>
          <label className="block text-[11px] font-bold uppercase text-zinc-500 mb-1.5">
            National Rank Fee (SZL)
          </label>
          <Input
            type="number"
            step="0.01"
            value={rankFee}
            onChange={(e) => setRankFee(Number(e.target.value))}
            className="font-mono font-bold"
          />
        </div>

        <div className="pt-3 border-t border-white/[0.06] space-y-3">
          <span className="text-[11px] font-black uppercase tracking-wider text-zinc-400">
            Allocation Split
          </span>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-[10px] font-bold uppercase text-zinc-500 mb-1">
                Operational
              </label>
              <Input
                type="number"
                step="0.01"
                value={operational}
                onChange={(e) => setOperational(Number(e.target.value))}
                className="font-mono"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase text-zinc-500 mb-1">
                NRTC
              </label>
              <Input
                type="number"
                step="0.01"
                value={nrtc}
                onChange={(e) => setNrtc(Number(e.target.value))}
                className="font-mono"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase text-zinc-500 mb-1">
                Maintenance
              </label>
              <Input
                type="number"
                step="0.01"
                value={maintenance}
                onChange={(e) => setMaintenance(Number(e.target.value))}
                className="font-mono"
              />
            </div>
          </div>

          <div
            className={`p-3 rounded-xl text-xs border ${
              matches
                ? "bg-emerald-500/10 border-emerald-500/25 text-emerald-400"
                : "bg-amber-500/10 border-amber-500/25 text-amber-400"
            }`}
          >
            Split total: <strong className="font-mono">E {total.toFixed(2)}</strong>
            {!matches && <> — does not match rank fee (E {rankFee.toFixed(2)})</>}
            {matches && " ✓ reconciles"}
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <Button onClick={handleSave} loading={saving} leadingIcon={Save}>
            Save Configuration
          </Button>
        </div>
      </div>
    </div>
  );
}
