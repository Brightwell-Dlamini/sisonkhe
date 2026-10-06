/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Canonical deep links from Command Centre → prefiltered registry screens.
 * Lists read these query params and apply filters on load.
 */

export const DeepLink = {
  permitsExpired: "/admin/permits?filter=expired",
  permitsExpiring: "/admin/permits?filter=expiring",
  permitsPending: "/admin/permits?filter=pending",
  permitsPrint: "/admin/permits/print",
  vehiclesUnassigned: "/admin/vehicles?filter=unassigned",
  vehiclesCofExpired: "/admin/vehicles?filter=cof_expired",
  vehiclesCofExpiring: "/admin/vehicles?filter=cof_expiring",
  driversSuspended: "/admin/drivers?filter=suspended",
  driversUnassigned: "/admin/drivers?filter=unassigned",
  driversPdpExpired: "/admin/drivers?filter=pdp_expired",
  operatorsFrozen: "/admin/operators?filter=frozen",
  vehicleDetail: (reg: string) =>
    `/admin/vehicles?q=${encodeURIComponent(reg)}`,
  driverDetail: (id: string) => `/admin/drivers?q=${encodeURIComponent(id)}`,
  renewalDetail: (id: string) =>
    `/admin/permits?renewal=${encodeURIComponent(id)}`,
} as const;

export type ListFilterParam =
  | "expired"
  | "expiring"
  | "pending"
  | "unassigned"
  | "cof_expired"
  | "cof_expiring"
  | "suspended"
  | "pdp_expired"
  | "frozen";
