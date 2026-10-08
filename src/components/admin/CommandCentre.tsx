"use client";

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Decision-first admin home. Work queue + risk radar, not a link farm.
 */

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  BadgeCheck,
  Building2,
  Car,
  ChevronRight,
  FileText,
  Loader2,
  Printer,
  RefreshCw,
  Route as RouteIcon,
  Scale,
  Settings,
  Shield,
  ShieldCheck,
  UserCircle,
  Users,
  Calendar,
  MapPin,
  Receipt,
  Award,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { PageHeader, Badge, Button } from "@/components/ui";
import { RoleGuidance } from "@/components/common/RoleGuidance";
import { RoleWelcomeBanner } from "@/components/common/RoleWelcomeBanner";
import type {
  IntelligenceSnapshot,
  RiskSignal,
  Severity,
  WorkItem,
} from "@/lib/intelligence/types";

const NAV_LINKS = [
  { href: "/admin/staff", label: "Staff", desc: "Administrators & inspectors", icon: Users },
  { href: "/admin/drivers", label: "Drivers", desc: "Registry & assignment", icon: UserCircle },
  { href: "/admin/operators", label: "Operators", desc: "Owners & Master Cards", icon: Building2 },
  { href: "/admin/marshals", label: "Marshals", desc: "Rank dispatch staff", icon: BadgeCheck },
  { href: "/admin/vehicles", label: "Vehicles", desc: "Commercial registry", icon: Car },
  { href: "/admin/routes", label: "Routes", desc: "Corridors & fares", icon: RouteIcon },
  { href: "/admin/terminals", label: "Terminals", desc: "Regional terminals", icon: MapPin },
  { href: "/admin/queue", label: "30-Day Queue", desc: "Rotation cycle", icon: Calendar },
  { href: "/admin/yoy", label: "YoY", desc: "Year-over-year metrics", icon: Scale },
  { href: "/admin/ledger", label: "Ledger", desc: "Trips & settlement", icon: Receipt },
  { href: "/admin/permits", label: "Permits", desc: "Renewal requests", icon: Award },
  { href: "/admin/permits/print", label: "Print Queue", desc: "A4 + signed QR", icon: Printer },
  { href: "/admin/audits", label: "Audits", desc: "Security trail", icon: Shield },
  { href: "/admin/reports", label: "Reports", desc: "CSV compliance", icon: FileText },
  { href: "/admin/config", label: "Config", desc: "Rank fee & settings", icon: Settings },
];

function severityBadge(sev: Severity): "danger" | "warning" | "success" | "default" | "info" {
  switch (sev) {
    case "critical":
      return "danger";
    case "high":
      return "warning";
    case "medium":
      return "info";
    case "low":
      return "default";
    default:
      return "default";
  }
}

function severityDot(sev: Severity): string {
  switch (sev) {
    case "critical":
      return "bg-red-500";
    case "high":
      return "bg-amber-500";
    case "medium":
      return "bg-sky-500";
    case "low":
      return "bg-zinc-500";
    default:
      return "bg-zinc-600";
  }
}

function KpiChip({
  label,
  value,
  tone,
  href,
}: {
  label: string;
  value: number;
  tone: "critical" | "warn" | "ok" | "neutral";
  href?: string;
}) {
  const toneCls =
    tone === "critical"
      ? "border-red-500/30 text-red-300"
      : tone === "warn"
        ? "border-amber-500/30 text-amber-300"
        : tone === "ok"
          ? "border-emerald-500/30 text-emerald-300"
          : "border-white/[0.06] text-zinc-300";

  const inner = (
    <div
      className={`bg-[#0F0F10] border rounded-xl px-3 py-2.5 min-w-[7.5rem] ${toneCls} ${
        href ? "hover:border-emerald-500/40 transition-colors" : ""
      }`}
    >
      <div className="text-[10px] uppercase font-black tracking-widest opacity-70">{label}</div>
      <div className="text-xl font-black tabular-nums mt-0.5">{value}</div>
    </div>
  );
  return href ? <Link href={href}>{inner}</Link> : inner;
}

function WorkRow({ item }: { item: WorkItem }) {
  return (
    <Link
      href={item.href}
      className="group flex items-start gap-3 px-3 py-2.5 rounded-xl hover:bg-white/[0.04] border border-transparent hover:border-white/[0.06] transition-all"
    >
      <span className={`mt-1.5 w-2 h-2 rounded-full shrink-0 ${severityDot(item.severity)}`} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-semibold text-white truncate">{item.title}</span>
          <Badge variant={severityBadge(item.severity)} className="text-[9px] uppercase">
            {item.severity}
          </Badge>
        </div>
        <p className="text-[11px] text-zinc-500 mt-0.5 truncate">{item.detail}</p>
      </div>
      <ChevronRight className="w-4 h-4 text-zinc-600 group-hover:text-emerald-400 shrink-0 mt-1 transition-colors" />
    </Link>
  );
}

