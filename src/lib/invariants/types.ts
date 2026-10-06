/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Phase 0 — Types for the invariant observation layer.
 * Phase 2 — Added labels for the extended money-chain invariants.
 */

export interface InvariantRunSummary {
  run_id: string;
  ran_at: string;
  money: number;
  identity: number;
  operational: number;
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
    "money.reversal_double":
      "A reversal row that is itself reversed",
    "money.trip_unassigned_driver":
      "Trip recorded with no driver",

    // Identity chain
    "identity.claimed_marshal_without_auth":
      "Marshal claimed but auth link missing",
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

    // Operational integrity
    "ops.queue_position_collision":
      "Two vehicles share a queue position on the same route",
    "ops.multiple_active_marshals_on_route":
      "More than one active marshal on the same route",
    "ops.driver_vehicle_mismatch":
      "Driver and vehicle disagree about who is driving",
    "ops.vehicle_without_operator":
      "Vehicle has no operator",
  };
  return map[code] ?? code;
}
