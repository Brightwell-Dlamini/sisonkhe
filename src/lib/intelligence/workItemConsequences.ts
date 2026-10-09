/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Short consequence lines for ranked work items — what happens if left undone.
 * Pure; safe for UI and tests.
 */

import type { WorkItemKind } from "./types";

const CONSEQUENCES: Record<WorkItemKind, string> = {
  permit_expired:
    "Vehicle cannot legally load or depart until permit is renewed and printed.",
  permit_expiring:
    "If left until expiry, rank will block load; start renewal before the window closes.",
  cof_expired:
    "Roadworthiness gap — vehicle should not be dispatched until COF is current.",
  cof_expiring:
    "COF approaching expiry; schedule inspection to avoid a sudden rank hold.",
  pdp_expired:
    "Driver cannot legally operate; assignment should be cleared or PDP renewed.",
  pdp_expiring:
    "PDP nearing expiry; renew to keep the driver available for roster and dispatch.",
  renewal_pending:
    "Approval unblocks print queue; without print the rank still cannot load.",
  print_backlog:
    "Approved permits without paper/QR keep vehicles off load even after payment.",
  unassigned_driver:
    "Drivers without vehicles reduce roster flexibility and rank throughput.",
  unassigned_vehicle:
    "No driver means the vehicle cannot pass load gates at the rank.",
  suspended_driver:
    "Confirm suspension is intentional; linked vehicles may already be released.",
  frozen_master_card:
    "Operator cannot pay renewals or disburse via Master Card until unfrozen.",
  incomplete_registration:
    "Incomplete records block reliable compliance and audit reporting.",
  compliance_gap:
    "Unresolved compliance gaps accumulate operational and regulatory risk.",
};

export function consequenceForWorkItem(kind: WorkItemKind): string {
  return CONSEQUENCES[kind] ?? "Unresolved item may block operations or compliance.";
}
