/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Deprecated. Over-explanatory "Next steps" blocks were an AI-UI tell and
 * were removed from role shells / kiosk. Kept as a no-op so any stale import
 * does not break the build.
 */

import type { LucideIcon } from "lucide-react";

export interface GuidanceItem {
  label: string;
  detail: string;
  href?: string;
  icon: LucideIcon;
}

export function RoleGuidance(_props: {
  title: string;
  items: GuidanceItem[];
  className?: string;
}) {
  return null;
}