function RiskRow({ risk }: { risk: RiskSignal }) {
  const body = (
    <div className="flex items-center justify-between gap-3 px-3 py-2 rounded-xl hover:bg-white/[0.04] transition-colors">
      <div className="flex items-center gap-2 min-w-0">
        <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${severityDot(risk.severity)}`} />
        <div className="min-w-0">
          <div className="text-xs font-semibold text-white truncate">{risk.label}</div>
          <div className="text-[10px] text-zinc-500 truncate">{risk.detail}</div>
        </div>
      </div>
      <div className="text-sm font-black tabular-nums text-white shrink-0">{risk.value}</div>
    </div>
  );
  return risk.href ? <Link href={risk.href}>{body}</Link> : body;
}

export default function CommandCentre() {
  const { user } = useAuth();
  const isSuperAdmin = user?.role === "super-admin";
  const [snap, setSnap] = useState<IntelligenceSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (soft = false) => {
    if (soft) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/intelligence", { cache: "no-store" });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `HTTP ${res.status}`);
      }
      const data = (await res.json()) as IntelligenceSnapshot;
      setSnap(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load intelligence");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void load();
    const t = setInterval(() => void load(true), 60_000);
    return () => clearInterval(t);
  }, [load]);

  const k = snap?.kpis;

  return (
    <div className="space-y-6">
      <RoleWelcomeBanner
        title={`${user?.fullName ? user.fullName : "Administrator"}`}
        subtitle="Work queue, risk signals, and the next action for this rank cycle."
        actionLabel="Open queue"
        actionHref="/admin/queue"
      />

      <PageHeader
        title="Command Centre"
        description={
          snap?.briefing ??
          `Welcome back, ${user?.fullName ?? "Administrator"}. Loading operational data…`
        }
        actions={
          <Button
            variant="secondary"
            size="sm"
            onClick={() => void load(true)}
            disabled={refreshing || loading}
          >
            {refreshing ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <RefreshCw className="w-3.5 h-3.5" />
            )}
            <span className="ml-1.5">Refresh</span>
          </Button>
        }
      />

      {isSuperAdmin && (
        <Link
          href="/admin/super"
          className="group block bg-[#0F0F10] border border-white/[0.08] text-white rounded-2xl p-5 hover:border-zinc-500 transition-all"
        >
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-white/[0.06] flex items-center justify-center">
                <ShieldCheck className="w-6 h-6 text-zinc-300" />
              </div>
              <div>
                <div className="text-[10px] uppercase font-black tracking-widest text-zinc-500">
                  Elevated access
                </div>
                <h2 className="text-base font-black uppercase mt-0.5">
                  Super Admin Control Centre
                </h2>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Analytics, security, telemetry, recovery, and system config.
                </p>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-zinc-500 group-hover:translate-x-1 transition-transform" />
          </div>
        </Link>
      )}

      {snap?.primaryAction && (
        <Link
          href={snap.primaryAction.href}
          className="group flex items-center gap-4 bg-emerald-500/10 border border-emerald-500/25 rounded-2xl p-4 hover:border-emerald-400/50 transition-all"
        >
          <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
            <ArrowRight className="w-5 h-5" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-[10px] uppercase font-black tracking-widest text-emerald-400/80">
              Next action
            </div>
            <div className="text-sm font-black text-white mt-0.5">{snap.primaryAction.label}</div>
            <p className="text-[11px] text-zinc-400 mt-0.5">{snap.primaryAction.reason}</p>
          </div>
          <ArrowRight className="w-5 h-5 text-emerald-400 group-hover:translate-x-1 transition-transform shrink-0" />
        </Link>
      )}

      <RoleGuidance
        title="Operational priorities"
        items={[
          {
            label: "Review the queue",
            detail: "Open the live queue to triage urgent renewals, expired permits, and at-risk vehicles first.",
            href: "/admin/queue",
            icon: Calendar,
          },
          {
            label: "Inspect permits",
            detail: "Resolve expired, expiring, or print-backlogged permits before the next compliance cycle.",
            href: "/admin/permits",
            icon: Award,
          },
          {
            label: "Check vehicles",
            detail: "Review fleet health, COF status, and unassigned vehicles to close risk gaps quickly.",
            href: "/admin/vehicles",
            icon: Car,
          },
          {
            label: "Review staff and drivers",
            detail: "Check staffing coverage, roster changes, and any suspended driver or staff issues.",
            href: "/admin/drivers",
            icon: Users,
          },
        ]}
      />

      {k && (
        <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
          <KpiChip
            label="Expired permits"
            value={k.permitsExpired}
            tone={k.permitsExpired > 0 ? "critical" : "ok"}
            href="/admin/permits"
          />
          <KpiChip
            label="≤30d permits"
            value={k.permitsExpiring30d}
            tone={k.permitsExpiring30d > 0 ? "warn" : "ok"}
            href="/admin/permits"
          />
          <KpiChip
            label="Expired COF"
            value={k.cofExpired}
            tone={k.cofExpired > 0 ? "critical" : "ok"}
            href="/admin/vehicles"
          />
          <KpiChip
            label="Renewals"
            value={k.renewalsPending}
            tone={k.renewalsPending > 0 ? "warn" : "ok"}
            href="/admin/permits"
          />
          <KpiChip
            label="Print backlog"
            value={k.printQueueOpen}
            tone={k.printQueueOpen > 0 ? "warn" : "neutral"}
            href="/admin/permits/print"
          />
          <KpiChip
            label="No driver"
            value={k.vehiclesUnassigned}
            tone={k.vehiclesUnassigned > 5 ? "warn" : "neutral"}
            href="/admin/vehicles"
          />
          <KpiChip
            label="Suspended"
            value={k.driversSuspended}
            tone={k.driversSuspended > 0 ? "warn" : "neutral"}
            href="/admin/drivers"
          />
          <KpiChip label="Fleet" value={k.vehiclesTotal} tone="neutral" href="/admin/vehicles" />
        </div>
      )}

      {loading && !snap && (
        <div className="bg-[#0F0F10] border border-white/[0.06] rounded-2xl p-10 flex flex-col items-center gap-3 text-zinc-400">
          <Loader2 className="w-6 h-6 animate-spin text-emerald-400" />
          <p className="text-xs font-medium">Loading operational data…</p>
        </div>
      )}

      {error && !snap && (
        <div className="bg-[#0F0F10] border border-red-500/30 rounded-2xl p-6 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-red-400 shrink-0" />
          <div>
            <div className="text-sm font-semibold text-white">Could not load dashboard</div>
            <p className="text-xs text-zinc-400 mt-1">{error}</p>
            <Button variant="secondary" size="sm" className="mt-3" onClick={() => void load()}>
              Retry
            </Button>
          </div>
        </div>
      )}

      {snap && (
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
          <section className="lg:col-span-3 bg-[#0F0F10] border border-white/[0.06] rounded-2xl overflow-hidden">
            <div className="px-4 py-3 border-b border-white/[0.06] flex items-center justify-between">
              <div>
                <h2 className="text-xs font-black uppercase tracking-widest text-white">
                  Work queue
                </h2>
                <p className="text-[10px] text-zinc-500 mt-0.5">
                  Ranked by urgency · {snap.queue.length} open · {snap.scope}
                  {snap.region ? ` · ${snap.region}` : ""}
                </p>
              </div>
              {snap.generatedAt && (
                <span className="text-[10px] text-zinc-600 tabular-nums">
                  {new Date(snap.generatedAt).toLocaleTimeString()}
                </span>
              )}
            </div>
            <div className="p-2 max-h-[28rem] overflow-y-auto">
              {snap.queue.length === 0 ? (
                <div className="px-3 py-8 text-center">
                  <p className="text-sm font-semibold text-white">Queue clear</p>
                  <p className="text-[11px] text-zinc-500 mt-1">
                    No critical compliance or assignment items in the 30-day horizon.
                  </p>
                </div>
              ) : (
                snap.queue.map((item) => <WorkRow key={item.id} item={item} />)
              )}
            </div>
          </section>

          <section className="lg:col-span-2 bg-[#0F0F10] border border-white/[0.06] rounded-2xl overflow-hidden">
            <div className="px-4 py-3 border-b border-white/[0.06]">
              <h2 className="text-xs font-black uppercase tracking-widest text-white">
                Risk radar
              </h2>
              <p className="text-[10px] text-zinc-500 mt-0.5">Aggregate exposure signals</p>
            </div>
            <div className="p-2">
              {snap.risks.length === 0 ? (
                <div className="px-3 py-8 text-center text-[11px] text-zinc-500">
                  No elevated risk signals.
                </div>
              ) : (
                snap.risks.map((r) => <RiskRow key={r.id} risk={r} />)
              )}
            </div>
          </section>
        </div>
      )}

      <div>
        <h2 className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-2 px-0.5">
          Registry & tools
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
          {NAV_LINKS.map((link) => {
            const Icon = link.icon;
            return (
              <Link
                key={link.href}
                href={link.href}
                className="group bg-[#0F0F10] border border-white/[0.06] hover:border-emerald-500/40 rounded-xl p-3 transition-all"
              >
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                    <Icon className="w-3.5 h-3.5" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-[11px] font-black text-white uppercase tracking-tight truncate">
                      {link.label}
                    </div>
                    <div className="text-[10px] text-zinc-500 truncate">{link.desc}</div>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
