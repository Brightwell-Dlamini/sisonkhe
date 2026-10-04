/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Domain intelligence types — the vocabulary the system uses to *think*.
 */

export type Severity = "critical" | "high" | "medium" | "low" | "info";

export type WorkItemKind =
  | "permit_expired"
  | "permit_expiring"
  | "cof_expired"
  | "cof_expiring"
  | "pdp_expired"
  | "pdp_expiring"
  | "renewal_pending"
  | "print_backlog"
  | "unassigned_driver"
  | "unassigned_vehicle"
  | "suspended_driver"
  | "frozen_master_card"
  | "incomplete_registration"
  | "compliance_gap";

export type EntityType =
  | "vehicle"
  | "driver"
  | "operator"
  | "renewal"
  | "print"
  | "system";

export interface WorkItem {
  id: string;
  kind: WorkItemKind;
  severity: Severity;
  /** Higher = more urgent. Used for ranking. */
  score: number;
  title: string;
  detail: string;
  entityType: EntityType;
  entityId: string;
  entityLabel: string;
  /** Deep link into the admin UI */
  href: string;
  /** ISO date if time-bound */
  dueAt?: string | null;
  daysUntil?: number | null;
  meta?: Record<string, string | number | boolean | null>;
}

export interface RiskSignal {
  id: string;
  label: string;
  severity: Severity;
  value: number;
  unit?: string;
  detail: string;
  href?: string;
}

export interface ConsequenceEffect {
  effect: string;
  reversible: boolean;
  severity: Severity;
}

export interface ConsequencePreview {
  action: string;
  subjectLabel: string;
  effects: ConsequenceEffect[];
  blockers: string[];
  recommended: boolean;
  summary: string;
}

export interface IntelligenceKpis {
  vehiclesTotal: number;
  driversTotal: number;
  operatorsTotal: number;
  permitsExpired: number;
  permitsExpiring30d: number;
  cofExpired: number;
  cofExpiring30d: number;
  renewalsPending: number;
  printQueueOpen: number;
  driversUnassigned: number;
  vehiclesUnassigned: number;
  driversSuspended: number;
  masterCardsFrozen: number;
}

export interface IntelligenceSnapshot {
  generatedAt: string;
  scope: "national" | "region";
  region?: string | null;
  kpis: IntelligenceKpis;
  /** Ranked work queue — what the human should do next */
  queue: WorkItem[];
  /** Aggregate risk radar */
  risks: RiskSignal[];
  /** One-line briefing for the role */
  briefing: string;
  /** Suggested primary action */
  primaryAction: { label: string; href: string; reason: string } | null;
}
