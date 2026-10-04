"use client";

import { useEffect, useState, useMemo } from "react";
import { Search, RefreshCw, Shield } from "lucide-react";
import type { AuditEntry } from "@/lib/admin/audits";
import {
  Input,
  Select,
  IconButton,
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
} from "@/components/ui";

const SOURCE_VARIANT: Record<string, "purple" | "info" | "default"> = {
  permit: "purple",
  sync: "info",
};

export default function AuditTrailView() {
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [sourceFilter, setSourceFilter] = useState<"all" | "permit" | "sync">("all");

  const refresh = () => {
    setLoading(true);
    void fetch("/api/admin/audits")
      .then((r) => r.json())
      .then((data) => setEntries(data.entries ?? []))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    refresh();
  }, []);

  const filtered = useMemo(() => {
    return entries.filter((e) => {
      if (sourceFilter !== "all" && e.source !== sourceFilter) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        return (
          e.action.toLowerCase().includes(q) ||
          e.details.toLowerCase().includes(q) ||
          (e.entityId ?? "").toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [entries, search, sourceFilter]);

  return (
    <div>
      <PageHeader
        title="Security Audit Trail"
        description="Immutable log of permit actions, sync events, and system changes."
      />

      <div className="bg-[#0F0F10] border border-white/[0.06] rounded-2xl p-3 mb-4">
        <div className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-center">
          <div className="flex-1 min-w-0">
            <Input
              leadingIcon={Search}
              placeholder="Search audit log…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Select
              value={sourceFilter}
              onChange={(e) => setSourceFilter(e.target.value as typeof sourceFilter)}
              className="w-32"
            >
              <option value="all">All Sources</option>
              <option value="permit">Permit</option>
              <option value="sync">Sync</option>
            </Select>
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

      {loading && entries.length === 0 ? (
        <TableSkeleton rows={8} />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={Shield}
          title={entries.length === 0 ? "No audit entries" : "No matching entries"}
          description={
            entries.length === 0
              ? "Audit events will appear here as actions are recorded."
              : "Try adjusting your search or source filter."
          }
        />
      ) : (
        <div className="bg-[#0F0F10] border border-white/[0.06] rounded-2xl overflow-hidden">
          <Table>
            <TableHead>
              <Th>Timestamp</Th>
              <Th>Source</Th>
              <Th>Action</Th>
              <Th>Details</Th>
              <Th>Entity</Th>
            </TableHead>
            <TableBody>
              {filtered.map((e) => (
                <Tr key={e.id}>
                  <Td>
                    <span className="font-mono text-[10px] text-zinc-500 whitespace-nowrap">
                      {new Date(e.timestamp).toLocaleString("en-GB", {
                        day: "2-digit",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </Td>
                  <Td>
                    <Badge variant={SOURCE_VARIANT[e.source] ?? "default"} size="sm">
                      {e.source}
                    </Badge>
                  </Td>
                  <Td>
                    <span className="font-bold text-white text-xs">{e.action}</span>
                  </Td>
                  <Td>
                    <span className="text-zinc-400 text-xs max-w-md truncate block">
                      {e.details}
                    </span>
                  </Td>
                  <Td>
                    <span className="font-mono text-[10px] text-zinc-500 truncate">
                      {e.entityId ?? "—"}
                    </span>
                  </Td>
                </Tr>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
