/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Admin "Send Access" queue — approve portal enrolments without hunting lists.
 */

"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Loader2,
  KeyRound,
  RefreshCw,
  UserCircle,
  BadgeCheck,
  AlertCircle,
} from "lucide-react";
import ClaimLinkDialog from "@/components/common/ClaimLinkDialog";
import {
  PageHeader,
  EmptyState,
  IconButton,
  Badge,
  useToast,
} from "@/components/ui";

type PendingItem = {
  kind: "driver" | "marshal";
  id: string;
  fullName: string;
  phone: string | null;
  nationalId: string | null;
  status: string | null;
  createdAt: string | null;
};

export default function PendingAccessQueue() {
  const [items, setItems] = useState<PendingItem[]>([]);
  const [counts, setCounts] = useState({ drivers: 0, marshals: 0, total: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sendingId, setSendingId] = useState<string | null>(null);
  const [invite, setInvite] = useState<{
    fullName: string;
    username: string;
    claimUrl?: string | null;
    password?: string | null;
    expiresAt?: string | null;
    roleLabel: string;
  } | null>(null);
  const toast = useToast();

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/pending-access", { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`);
      const body = data.data ?? data;
      setItems(body.items ?? []);
      setCounts(body.counts ?? { drivers: 0, marshals: 0, total: 0 });
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load");
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  async function sendAccess(item: PendingItem) {
    setSendingId(item.id);
    try {
      const path =
        item.kind === "driver"
          ? `/api/admin/drivers/${item.id}/issue-login`
          : `/api/admin/marshals/${item.id}/issue-login`;
      const res = await fetch(path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Could not send access");
        return;
      }
      const creds = data.credentials ?? data.data?.credentials ?? {};
      setInvite({
        fullName: item.fullName,
        username: creds.username,
        claimUrl: creds.claimUrl ?? null,
        password: creds.password ?? null,
        expiresAt: creds.expiresAt ?? null,
        roleLabel: item.kind,
      });
      void refresh();
    } catch {
      toast.error("Network error");
    } finally {
      setSendingId(null);
    }
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="Send Access"
        description="People who enrolled at the portal but do not have a login yet. Approve once — they set their own password via the invite link."
      />

      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="default" size="sm">
          {counts.total} pending
        </Badge>
        <span className="text-[11px] text-zinc-500">
          {counts.drivers} drivers · {counts.marshals} marshals
        </span>
        <div className="ml-auto">
          <IconButton
            icon={RefreshCw}
            label="Refresh"
            onClick={() => void refresh()}
            disabled={loading}
            className={loading ? "[&_svg]:animate-spin" : ""}
          />
        </div>
      </div>

      {error && (
        <div className="bg-rose-500/10 border border-rose-500/25 text-rose-400 rounded-xl p-3 text-xs flex gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {error}
        </div>
      )}

      {loading && items.length === 0 ? (
        <div className="flex justify-center py-16">
          <Loader2 className="w-6 h-6 animate-spin text-emerald-500" />
        </div>
      ) : items.length === 0 ? (
        <EmptyState
          icon={KeyRound}
          title="No pending access"
          description="When drivers or marshals enrol via the field portal, they appear here for one-tap Send Access."
        />
      ) : (
        <ul className="space-y-2">
          {items.map((item) => (
            <li
              key={`${item.kind}-${item.id}`}
              className="bg-[#0F0F10] border border-white/[0.06] rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center gap-3"
            >
              <div className="flex items-start gap-3 min-w-0 flex-1">
                <div className="w-9 h-9 rounded-xl bg-white/[0.04] flex items-center justify-center shrink-0">
                  {item.kind === "driver" ? (
                    <UserCircle className="w-4 h-4 text-emerald-400" />
                  ) : (
                    <BadgeCheck className="w-4 h-4 text-sky-400" />
                  )}
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-bold text-white truncate">
                    {item.fullName}
                  </div>
                  <div className="text-[11px] text-zinc-500 flex flex-wrap gap-x-2 gap-y-0.5">
                    <span className="uppercase font-bold tracking-wider text-zinc-400">
                      {item.kind}
                    </span>
                    {item.phone && (
                      <span className="font-mono">{item.phone}</span>
                    )}
                    {item.nationalId && (
                      <span className="font-mono">ID {item.nationalId}</span>
                    )}
                    {item.createdAt && (
                      <span>
                        Enrolled {new Date(item.createdAt).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <button
                type="button"
                disabled={sendingId === item.id}
                onClick={() => void sendAccess(item)}
                className="shrink-0 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-black uppercase tracking-wider flex items-center justify-center gap-1.5"
              >
                {sendingId === item.id ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Sending…
                  </>
                ) : (
                  <>
                    <KeyRound className="w-3.5 h-3.5" />
                    Send access
                  </>
                )}
              </button>
            </li>
          ))}
        </ul>
      )}

      {invite && (
        <ClaimLinkDialog
          fullName={invite.fullName}
          username={invite.username}
          claimUrl={invite.claimUrl}
          password={invite.password}
          expiresAt={invite.expiresAt}
          roleLabel={invite.roleLabel}
          onClose={() => setInvite(null)}
        />
      )}
    </div>
  );
}
