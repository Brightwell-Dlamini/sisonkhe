/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Phase 0 — Types for the invariant observation layer.
 *
 * These describe what run_all_invariant_checks() returns and what a
 * violation row looks like when read back.
 */

export interface InvariantRunSummary {
  run_id: string;
  ran_at: string;
  money: number;
  identity: number;
  operational: number;
  total: number;
}

export interface InvariantViolation {
  id: string;
  detected_at: string;
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
  /** Grouped by invariant, most-recent run only. */
  grouped: Array<{
    invariant: string;
    count: number;
    examples: InvariantViolation[];
  }>;
}

/** Human-readable label for an invariant code. */
export function invariantLabel(code: string): string {
  const map: Record<string, string> = {
    "money.trip_without_fee":
      "Trip recorded but no rank fee collected",
    "money.fee_without_trip":
      "Rank fee collected but no matching trip",
    "money.intent_credit_count_mismatch":
      "Payment intent with wrong number of credits",

    "identity.active_marshal_without_auth":
      "Active marshal has no login",
    "identity.driver_without_auth":
      "Driver has no login",
    "identity.staff_without_auth":
      "Staff member has no login",
    "identity.operator_without_auth":
      "Operator has no login",
    "identity.auth_user_multi_role":
      "Login is claimed by more than one role",
    "identity.auth_user_orphan":
      "Login is claimed by no role",

    "ops.queue_position_collision":
      "Two vehicles share a queue position on the same route",
    "ops.multiple_active_marshals_on_route":
      "More than one active marshal on the same route",
    "ops.driver_vehicle_mismatch":
      "Driver and vehicle disagree about who is driving",
    "ops.vehicle_without_operator":
      "Vehicle has no operator",
    "ops.trip_unassigned_driver":
      "Trip was recorded with no driver",
  };
  return map[code] ?? code;
}
