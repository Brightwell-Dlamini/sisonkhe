"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Plus,
  Search,
  Radio,
  Edit2,
  Eye,
  RefreshCw,
  KeyRound,
  Loader2,
} from "lucide-react";
import type { MarshalRow } from "@/lib/admin/marshals";
import {
  Button,
  IconButton,
  Input,
  Badge,
  Table,
  TableHead,
  TableBody,
  Th,
  Tr,
  Td,
  PageHeader,
  EmptyState,
  TableSkeleton,
  useToast,
} from "@/components/ui";
import MarshalFormModal from "./MarshalFormModal";
import MarshalCardModal from "./MarshalCardModal";

export default function MarshalsList() {
  const [marshals, setMarshals] = useState<MarshalRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<MarshalRow | null>(null);
  const [viewingCard, setViewingCard] = useState<MarshalRow | null>(null);
  const [issuingId, setIssuingId] = useState<string | null>(null);
  const [issuedCreds, setIssuedCreds] = useState<{
    name: string;
    username: string;
    password: string;
  } | null>(null);
  const toast = useToast();

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/marshals", { cache: "no-store" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(
          (data as { error?: string }).error ?? `HTTP ${res.status}`
        );
      }
      setMarshals((data as { marshals?: MarshalRow[] }).marshals ?? []);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
      setMarshals([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const filtered = useMemo(() => {
    if (!search.trim()) return marshals;
    const q = search.toLowerCase();
    return marshals.filter(
      (m) =>
        m.fullName.toLowerCase().includes(q) ||
        (m.phone ?? "").toLowerCase().includes(q) ||
        (m.cellNo ?? "").toLowerCase().includes(q) ||
        (m.idNumber ?? "").toLowerCase().includes(q) ||
        (m.region ?? "").toLowerCase().includes(q) ||
        (m.terminalName ?? "").toLowerCase().includes(q) ||
        (m.badgeNumber ?? "").toLowerCase().includes(q)
    );
  }, [marshals, search]);

  async function issueLogin(m: MarshalRow) {
    if (m.authUserId) {
      toast.error("This marshal already has a login.");
      return;
    }
    setIssuingId(m.id);
    try {
      const res = await fetch(`/api/admin/marshals/${m.id}/issue-login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Could not issue login");
        return;
      }
      setIssuedCreds({
        name: m.fullName,
        username: data.credentials.username,
        password: data.credentials.password,
      });
      void refresh();
    } catch {
      toast.error("Network error");
    } finally {
      setIssuingId(null);
    }
  }

  return (
    <div>
      <PageHeader
        title="Rank Marshals"
        description="Field portal collects identity. Admin issues login and edits region/route/status."
        actions={
          <Button
            onClick={() => {
              setEditing(null);
              setShowForm(true);
            }}
            leadingIcon={Plus}
          >
            Add identity
          </Button>
        }
      />

      <div className="bg-[#0F0F10] border border-white/[0.06] rounded-2xl p-3 mb-4">
        <div className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-center">
          <div className="flex-1 min-w-0">
            <Input
              leadingIcon={Search}
              placeholder="Search by name, phone, ID, region…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <IconButton
            icon={RefreshCw}
            label="Refresh"
            onClick={refresh}
            disabled={loading}
            className={loading ? "[&_svg]:animate-spin" : ""}
          />
        </div>
      </div>

      {error && (
        <div className="mb-4 bg-rose-500/10 border border-rose-500/25 text-rose-400 rounded-xl p-3 text-xs font-medium">
          {error}
        </div>
      )}

      {loading && marshals.length === 0 ? (
        <TableSkeleton rows={6} />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={Radio}
          title={error ? "Could not load marshals" : search ? "No matches" : "No marshals yet"}
          description={
            error
              ? "Check the error above or try Refresh."
              : search
                ? "Try a different search."
                : "Field officers enrol via the marshal portal, or add identity here."
          }
          action={
            !search && !error ? (
              <Button
                onClick={() => {
                  setEditing(null);
                  setShowForm(true);
                }}
                leadingIcon={Plus}
                size="sm"
              >
                Add identity
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div className="bg-[#0F0F10] border border-white/[0.06] rounded-2xl overflow-hidden">
          <Table>
            <TableHead>
              <Tr>
                <Th>Marshal</Th>
                <Th>Contact</Th>
                <Th>Region / Terminal</Th>
                <Th>Login</Th>
                <Th>Status</Th>
                <Th className="text-right">Actions</Th>
              </Tr>
            </TableHead>
            <TableBody>
              {filtered.map((m) => (
                <Tr key={m.id}>
                  <Td>
                    <div className="text-xs font-bold text-white">{m.fullName}</div>
                    {m.staffNumber && (
                      <div className="font-mono text-[10px] text-zinc-500">
                        #{m.staffNumber}
                      </div>
                    )}
                  </Td>
                  <Td>
                    <div className="font-mono text-[11px] text-zinc-300">
                      {m.cellNo ?? m.phone ?? "—"}
                    </div>
                    {m.idNumber && (
                      <div className="font-mono text-[10px] text-zinc-500">
                        ID {m.idNumber}
                      </div>
                    )}
                  </Td>
                  <Td>
                    <div className="text-xs text-zinc-200">{m.region}</div>
                    <div className="text-[10px] text-zinc-500 truncate max-w-[140px]">
                      {m.terminalName}
                    </div>
                  </Td>
                  <Td>
                    <Badge
                      variant={m.authUserId ? "success" : "default"}
                      size="sm"
                    >
                      {m.authUserId ? "Issued" : "None"}
                    </Badge>
                  </Td>
                  <Td>
                    <Badge
                      variant={m.isActive ? "success" : "default"}
                      size="sm"
                      dot
                    >
                      {m.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </Td>
                  <Td>
                    <div className="flex items-center justify-end gap-1">
                      {!m.authUserId && (
                        <IconButton
                          icon={issuingId === m.id ? Loader2 : KeyRound}
                          label="Issue login"
                          onClick={() => void issueLogin(m)}
                          disabled={issuingId === m.id}
                          className={
                            issuingId === m.id ? "[&_svg]:animate-spin" : ""
                          }
                        />
                      )}
                      <IconButton
                        icon={Eye}
                        label="View card"
                        onClick={() => setViewingCard(m)}
                      />
                      <IconButton
                        icon={Edit2}
                        label="Edit marshal"
                        onClick={() => {
                          setEditing(m);
                          setShowForm(true);
                        }}
                      />
                    </div>
                  </Td>
                </Tr>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {showForm && (
        <MarshalFormModal
          mode={editing ? "edit" : "create"}
          marshal={editing ?? undefined}
          onClose={() => {
            setShowForm(false);
            setEditing(null);
          }}
          onSaved={() => {
            setShowForm(false);
            setEditing(null);
            toast.success(
              editing
                ? "Marshal updated"
                : "Identity saved — issue login when ready"
            );
            void refresh();
          }}
        />
      )}

      {viewingCard && (
        <MarshalCardModal
          marshal={viewingCard}
          onClose={() => setViewingCard(null)}
        />
      )}

      {issuedCreds && (
        <div className="fixed inset-0 z-[60] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0F0F10] border border-emerald-500/30 rounded-2xl max-w-md w-full p-6 space-y-4">
            <h3 className="text-sm font-black uppercase text-emerald-400">
              Login issued
            </h3>
            <p className="text-xs text-zinc-300">{issuedCreds.name}</p>
            <div className="rounded-xl bg-white/[0.03] border border-white/[0.06] p-4 space-y-2 font-mono text-sm">
              <div>
                <span className="text-[10px] text-zinc-500 uppercase">Username</span>
                <p className="text-white font-bold">{issuedCreds.username}</p>
              </div>
              <div>
                <span className="text-[10px] text-zinc-500 uppercase">Temp password</span>
                <p className="text-amber-300 font-bold">{issuedCreds.password}</p>
              </div>
            </div>
            <p className="text-[11px] text-zinc-500">
              Share once. They must change password on first sign-in.
            </p>
            <Button onClick={() => setIssuedCreds(null)} className="w-full">
              Done
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
