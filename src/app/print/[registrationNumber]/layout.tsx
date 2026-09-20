/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Isolated layout for print views. No nav, no sidebar, no global CSS.
 */

export default function PermitLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
