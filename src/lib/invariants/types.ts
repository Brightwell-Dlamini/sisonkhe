/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Invariant observation types + human labels.
 * Phase 5 — money stale/credit, compliance PDP, ops safety, authority.
 */

export interface InvariantRunSummary {
  run_id: string;
  ran_at: string;
  money: number;
  identity: number;
  operational: number;
  authority?: number;
  compliance?: number;
  total: number;
  newly_inserted?: number;
  auto_resolved?: number;
  touched?: number;
}

export interface InvariantViolation {
  id: string;
  detected_at: string;
  last_seen_at: string | null;
  invariant: string;
  entity_type: string | null;
  entity_id: string | null;
  detail: Record<string, unknown>;
  resolved_at: string | null;
  resolution_note: string | null;
}

export interface InvariantReport {
  summary: InvariantRunSummary | null;
  violations: InvariantViolation[];
  grouped: Array<{
    invariant: string;
    count: number;
    examples: InvariantViolation[];
  }>;
}

/** Human-readable label for an invariant code. */
export function invariantLabel(code: string): string {
  const map: Record<string, string> = {
    // Money chain
    "money.trip_without_fee":
      "Trip recorded but no rank fee collected",
    "money.fee_without_trip":
      "Rank fee collected but no matching trip",
    "money.fee_without_settlement":
      "Rank fee recorded but no settlement row",
    "money.settlement_without_fee":
      "Settlement row with no matching rank fee",
    "money.intent_credit_count_mismatch":
      "Payment intent with wrong number of credits",
    "money.intent_credit_amount_mismatch":
      "Credit amount does not match payment intent",
    "money.credit_failed_on_completed":
      "Intent marked completed but card credit failed",
    "money.intent_stale_pending":
      "Payment intent stuck pending/processing > 6h",
    "money.reversal_double":
      "A reversal row that is itself reversed",
    "money.trip_unassigned_driver":
      "Trip recorded with no driver",

    // Identity chain
    "identity.claimed_marshal_without_auth":
      "Marshal claimed or active but auth link missing",
    "identity.claimed_driver_without_auth":
      "Driver claimed but auth link missing",
    "identity.claimed_operator_without_auth":
      "Operator claimed but auth link missing",
    "identity.staff_without_auth":
      "Staff member has no login",
    "identity.auth_user_multi_role":
      "Login is claimed by more than one role",
    "identity.auth_user_orphan":
      "Login is claimed by no role",
    "identity.auth_user_app_metadata_missing":
      "Login is missing app_metadata.role",
    "identity.auth_user_metadata_role_mismatch":
      "Login's app_metadata.role disagrees with its role table",
    "identity.username_orphan":
      "Username points at a deleted auth user",

    // Operational integrity
    "ops.queue_position_collision":
      "Two vehicles share a queue position on the same route",
    "ops.multiple_active_marshals_on_route":
      "More than one active marshal on the same route",
    "ops.driver_vehicle_mismatch":
      "Driver and vehicle disagree about who is driving",
    "ops.vehicle_without_operator":
      "Non-archived vehicle has no operator",
    "ops.vehicle_driver_dangling":
      "Vehicle's driver_id points at a driver that does not exist",
    "ops.permit_status_drift":
      "Vehicle permit_status disagrees with its active permit",
    "ops.expired_permit_in_service":
      "Expired or suspended permit still Loading/Departed/queued",
    "ops.expired_cof_in_service":
      "Certificate of fitness expired while vehicle in service",
    "ops.active_without_driver":
      "Vehicle Loading/Departed/Full with no driver assigned",
    "ops.queue_without_route":
      "Vehicle has a queue position but no route",
    "ops.open_renewal_while_active":
      "Open permit renewal while vehicle is mid-operation",

    // Compliance
    "compliance.driver_pdp_expired":
      "Assigned driver has an expired PDP",
    "compliance.driver_pdp_missing":
      "Assigned driver has no PDP number on file",

    // Authority lattice
    "authority.policy_gap":
      "RLS write policy is too permissive — no role, region, or ownership scope",
    "authority.rls_disabled":
      "Table has row-level security disabled",
  };
  return map[code] ?? code;
}

export function invariantSeverity(
  code: string
): "critical" | "high" | "medium" | "low" {
  if (
    code.startsWith("money.") ||
    code === "ops.expired_permit_in_service" ||
    code === "ops.active_without_driver" ||
    code === "compliance.driver_pdp_expired" ||
    code === "authority.rls_disabled"
  ) {
    return "critical";
  }
  if (
    code.startsWith("identity.auth_user") ||
    code === "ops.driver_vehicle_mismatch" ||
    code === "ops.expired_cof_in_service" ||
    code === "money.intent_stale_pending"
  ) {
    return "high";
  }
  if (code.startsWith("ops.") || code.startsWith("compliance.")) {
    return "medium";
  }
  return "low";
}
