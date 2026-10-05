"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Plus,
  Search,
  Radio,
  RefreshCw,
  Eye,
  Pencil,
  UserX,
  ArrowUpDown,
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
  TableActions,
  PageHeader,
  EmptyState,
  TableSkeleton,
  useToast,
} from "@/components/ui";
import MarshalFormModal from "./MarshalFormModal";
import MarshalCardModal from "./MarshalCardModal";

type SortKey = "fullName" | "region" | "isActive" | "createdAt";
type SortDir = "asc" | "desc";

export default function MarshalsList() {
  const [marshals, setMarshals] = useState<MarshalRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<MarshalRow | null>(null);
  const [viewingCard, setViewingCard] = useState<MarshalRow | null>(null);
  const [sortKey, setSortKey] = useState<SortKey>("createdAt");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const toast = useToast();

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/marshals", { cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setMarshals(data.marshals ?? []);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir(key === "createdAt" ? "desc" : "asc");
    }
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const base = q
      ? marshals.filter(
          (m) =>
            m.fullName.toLowerCase().includes(q) ||
            (m.cellNo ?? "").toLowerCase().includes(q) ||
            (m.phone ?? "").toLowerCase().includes(q) ||
            (m.idNumber ?? "").toLowerCase().includes(q) ||
            m.region.toLowerCase().includes(q) ||
            (m.terminalName ?? "").toLowerCase().includes(q)
        )
      : marshals;

    const sorted = [...base].sort((a, b) => {
      const dir = sortDir === "asc" ? 1 : -1;
      switch (sortKey) {
        case "fullName":
          return a.fullName.localeCompare(b.fullName) * dir;
        case "region":
          return a.region.localeCompare(b.region) * dir;
        case "isActive":
          return (Number(a.isActive) - Number(b.isActive)) * dir;
        case "createdAt":
          return (
            (new Date(a.createdAt).getTime() -
              new Date(b.createdAt).getTime()) *
            dir
          );
      }
    });
    return sorted;
  }, [marshals, search, sortKey, sortDir]);

  const handleDeactivate = (m: MarshalRow) => {
    // TODO: wire to DELETE /api/admin/marshals/[id] when route exists.
    // For now, confirm and toast — do not mutate.
    const ok = window.confirm(
      `Deactivate ${m.fullName}? They will no longer be able to sign in.`
    );
    if (!ok) return;
    toast.error("Deactivate endpoint not wired yet");
  };

  return (
    <div>
      <PageHeader
        title="Rank Marshals"
        description="Register and manage rank marshals across all terminals."
        actions={
          <Button
            onClick={() => {
              setEditing(null);
              setShowForm(true);
            }}
            leadingIcon={Plus}
          >
            Add Marshal
          </Button>
        }
      />

      <div className="bg-[#0F0F10] border border-white/[0.06] rounded-2xl p-3 mb-4">
        <div className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-center">
          <div className="flex-1 min-w-0">
            <Input
              leadingIcon={Search}
              placeholder="Search by name, phone, ID, region, terminal…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="hidden sm:inline text-[10px] font-mono uppercase tracking-wider text-zinc-500">
              {filtered.length} of {marshals.length}
            </span>
            <IconButton
              icon={RefreshCw}
              label="Refresh"
              onClick={refresh}
              disabled={loading}
              className={loading ? "[&_svg]:animate-spin" : ""}
            />
          </div>
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
          title={search ? "No matches" : "No marshals yet"}
          description={
            search ? "Try a different search." : "Add the first rank marshal."
          }
          action={
            !search ? (
              <Button
                onClick={() => {
                  setEditing(null);
                  setShowForm(true);
                }}
                leadingIcon={Plus}
                size="sm"
              >
                Add Marshal
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div className="bg-[#0F0F10] border border-white/[0.06] rounded-2xl overflow-hidden">
          <Table stickyHeader maxHeight="70vh">
            <TableHead sticky>
              <Tr>
                <Th
                  sortable
                  sortDir={sortKey === "fullName" ? sortDir : null}
                  onSort={() => toggleSort("fullName")}
                >
                  Marshal
                </Th>
                <Th>Contact</Th>
                <Th
                  sortable
                  sortDir={sortKey === "region" ? sortDir : null}
                  onSort={() => toggleSort("region")}
                >
                  Region / Terminal
                </Th>
                <Th>Badge</Th>
                <Th
                  align="center"
                  sortable
                  sortDir={sortKey === "isActive" ? sortDir : null}
                  onSort={() => toggleSort("isActive")}
                >
                  Status
                </Th>
                <Th align="right" width="80px">
                  Actions
                </Th>
              </Tr>
            </TableHead>
            <TableBody>
              {filtered.map((m) => (
                <Tr
                  key={m.id}
                  onClick={() => setViewingCard(m)}
                >
                  <Td>
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 text-[10px] font-black shrink-0">
                        {m.firstName?.[0]?.toUpperCase() ?? "?"}
                        {m.surname?.[0]?.toUpperCase() ?? ""}
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-white truncate">
                          {m.fullName}
                        </div>
                        {m.staffNumber && (
                          <div className="font-mono text-[10px] text-zinc-500">
                            #{m.staffNumber}
                          </div>
                        )}
                      </div>
                    </div>
                  </Td>
                  <Td numeric>
                    <div className="text-[11px] text-zinc-300">
                      {m.cellNo ?? m.phone ?? "—"}
                    </div>
                    {m.idNumber && (
                      <div className="text-[10px] text-zinc-500">
                        ID {m.idNumber}
                      </div>
                    )}
                  </Td>
                  <Td>
                    <div className="text-xs text-zinc-200 truncate max-w-[180px]">
                      {m.region}
                    </div>
                    <div className="text-[10px] text-zinc-500 truncate max-w-[180px]">
                      {m.terminalName}
                    </div>
                  </Td>
                  <Td numeric>
                    <span className="text-[11px] text-zinc-400">
                      {m.badgeNumber ?? "—"}
                    </span>
                  </Td>
                  <Td align="center">
                    <Badge
                      variant={m.isActive ? "success" : "default"}
                      size="sm"
                      dot
                    >
                      {m.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </Td>
                  <Td align="right">
                    <TableActions
                      actions={[
                        {
                          label: "View card",
                          icon: Eye,
                          onSelect: () => setViewingCard(m),
                        },
                        {
                          label: "Edit marshal",
                          icon: Pencil,
                          onSelect: () => {
                            setEditing(m);
                            setShowForm(true);
                          },
                        },
                        {
                          label: "Deactivate",
                          icon: UserX,
                          tone: "danger",
                          onSelect: () => handleDeactivate(m),
                        },
                      ]}
                    />
                  </Td>
                </Tr>
              ))}
            </TableBody>
          </Table>

          <div className="flex items-center justify-between px-4 py-3 border-t border-white/[0.06] text-[10px] font-mono uppercase tracking-wider text-zinc-500">
            <span>
              Sorted by {sortKey} ({sortDir})
            </span>
            <span className="inline-flex items-center gap-1">
              <ArrowUpDown className="w-3 h-3" />
              Click headers to sort
            </span>
          </div>
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
            toast.success(editing ? "Marshal updated" : "Marshal created");
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
    </div>
  );
}
